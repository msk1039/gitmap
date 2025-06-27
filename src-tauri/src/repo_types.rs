use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeModulesInfo {
    pub total_size_mb: f64,
    pub count: u32,
    pub paths: Vec<String>,
    pub last_scanned: DateTime<Utc>,
    pub package_json_modified: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitRepository {
    pub name: String,
    pub path: String,
    pub size_mb: f64,
    pub file_types: HashMap<String, u32>, // extension -> count
    pub last_commit_date: Option<DateTime<Utc>>,
    pub current_branch: Option<String>,
    pub branches: Vec<String>,
    pub remote_url: Option<String>,
    pub commit_count: u32,
    // Persistence metadata
    pub last_analyzed: DateTime<Utc>,
    pub is_valid: bool, // Whether the repository still exists and is accessible
    pub is_pinned: bool, // Whether the repository is pinned
    pub pinned_at: Option<DateTime<Utc>>, // When it was pinned
    pub node_modules_info: Option<NodeModulesInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    pub current_path: String,
    pub repos_found: u32,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>, // Size in bytes, None for directories
    pub modified: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanPath {
    pub path: String,
    pub last_scanned: Option<DateTime<Utc>>,
    pub repository_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub color: String, // Theme color for the collection (hex color code)
    pub repository_paths: Vec<String>, // Paths of repositories in this collection
    pub created_at: DateTime<Utc>,
}
