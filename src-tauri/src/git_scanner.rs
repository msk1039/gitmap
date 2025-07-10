use crate::repo_types::{
    GitRepository, ScanProgress, NodeModulesInfo, RepositoriesDiscovered, AnalysisProgress
};
use crate::data_store::DataStore;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use git2::Repository;
use std::collections::HashMap;
use tauri::{Window, Emitter};
use chrono::{DateTime, Utc};
use std::fs;
use std::time::Instant;

pub struct GitScanner {
    pub repos: Vec<GitRepository>,
    pub data_store: DataStore,
}

impl GitScanner {
    pub fn new() -> Result<Self, String> {
        let data_store = DataStore::new()?;
        Ok(Self { 
            repos: Vec::new(),
            data_store,
        })
    }

    pub async fn discover_repositories(&self, window: &Window, paths: Vec<String>) -> Result<Vec<String>, String> {
        let start_time = Instant::now();
        let mut discovered_paths = Vec::new();
        let mut repos_found = 0;

        for path_str in paths {
            let root_path = Path::new(&path_str);
            if !root_path.exists() || !root_path.is_dir() {
                continue;
            }

            let walker = WalkDir::new(root_path).into_iter();
            for entry in walker.filter_entry(|e| !is_hidden(e) && !is_large_dir(e)) {
                if let Ok(entry) = entry {
                    if entry.file_type().is_dir() && entry.path().join(".git").exists() {
                        if let Some(path_str) = entry.path().to_str() {
                            discovered_paths.push(path_str.to_string());
                            repos_found += 1;

                            let _ = window.emit("scan-progress", ScanProgress {
                                current_path: path_str.to_string(),
                                repos_found,
                                completed: false,
                            });
                        }
                    }
                }
            }
        }

        let elapsed = start_time.elapsed().as_millis();
        let _ = window.emit("repositories-discovered", RepositoriesDiscovered {
            count: discovered_paths.len(),
            time_taken_ms: elapsed,
            repo_paths: discovered_paths.clone(),
        });

        Ok(discovered_paths)
    }

    pub async fn analyze_discovered_repositories(
        &mut self,
        window: &Window,
        repo_paths: Vec<String>,
    ) -> Result<Vec<GitRepository>, String> {
        let total = repo_paths.len();
        let mut analyzed_repos = Vec::new();
        let existing_cache = self.data_store.load_cache().unwrap_or_default();

        for (i, path_str) in repo_paths.iter().enumerate() {
            let _ = window.emit("analysis-progress", AnalysisProgress {
                total,
                current: i + 1,
                current_path: path_str.clone(),
            });

            let repo_path = Path::new(path_str);
            match self.analyze_repository(repo_path) {
                Ok(mut repo) => {
                    if let Some(existing_repo) = existing_cache.repositories.get(&repo.path) {
                        repo.is_pinned = existing_repo.is_pinned;
                        repo.pinned_at = existing_repo.pinned_at;
                    }
                    if let Err(e) = self.data_store.add_repository(repo.clone()) {
                        eprintln!("Failed to save repository {}: {}", repo.name, e);
                    }
                    analyzed_repos.push(repo);
                }
                Err(e) => {
                    eprintln!("Failed to analyze repository at {}: {}", path_str, e);
                }
            }
        }

        self.repos = analyzed_repos.clone();
        Ok(analyzed_repos)
    }

    pub async fn load_cached_repositories(&mut self) -> Result<Vec<GitRepository>, String> {
        let cache = self.data_store.load_cache()?;
        self.repos = cache.repositories.into_values().collect();
        Ok(self.repos.clone())
    }

