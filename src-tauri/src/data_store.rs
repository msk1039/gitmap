use crate::repo_types::{GitRepository, ScanPath};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepositoryCache {
    pub repositories: HashMap<String, GitRepository>,
    pub scan_paths: HashMap<String, ScanPath>,
    pub last_updated: DateTime<Utc>,
    pub cache_version: String,
}

impl Default for RepositoryCache {
    fn default() -> Self {
        Self {
            repositories: HashMap::new(),
            scan_paths: HashMap::new(),
            last_updated: Utc::now(),
            cache_version: "1.1".to_string(),
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
        
        let cache: RepositoryCache = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse cache file: {}", e))?;
        
        Ok(cache)
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
}
