use crate::repo_types::{GitRepository, ScanPath, Collection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepositoryCache {
    pub repositories: HashMap<String, GitRepository>,
    pub scan_paths: HashMap<String, ScanPath>,
    pub collections: HashMap<String, Collection>,
    pub last_updated: DateTime<Utc>,
    pub cache_version: String,
}

impl Default for RepositoryCache {
    fn default() -> Self {
        Self {
            repositories: HashMap::new(),
            scan_paths: HashMap::new(),
            collections: HashMap::new(),
            last_updated: Utc::now(),
            cache_version: "1.4".to_string(), // Updated version for collections feature
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheInfo {
    pub total_repositories: usize,
    pub last_updated: DateTime<Utc>,
    pub cache_file_size: u64,
    pub valid_repositories: usize,
    pub invalid_repositories: usize,
}

pub struct DataStore {
    cache_file_path: PathBuf,
}

impl DataStore {
    pub fn new() -> Result<Self, String> {
        let app_data_dir = dirs::data_dir()
            .ok_or("Could not find app data directory")?
            .join("github-repo-manager");
        
        // Create the directory if it doesn't exist
        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        }
        
        let cache_file_path = app_data_dir.join("repositories_cache.json");
        
        Ok(Self { cache_file_path })
    }
    
    pub fn load_cache(&self) -> Result<RepositoryCache, String> {
        if !self.cache_file_path.exists() {
            return Ok(RepositoryCache::default());
        }
        
        let content = fs::read_to_string(&self.cache_file_path)
            .map_err(|e| format!("Failed to read cache file: {}", e))?;
        
        // Try to parse as the new format first
        match serde_json::from_str::<RepositoryCache>(&content) {
            Ok(mut cache) => {
                // Check if any collections are missing colors (for migration)
                let mut needs_update = false;
                for collection in cache.collections.values_mut() {
                    if collection.color.is_empty() {
                        collection.color = "#e5e7eb".to_string(); // Default light gray color
                        needs_update = true;
                    }
                }
                
                if needs_update {
                    cache.last_updated = Utc::now();
                    self.save_cache(&cache)?;
                }
                
                Ok(cache)
            },
            Err(_) => {
                // If parsing fails, try to migrate from old format
                self.migrate_cache_format(&content)
            }
        }
    }
    
    fn migrate_cache_format(&self, content: &str) -> Result<RepositoryCache, String> {
        // Define old cache format for migration
        #[derive(Deserialize)]
        struct OldRepositoryCache {
            repositories: HashMap<String, OldGitRepository>,
            scan_paths: HashMap<String, ScanPath>,
            last_updated: DateTime<Utc>,
            cache_version: String,
        }
        
        #[derive(Deserialize)]
        struct OldGitRepository {
            name: String,
            path: String,
            size_mb: f64,
            file_types: HashMap<String, u32>,
            last_commit_date: Option<DateTime<Utc>>,
            current_branch: Option<String>,
            branches: Vec<String>,
            remote_url: Option<String>,
            commit_count: u32,
            last_analyzed: DateTime<Utc>,
            is_valid: bool,
        }
        
        // Try to parse as old format
        let old_cache: OldRepositoryCache = serde_json::from_str(content)
            .map_err(|e| format!("Failed to parse cache file (old format): {}", e))?;
        
        // Migrate to new format
        let mut new_repositories = HashMap::new();
        for (path, old_repo) in old_cache.repositories {
            let new_repo = GitRepository {
                name: old_repo.name,
                path: old_repo.path,
                size_mb: old_repo.size_mb,
                file_types: old_repo.file_types,
                last_commit_date: old_repo.last_commit_date,
                current_branch: old_repo.current_branch,
                branches: old_repo.branches,
                remote_url: old_repo.remote_url,
                commit_count: old_repo.commit_count,
                last_analyzed: old_repo.last_analyzed,
                is_valid: old_repo.is_valid,
                is_pinned: false, // Default to unpinned
                pinned_at: None,
                node_modules_info: None, // Default to no node_modules info for migrated repos
            };
            new_repositories.insert(path, new_repo);
        }
        
        let migrated_cache = RepositoryCache {
            repositories: new_repositories,
            scan_paths: old_cache.scan_paths,
            collections: HashMap::new(), // Initialize empty collections
            last_updated: old_cache.last_updated,
            cache_version: "1.4".to_string(), // Update to new version with collections
        };
        
        // Save the migrated cache
        self.save_cache(&migrated_cache)?;
        
        Ok(migrated_cache)
    }
    
    pub fn save_cache(&self, cache: &RepositoryCache) -> Result<(), String> {
        let content = serde_json::to_string_pretty(cache)
            .map_err(|e| format!("Failed to serialize cache: {}", e))?;
        
        fs::write(&self.cache_file_path, content)
            .map_err(|e| format!("Failed to write cache file: {}", e))?;
        
        Ok(())
    }
    
    pub fn add_repository(&self, repo: GitRepository) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        cache.repositories.insert(repo.path.clone(), repo);
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    

    //      already handled in functions with simple for loop. 
    //
    // pub fn remove_repository(&self, repo_path: &str) -> Result<(), String> {
    //     let mut cache = self.load_cache()?;
    //     cache.repositories.remove(repo_path);
    //     cache.last_updated = Utc::now();
    //     self.save_cache(&cache)
    // }
    
    // pub fn update_repository(&self, repo: GitRepository) -> Result<(), String> {
    //     self.add_repository(repo)
    // }
    
    pub fn clear_cache(&self) -> Result<(), String> {
        let cache = RepositoryCache::default();
        self.save_cache(&cache)
    }
    
    pub fn validate_repositories(&self) -> Result<(Vec<GitRepository>, Vec<String>), String> {
        let cache = self.load_cache()?;
        let mut valid_repos = Vec::new();
        let mut invalid_paths = Vec::new();
        
        for (path, mut repo) in cache.repositories {
            if std::path::Path::new(&path).join(".git").exists() {
                repo.is_valid = true;
                valid_repos.push(repo);
            } else {
                invalid_paths.push(path);
            }
        }
        
        Ok((valid_repos, invalid_paths))
    }
    
    pub fn get_cache_info(&self) -> Result<CacheInfo, String> {
        let cache = self.load_cache()?;
        let (valid_repos, invalid_repos) = self.validate_repositories()?;
        
        let cache_file_size = if self.cache_file_path.exists() {
            fs::metadata(&self.cache_file_path)
                .map(|m| m.len())
                .unwrap_or(0)
        } else {
            0
        };
        
        Ok(CacheInfo {
            total_repositories: cache.repositories.len(),
            last_updated: cache.last_updated,
            cache_file_size,
            valid_repositories: valid_repos.len(),
            invalid_repositories: invalid_repos.len(),
        })
    }
    
    pub fn cleanup_invalid_repositories(&self) -> Result<usize, String> {
        let (valid_repos, invalid_paths) = self.validate_repositories()?;
        let removed_count = invalid_paths.len();
        
        if removed_count > 0 {
            let mut cache = RepositoryCache::default();
            for repo in valid_repos {
                cache.repositories.insert(repo.path.clone(), repo);
            }
            cache.last_updated = Utc::now();
            self.save_cache(&cache)?;
        }
        
        Ok(removed_count)
    }
    
    pub fn add_scan_path(&self, path: String) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        
        // Count repositories in this path
        let repository_count = cache.repositories
            .values()
            .filter(|repo| repo.path.starts_with(&path))
            .count();
        
        let scan_path = ScanPath {
            path: path.clone(),
            last_scanned: Some(Utc::now()),
            repository_count,
        };
        
        cache.scan_paths.insert(path, scan_path);
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    
    pub fn remove_scan_path(&self, path: &str) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        cache.scan_paths.remove(path);
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    
    pub fn update_scan_path_last_scanned(&self, path: &str) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        
        if let Some(scan_path) = cache.scan_paths.get_mut(path) {
            scan_path.last_scanned = Some(Utc::now());
            
            // Update repository count
            scan_path.repository_count = cache.repositories
                .values()
                .filter(|repo| repo.path.starts_with(path))
                .count();
        }
        
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    
    pub fn get_scan_paths(&self) -> Result<Vec<ScanPath>, String> {
        let cache = self.load_cache()?;
        Ok(cache.scan_paths.values().cloned().collect())
    }
    
    // Pin-related methods
    pub fn toggle_repository_pin(&self, repo_path: &str) -> Result<GitRepository, String> {
        let mut cache = self.load_cache()?;
        
        if let Some(repo) = cache.repositories.get_mut(repo_path) {
            repo.is_pinned = !repo.is_pinned;
            
            if repo.is_pinned {
                repo.pinned_at = Some(Utc::now());
            } else {
                repo.pinned_at = None;
            }
            
            let updated_repo = repo.clone(); // Clone before saving
            cache.last_updated = Utc::now();
            self.save_cache(&cache)?;
            Ok(updated_repo)
        } else {
            Err(format!("Repository not found: {}", repo_path))
        }
    }
    
    pub fn get_pinned_repositories(&self) -> Result<Vec<GitRepository>, String> {
        let cache = self.load_cache()?;
        let pinned_repos: Vec<GitRepository> = cache.repositories
            .values()
            .filter(|repo| repo.is_pinned)
            .cloned()
            .collect();
        
        Ok(pinned_repos)
    }
    
    // Collection-related methods
    pub fn create_collection(&self, name: String, color: String) -> Result<Collection, String> {
        let mut cache = self.load_cache()?;
        
        // Check if collection name already exists
        if cache.collections.values().any(|c| c.name == name) {
            return Err(format!("Collection with name '{}' already exists", name));
        }
        
        let collection_id = uuid::Uuid::new_v4().to_string();
        let collection = Collection {
            id: collection_id.clone(),
            name,
            color,
            repository_paths: Vec::new(),
            created_at: Utc::now(),
        };
        
        cache.collections.insert(collection_id, collection.clone());
        cache.last_updated = Utc::now();
        self.save_cache(&cache)?;
        
        Ok(collection)
    }
    
    pub fn get_collections(&self) -> Result<Vec<Collection>, String> {
        let cache = self.load_cache()?;
        Ok(cache.collections.values().cloned().collect())
    }
    
    pub fn add_repository_to_collection(&self, collection_id: &str, repo_path: &str) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        
        // Check if repository exists
        if !cache.repositories.contains_key(repo_path) {
            return Err(format!("Repository not found: {}", repo_path));
        }
        
        if let Some(collection) = cache.collections.get_mut(collection_id) {
            if !collection.repository_paths.contains(&repo_path.to_string()) {
                collection.repository_paths.push(repo_path.to_string());
            }
        } else {
            return Err(format!("Collection not found: {}", collection_id));
        }
        
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    
    pub fn remove_repository_from_collection(&self, collection_id: &str, repo_path: &str) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        
        if let Some(collection) = cache.collections.get_mut(collection_id) {
            collection.repository_paths.retain(|path| path != repo_path);
        } else {
            return Err(format!("Collection not found: {}", collection_id));
        }
        
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    
    pub fn delete_collection(&self, collection_id: &str) -> Result<(), String> {
        let mut cache = self.load_cache()?;
        
        if cache.collections.remove(collection_id).is_none() {
            return Err(format!("Collection not found: {}", collection_id));
        }
        
        cache.last_updated = Utc::now();
        self.save_cache(&cache)
    }
    
    pub fn get_repositories_in_collection(&self, collection_id: &str) -> Result<Vec<GitRepository>, String> {
        let cache = self.load_cache()?;
        
        if let Some(collection) = cache.collections.get(collection_id) {
            let repos: Vec<GitRepository> = collection.repository_paths
                .iter()
                .filter_map(|path| cache.repositories.get(path))
                .cloned()
                .collect();
            Ok(repos)
        } else {
            Err(format!("Collection not found: {}", collection_id))
        }
    }
    
    pub fn get_cache_file_path(&self) -> PathBuf {
        self.cache_file_path.clone()
    }
    
    pub fn get_cache_file_path_string(&self) -> String {
        self.cache_file_path.to_string_lossy().to_string()
    }
}