    pub async fn scan_disk_with_cache(&mut self, window: &Window, force_rescan: bool) -> Result<Vec<GitRepository>, String> {
        if !force_rescan {
            // Try to load from cache first
            match self.load_cached_repositories().await {
                Ok(cached_repos) if !cached_repos.is_empty() => {
                    // Optional: Validate cached repositories if needed or return them directly
                    // For now, let's assume if cache is loaded, we can return it.
                    // This part of the logic might need further refinement based on exact requirements
                    // (e.g., validating if paths still exist).
                    // self.repos = cached_repositories.clone(); // self.load_cached_repositories already updates self.repos
                    return Ok(self.repos.clone());
                }
                Ok(_) => { /* Cache was empty or load_cached_repositories returned empty */ }
                Err(e) => {
                    eprintln!("Failed to load cached repositories, proceeding with full scan: {}", e);
                    // Fall through to full scan
                }
            }
        }

        // Load existing cache to preserve pin states
        let existing_cache = self.data_store.load_cache().unwrap_or_default();

        // Perform full scan
        let new_repositories = self.scan_disk(window).await?;
        
        // Merge new repositories with existing ones, preserving pin states
        for mut new_repo in new_repositories {
            if let Some(existing_repo) = existing_cache.repositories.get(&new_repo.path) {
                // Preserve pin state from existing repository
                new_repo.is_pinned = existing_repo.is_pinned;
                new_repo.pinned_at = existing_repo.pinned_at;
            }
            
            // Save to cache
            self.data_store.add_repository(new_repo)?;
        }
        
        // Return all repositories (reload from cache to get complete list)
        self.load_cached_repositories().await
    }

    // async fn validate_cached_repositories(&self, cached_repos: Vec<GitRepository>) -> Vec<GitRepository> {
    //     let mut valid_repos = Vec::new();
        
    //     for repo in cached_repos {
    //         if Path::new(&repo.path).exists() {
    //             valid_repos.push(repo);
    //         }
    //     }
        
    //     valid_repos
    // }

    pub async fn scan_disk(&mut self, window: &Window) -> Result<Vec<GitRepository>, String> {
        self.repos.clear();
        let mut repos_found = 0;

        // Start scanning from the user's home directory and common locations
        let scan_paths = vec![
            dirs::home_dir().unwrap_or_else(|| PathBuf::from("/")),
            PathBuf::from("/Users"),
            PathBuf::from("/opt"),
            PathBuf::from("/usr/local"),
        ];

        for root_path in scan_paths {
            if !root_path.exists() {
                continue;
            }

            self.scan_directory(&root_path, window, &mut repos_found).await?;
        }

        // Send final progress update
        let _ = window.emit("scan-progress", ScanProgress {
            current_path: "Scan completed".to_string(),
            repos_found,
            completed: true,
        });

        Ok(self.repos.clone())
    }

    pub async fn scan_custom_paths(&mut self, window: &Window, custom_paths: Vec<String>) -> Result<Vec<GitRepository>, String> {
        // Load existing cache to preserve pin states
        let existing_cache = self.data_store.load_cache().unwrap_or_default();
        
        self.repos.clear();
        let mut repos_found = 0;

        for path_str in custom_paths {
            let root_path = Path::new(&path_str);
            
            // Update scan path timestamp before scanning
            if let Err(e) = self.data_store.update_scan_path_last_scanned(&path_str) {
                eprintln!("Failed to update scan path timestamp: {}", e);
            }
            
            if root_path.exists() && root_path.is_dir() {
                self.scan_directory(root_path, window, &mut repos_found).await?;
            }
        }

        // Send final progress update
        let _ = window.emit("scan-progress", ScanProgress {
            current_path: "Complete".to_string(),
            repos_found,
            completed: true,
        });

        // Merge new repositories with existing ones, preserving pin states
        for new_repo in &mut self.repos {
            if let Some(existing_repo) = existing_cache.repositories.get(&new_repo.path) {
                // Preserve pin state from existing repository
                new_repo.is_pinned = existing_repo.is_pinned;
                new_repo.pinned_at = existing_repo.pinned_at;
            }
        }

        // Save all found repositories to cache
        for repo in &self.repos {
            if let Err(e) = self.data_store.add_repository(repo.clone()) {
                eprintln!("Failed to cache repository {}: {}", repo.path, e);
            }
        }

        // Return all repositories (reload from cache to get complete list)
        self.load_cached_repositories().await
    }
    
    pub fn add_scan_path(&self, path: String) -> Result<(), String> {
        self.data_store.add_scan_path(path)
    }
    
    pub fn remove_scan_path(&self, path: &str) -> Result<(), String> {
        self.data_store.remove_scan_path(path)
    }
    
    pub fn get_scan_paths(&self) -> Result<Vec<crate::repo_types::ScanPath>, String> {
        let cache = self.data_store.load_cache()?;
        Ok(cache.scan_paths.into_values().collect())
    }

