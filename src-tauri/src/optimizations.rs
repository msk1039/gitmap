use crate::repo_types::GitRepository;
use std::collections::HashMap;
use lru::LruCache;
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone)]
pub struct TrieNode {
    children: HashMap<String, TrieNode>,
    repositories: Vec<String>, // Repository paths that end at this node
    is_scan_path: bool,
}

impl TrieNode {
    pub fn new() -> Self {
        Self {
            children: HashMap::new(),
            repositories: Vec::new(),
            is_scan_path: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PathTrie {
    root: TrieNode,
}

impl PathTrie {
    pub fn new() -> Self {
        Self {
            root: TrieNode::new(),
        }
    }
    
    // O(m) insertion where m is path depth
    pub fn insert_repository(&mut self, path: &str) {
        let components: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        let mut current = &mut self.root;
        
        for component in components {
            current = current.children
                .entry(component.to_string())
                .or_insert_with(TrieNode::new);
        }
        
        current.repositories.push(path.to_string());
    }
    
    // O(m) prefix search - find all repos under a path
    pub fn find_repositories_under_path(&self, prefix: &str) -> Vec<String> {
        let components: Vec<&str> = prefix.split('/').filter(|s| !s.is_empty()).collect();
        let mut current = &self.root;
        
        // Navigate to the prefix node
        for component in components {
            if let Some(node) = current.children.get(component) {
                current = node;
            } else {
                return Vec::new(); // Prefix not found
            }
        }
        
        // Collect all repositories in this subtree
        let mut result = Vec::new();
        self.collect_repositories(current, &mut result);
        result
    }
    
    fn collect_repositories(&self, node: &TrieNode, result: &mut Vec<String>) {
        result.extend(node.repositories.iter().cloned());
        
        for child in node.children.values() {
            self.collect_repositories(child, result);
        }
    }
    
    // Clear all repositories and rebuild
    pub fn clear(&mut self) {
        self.root = TrieNode::new();
    }
    
    // Remove a specific repository
    pub fn remove_repository(&mut self, path: &str) {
        let components: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        let mut current = &mut self.root;
        
        // Navigate to the target node
        for component in components {
            if let Some(node) = current.children.get_mut(component) {
                current = node;
            } else {
                return; // Path not found
            }
        }
        
        // Remove the specific repository
        current.repositories.retain(|repo_path| repo_path != path);
    }
}

// Thread-safe LRU cache for repositories
pub type RepositoryCache = Arc<Mutex<LruCache<String, GitRepository>>>;

pub fn create_repository_cache(capacity: usize) -> RepositoryCache {
    Arc::new(Mutex::new(LruCache::new(
        NonZeroUsize::new(capacity).unwrap_or(NonZeroUsize::new(1000).unwrap())
    )))
}

// Repository index for fast searches
#[derive(Debug)]
pub struct RepositoryIndex {
    pub by_name: HashMap<String, String>, // name -> path
    pub by_size_range: HashMap<u32, Vec<String>>, // size_mb_rounded -> repo_paths
    pub by_commit_count_range: HashMap<u32, Vec<String>>, // commit_count_range -> repo_paths
    pub by_file_type: HashMap<String, Vec<String>>, // file_extension -> repo_paths
}

impl RepositoryIndex {
    pub fn new() -> Self {
        Self {
            by_name: HashMap::new(),
            by_size_range: HashMap::new(),
            by_commit_count_range: HashMap::new(),
            by_file_type: HashMap::new(),
        }
    }
    
    // O(1) insertion into all indices
    pub fn insert_repository(&mut self, repo: &GitRepository) {
        // Index by name (for prefix search)
        self.by_name.insert(repo.name.clone().to_lowercase(), repo.path.clone());
        
        // Index by size range (group by 50MB ranges)
        let size_range = ((repo.size_mb / 50.0) as u32) * 50;
        self.by_size_range.entry(size_range)
            .or_insert_with(Vec::new)
            .push(repo.path.clone());
            
        // Index by commit count range (group by 100s)
        let commit_range = (repo.commit_count / 100) * 100;
        self.by_commit_count_range.entry(commit_range)
            .or_insert_with(Vec::new)
            .push(repo.path.clone());
            
        // Index by file types
        for file_type in repo.file_types.keys() {
            self.by_file_type.entry(file_type.clone())
                .or_insert_with(Vec::new)
                .push(repo.path.clone());
        }
    }
    
    // O(1) removal from all indices
    pub fn remove_repository(&mut self, repo: &GitRepository) {
        self.by_name.remove(&repo.name.to_lowercase());
        
        let size_range = ((repo.size_mb / 50.0) as u32) * 50;
        if let Some(paths) = self.by_size_range.get_mut(&size_range) {
            paths.retain(|path| path != &repo.path);
        }
        
        let commit_range = (repo.commit_count / 100) * 100;
        if let Some(paths) = self.by_commit_count_range.get_mut(&commit_range) {
            paths.retain(|path| path != &repo.path);
        }
        
        for file_type in repo.file_types.keys() {
            if let Some(paths) = self.by_file_type.get_mut(file_type) {
                paths.retain(|path| path != &repo.path);
            }
        }
    }
    
    // Fast prefix search by name
    pub fn find_repositories_by_name_prefix(&self, prefix: &str) -> Vec<String> {
        let prefix_lower = prefix.to_lowercase();
        self.by_name.iter()
            .filter(|(name, _)| name.starts_with(&prefix_lower))
            .map(|(_, path)| path.clone())
            .collect()
    }
    
    // Fast search by file type
    pub fn find_repositories_by_file_type(&self, file_type: &str) -> Vec<String> {
        self.by_file_type.get(file_type)
            .map(|paths| paths.clone())
            .unwrap_or_default()
    }
    
    // Fast search by size range
    pub fn find_repositories_by_size_range(&self, min_mb: f64, max_mb: f64) -> Vec<String> {
        let min_range = ((min_mb / 50.0) as u32) * 50;
        let max_range = ((max_mb / 50.0) as u32) * 50;
        
        let mut result = Vec::new();
        for range in (min_range..=max_range).step_by(50) {
            if let Some(paths) = self.by_size_range.get(&range) {
                result.extend(paths.iter().cloned());
            }
        }
        result
    }
    
    // Clear all indices
    pub fn clear(&mut self) {
        self.by_name.clear();
        self.by_size_range.clear();
        self.by_commit_count_range.clear();
        self.by_file_type.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repo_types::GitRepository;
    use chrono::Utc;
    use std::collections::HashMap;

    fn create_test_repo(name: &str, path: &str, size_mb: f64) -> GitRepository {
        GitRepository {
            name: name.to_string(),
            path: path.to_string(),
            size_mb,
            file_types: HashMap::new(),
            last_commit_date: None,
            current_branch: None,
            branches: vec![],
            remote_url: None,
            commit_count: 10,
            last_analyzed: Utc::now(),
            is_valid: true,
            is_pinned: false,
            pinned_at: None,
            node_modules_info: None,
        }
    }

    #[test]
    fn test_path_trie_basic_operations() {
        let mut trie = PathTrie::new();
        
        trie.insert_repository("/home/user/project1");
        trie.insert_repository("/home/user/project2");
        trie.insert_repository("/home/user/subdir/project3");
        
        let repos_under_user = trie.find_repositories_under_path("/home/user");
        assert_eq!(repos_under_user.len(), 3);
        
        let repos_under_subdir = trie.find_repositories_under_path("/home/user/subdir");
        assert_eq!(repos_under_subdir.len(), 1);
        assert!(repos_under_subdir.contains(&"/home/user/subdir/project3".to_string()));
    }

    #[test]
    fn test_repository_index() {
        let mut index = RepositoryIndex::new();
        let repo = create_test_repo("test-repo", "/path/to/repo", 150.0);
        
        index.insert_repository(&repo);
        
        let by_name = index.find_repositories_by_name_prefix("test");
        assert_eq!(by_name.len(), 1);
        assert_eq!(by_name[0], "/path/to/repo");
        
        let by_size = index.find_repositories_by_size_range(100.0, 200.0);
        assert_eq!(by_size.len(), 1);
    }
}