    async fn scan_directory(&mut self, root_path: &Path, window: &Window, repos_found: &mut u32) -> Result<(), String> {
        let walker = WalkDir::new(root_path)
            .into_iter();

        for entry in walker.filter_entry(|e| !is_hidden(e) && !is_large_dir(e)) {
            if let Ok(entry) = entry {
                if entry.file_type().is_dir() && entry.path().join(".git").exists() {
                    match self.analyze_repository(entry.path()) {
                        Ok(repo) => {
                            *repos_found += 1;
                            let _ = window.emit("scan-progress", ScanProgress {
                                current_path: repo.path.clone(),
                                repos_found: *repos_found,
                                completed: false,
                            });
                            self.repos.push(repo);
                        }
                        Err(e) => {
                            eprintln!("Failed to analyze repository at {:?}: {}", entry.path(), e);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub fn analyze_repository(&self, repo_path: &Path) -> Result<GitRepository, String> {
        self.analyze_repository_with_cache(repo_path, None)
    }

    pub fn analyze_repository_with_cache(&self, repo_path: &Path, existing_repo: Option<&GitRepository>) -> Result<GitRepository, String> {
        let repo = match Repository::open(repo_path) {
            Ok(repo) => repo,
            Err(e) => return Err(format!("Failed to open repository at {:?}: {}", repo_path, e)),
        };

        // Get repository name from the directory name
        let name = repo_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        // Calculate directory size
        let size_mb = self.get_directory_size(repo_path)?;

        // Get file types
        let file_types = self.get_file_types(repo_path);

        // Get git information
        let (current_branch, branches, remote_url, commit_count, last_commit_date) = 
            self.get_git_info(&repo)?;

        // Check if we should scan node_modules
        let node_modules_info = if self.should_scan_node_modules(repo_path, existing_repo)? {
            self.scan_node_modules(repo_path)?
        } else {
            // Preserve existing node_modules info if we don't need to rescan
            existing_repo.and_then(|repo| repo.node_modules_info.clone())
        };

        Ok(GitRepository {
            name,
            path: repo_path.to_string_lossy().to_string(),
            size_mb,
            file_types,
            last_commit_date,
            current_branch,
            branches,
            remote_url,
            commit_count,
            last_analyzed: Utc::now(),
            is_valid: true,
            is_pinned: false, // Default to unpinned for new repositories
            pinned_at: None,
            node_modules_info,
        })
    }

    pub fn refresh_repository(&mut self, repo_path: &str) -> Result<GitRepository, String> {
        // Get existing repository to preserve pin state
        let cache = self.data_store.load_cache()?;
        let existing_repo = cache.repositories.get(repo_path);
        
        // Force node_modules re-scan by passing None as existing repo for node_modules scanning
        let mut updated_repo = self.analyze_repository_with_cache_force_node_modules(Path::new(repo_path), existing_repo)?;
        
        // Preserve pin state from existing repository
        if let Some(existing) = existing_repo {
            updated_repo.is_pinned = existing.is_pinned;
            updated_repo.pinned_at = existing.pinned_at;
        }
        
        // Update in cache
        self.data_store.add_repository(updated_repo.clone())?;
        
        // Update in memory
        if let Some(index) = self.repos.iter().position(|r| r.path == repo_path) {
            self.repos[index] = updated_repo.clone();
        }
        
        Ok(updated_repo)
    }

    pub fn refresh_cache(&mut self) -> Result<Vec<GitRepository>, String> {
        let mut cache = self.data_store.load_cache()?;
        let mut updated_repos = Vec::new();
        let mut repos_to_remove = Vec::new();
        let mut repos_to_update = Vec::new();
        
        // First pass: determine which repos to update or remove
        for (path, repo) in &cache.repositories {
            let repo_path = std::path::Path::new(path);
            
            // Check if the repository still exists
            if repo_path.exists() && repo_path.join(".git").exists() {
                // Repository exists, refresh its data
                match self.analyze_repository_with_cache(repo_path, Some(repo)) {
                    Ok(mut updated_repo) => {
                        // Preserve pin state from existing repository
                        updated_repo.is_pinned = repo.is_pinned;
                        updated_repo.pinned_at = repo.pinned_at;
                        
                        updated_repos.push(updated_repo.clone());
                        repos_to_update.push((path.clone(), updated_repo));
                    }
                    Err(e) => {
                        eprintln!("Failed to analyze repository {}: {}", path, e);
                        // Keep the old data if analysis fails
                        updated_repos.push(repo.clone());
                    }
                }
            } else {
                // Repository no longer exists, mark for removal
                repos_to_remove.push(path.clone());
            }
        }
        
        // Second pass: apply the updates
        for (path, updated_repo) in repos_to_update {
            cache.repositories.insert(path, updated_repo);
        }
        
        // Remove invalid repositories from cache
        for path in &repos_to_remove {
            cache.repositories.remove(path);
        }
        
        // Update cache metadata
        cache.last_updated = chrono::Utc::now();
        
        // Save updated cache
        self.data_store.save_cache(&cache)?;
        
        // Update in-memory repos
        self.repos = updated_repos.clone();
        
        Ok(updated_repos)
    }

    pub fn get_cache_info(&self) -> Result<crate::data_store::CacheInfo, String> {
        self.data_store.get_cache_info()
    }

    pub fn clear_cache(&self) -> Result<(), String> {
        self.data_store.clear_cache()
    }

    pub fn cleanup_invalid_repositories(&self) -> Result<usize, String> {
        self.data_store.cleanup_invalid_repositories()
    }

    pub fn remove_repository_from_cache(&self, repo_path: &str) -> Result<(), String> {
        let mut cache = self.data_store.load_cache()?;
        cache.repositories.remove(repo_path);
        cache.last_updated = Utc::now();
        self.data_store.save_cache(&cache)
    }

    fn get_directory_size(&self, path: &Path) -> Result<f64, String> {
        let mut total_size = 0u64;

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    if let Ok(metadata) = entry.metadata() {
                        total_size += metadata.len();
                    }
                } else if entry_path.is_dir() && entry_path.file_name() != Some(std::ffi::OsStr::new(".git")) {
                    // Recursively calculate size, but skip .git directory to avoid double counting
                    if let Ok(size) = self.get_directory_size(&entry_path) {
                        total_size += (size * 1024.0 * 1024.0) as u64;
                    }
                }
            }
        }

        Ok(total_size as f64 / (1024.0 * 1024.0)) // Convert to MB
    }

    fn get_file_types(&self, path: &Path) -> HashMap<String, u32> {
        let mut file_types = HashMap::new();

        if let Ok(entries) = WalkDir::new(path)
            .max_depth(3) // Limit depth for performance
            .into_iter()
            .filter_entry(|e| {
                // Skip .git and other hidden directories
                !e.path().file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.starts_with('.'))
                    .unwrap_or(false)
            })
            .collect::<Result<Vec<_>, _>>()
        {
            for entry in entries {
                if entry.path().is_file() {
                    if let Some(extension) = entry.path().extension().and_then(|e| e.to_str()) {
                        *file_types.entry(extension.to_lowercase()).or_insert(0) += 1;
                    }
                }
            }
        }

        file_types
    }

    fn get_git_info(&self, repo: &Repository) -> Result<(Option<String>, Vec<String>, Option<String>, u32, Option<DateTime<Utc>>), String> {
        // Get current branch
        let current_branch = repo.head()
            .ok()
            .and_then(|head| head.shorthand().map(|s| s.to_string()));

        // Get all branches
        let mut branches = Vec::new();
        if let Ok(branch_iter) = repo.branches(None) {
            for branch in branch_iter {
                if let Ok((branch, _)) = branch {
                    if let Some(name) = branch.name().ok().flatten() {
                        branches.push(name.to_string());
                    }
                }
            }
        }

        // Get remote URL
        let remote_url = repo.find_remote("origin")
            .ok()
            .and_then(|remote| remote.url().map(|s| s.to_string()));

        // Get commit count and last commit date
        let mut commit_count = 0u32;
        let mut last_commit_date = None;

        if let Ok(mut revwalk) = repo.revwalk() {
            if revwalk.push_head().is_ok() {
                for commit_id in revwalk.take(1000) { // Limit to first 1000 commits for performance
                    if let Ok(commit_oid) = commit_id {
                        commit_count += 1;
                        
                        // Get the most recent commit date
                        if last_commit_date.is_none() {
                            if let Ok(commit) = repo.find_commit(commit_oid) {
                                let time = commit.time();
                                last_commit_date = Some(DateTime::from_timestamp(time.seconds(), 0)
                                    .unwrap_or_else(|| Utc::now()));
                            }
                        }
                    }
                }
            }
        }

        Ok((current_branch, branches, remote_url, commit_count, last_commit_date))
    }

    fn should_scan_node_modules(&self, repo_path: &Path, existing_repo: Option<&GitRepository>) -> Result<bool, String> {
        let package_json_path = repo_path.join("package.json");
        
        // If no package.json exists, no need to scan node_modules
        if !package_json_path.exists() {
            return Ok(false);
        }
        
        // Get package.json modification time
        let package_json_metadata = fs::metadata(&package_json_path)
            .map_err(|e| format!("Failed to read package.json metadata: {}", e))?;
        let package_json_modified = package_json_metadata.modified()
            .map_err(|e| format!("Failed to get package.json modification time: {}", e))?;
        let package_json_modified_utc = DateTime::<Utc>::from(package_json_modified);
        
        // If this is a new repository or we don't have node_modules info, scan it
        if let Some(existing) = existing_repo {
            if let Some(node_modules_info) = &existing.node_modules_info {
                // Check if package.json was modified after our last scan
                return Ok(package_json_modified_utc > node_modules_info.package_json_modified);
            }
        }
        
        // First time scanning or no existing node_modules info
        Ok(true)
    }

    fn scan_node_modules(&self, repo_path: &Path) -> Result<Option<NodeModulesInfo>, String> {
        let package_json_path = repo_path.join("package.json");
        
        // If no package.json exists, return None
        if !package_json_path.exists() {
            return Ok(None);
        }
        
        // Get package.json modification time
        let package_json_metadata = fs::metadata(&package_json_path)
            .map_err(|e| format!("Failed to read package.json metadata: {}", e))?;
        let package_json_modified = package_json_metadata.modified()
            .map_err(|e| format!("Failed to get package.json modification time: {}", e))?;
        let package_json_modified_utc = DateTime::<Utc>::from(package_json_modified);
        
        let mut node_modules_paths = Vec::new();
        let mut total_size_mb = 0.0;
        let mut count = 0;
        
        // Look for node_modules directories in the repository
        let walker = WalkDir::new(repo_path)
            .max_depth(3) // Don't go too deep to avoid nested node_modules
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|entry| {
                entry.file_type().is_dir() && 
                entry.file_name() == "node_modules"
            });
        
        for entry in walker {
            let node_modules_path = entry.path();
            
            // Calculate size of this node_modules directory
            match self.get_directory_size(node_modules_path) {
                Ok(size_mb) => {
                    total_size_mb += size_mb;
                    count += 1;
                    node_modules_paths.push(node_modules_path.to_string_lossy().to_string());
                }
                Err(e) => {
                    // Log error but continue with other node_modules directories
                    eprintln!("Failed to calculate size for {}: {}", node_modules_path.display(), e);
                }
            }
        }
        
        if count > 0 {
            Ok(Some(NodeModulesInfo {
                total_size_mb,
                count,
                paths: node_modules_paths,
                last_scanned: Utc::now(),
                package_json_modified: package_json_modified_utc,
            }))
        } else {
            Ok(None)
        }
    }
    
    pub fn analyze_repository_with_cache_force_node_modules(&self, repo_path: &Path, existing_repo: Option<&GitRepository>) -> Result<GitRepository, String> {
        let repo = Repository::open(repo_path)
            .map_err(|e| format!("Failed to open git repository: {}", e))?;

        // Get repository name from the directory name
        let name = repo_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        // Calculate directory size
        let size_mb = self.get_directory_size(repo_path)?;

        // Get file types
        let file_types = self.get_file_types(repo_path);

        // Get git information
        let (current_branch, branches, remote_url, commit_count, last_commit_date) = 
            self.get_git_info(&repo)?;

        // Force node_modules scan (ignore existing cache)
        let node_modules_info = self.scan_node_modules(repo_path)?;

        Ok(GitRepository {
            name,
            path: repo_path.to_string_lossy().to_string(),
            size_mb,
            file_types,
            last_commit_date,
            current_branch,
            branches,
            remote_url,
            commit_count,
            last_analyzed: Utc::now(),
            is_valid: true,
            is_pinned: false, // Default to unpinned for new repositories
            pinned_at: None,
            node_modules_info,
        })
    }
}

fn is_hidden(entry: &walkdir::DirEntry) -> bool {
    entry.file_name()
         .to_str()
         .map(|s| s.starts_with('.') || s == "node_modules" || s == "vendor" || s == "target")
         .unwrap_or(false)
}

fn is_large_dir(entry: &walkdir::DirEntry) -> bool {
    if let Some(file_name) = entry.file_name().to_str() {
        return matches!(file_name, "node_modules" | "target" | "vendor" | ".git" | ".svn" | "dist" | "build");
    }
    false
}
