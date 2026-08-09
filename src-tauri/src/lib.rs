mod repo_types;
mod git_scanner;
mod data_store;
mod optimizations;
mod cleanup;

use repo_types::{CleanableItem, CleanupDeletionResult, GitRepository, FileEntry, DirectoryListing, Collection};
use git_scanner::GitScanner;
use data_store::CacheInfo;
use tauri::{command, Window, State};
use tauri::async_runtime::Mutex;
use std::path::{Path, PathBuf};
use std::fs;

const MAX_VIEWABLE_FILE_SIZE_BYTES: u64 = 1_048_576;

struct AppState {
    scanner: Mutex<GitScanner>,
}

#[command]
async fn discover_repositories(
    window: Window,
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<Vec<String>, String> {
    let scanner = state.scanner.lock().await;
    scanner.discover_repositories(&window, paths).await
}

#[command]
async fn analyze_discovered_repositories(
    window: Window,
    state: State<'_, AppState>,
    repo_paths: Vec<String>,
) -> Result<Vec<GitRepository>, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.analyze_discovered_repositories(&window, repo_paths).await
}

#[command]
async fn scan_repositories(window: Window, state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.scan_disk(&window).await
}

#[command]
async fn scan_repositories_with_cache(
    window: Window,
    state: State<'_, AppState>,
    force_rescan: bool,
) -> Result<Vec<GitRepository>, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.scan_disk_with_cache(&window, force_rescan).await
}

#[command]
async fn load_cached_repositories(state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.load_cached_repositories().await
}

#[command]
async fn get_cache_info(state: State<'_, AppState>) -> Result<CacheInfo, String> {
    let scanner = state.scanner.lock().await;
    scanner.get_cache_info()
}

#[command]
async fn get_cache_file_path(state: State<'_, AppState>) -> Result<String, String> {
    let scanner = state.scanner.lock().await;
    Ok(scanner.data_store.get_cache_file_path_string())
}

#[command]
async fn open_cache_in_file_manager(state: State<'_, AppState>) -> Result<(), String> {
    use std::process::Command;

    let cache_file_path = {
        let scanner = state.scanner.lock().await;
        scanner.data_store.get_cache_file_path_string()
    };

    let result = if cfg!(target_os = "macos") {
        Command::new("open").arg("-R").arg(&cache_file_path).spawn()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer")
            .arg(format!("/select,{}", cache_file_path))
            .spawn()
    } else if cfg!(target_os = "linux") {
        let parent_directory = Path::new(&cache_file_path)
            .parent()
            .ok_or("Cache file does not have a parent directory")?;
        Command::new("xdg-open").arg(parent_directory).spawn()
    } else {
        return Err("Unsupported operating system".to_string());
    };

    result
        .map(|_| ())
        .map_err(|error| format!("Failed to open cache location: {error}"))
}

#[command]
async fn clear_cache(state: State<'_, AppState>) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner.clear_cache()
}

#[command]
async fn cleanup_invalid_repositories(state: State<'_, AppState>) -> Result<usize, String> {
    let scanner = state.scanner.lock().await;
    scanner.cleanup_invalid_repositories()
}

#[command]
async fn open_in_vscode(repo_path: String) -> Result<(), String> {
    // Open with VS Code using the command line
    use std::process::Command;
    
    let result = Command::new("code")
        .arg(&repo_path)
        .spawn();
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open VS Code: {}. Make sure VS Code is installed and the 'code' command is available in your PATH.", e))
    }
}

#[command]
async fn refresh_repository(repo_path: String, state: State<'_, AppState>) -> Result<GitRepository, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.refresh_repository(&repo_path)
}

#[command]
async fn list_directory_contents(repo_path: String, root_path: String) -> Result<DirectoryListing, String> {
    use chrono::{DateTime, Utc};

    let root = resolve_path_within_root(&root_path, &root_path)?;
    let path = resolve_path_within_root(&root_path, &repo_path)?;

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", repo_path));
    }
    
    let mut entries = Vec::new();
    
    match fs::read_dir(&path) {
        Ok(dir_entries) => {
            for entry in dir_entries {
                match entry {
                    Ok(dir_entry) => {
                        let entry_path = dir_entry.path();
                        let canonical_entry_path = match fs::canonicalize(&entry_path) {
                            Ok(path) if path.starts_with(&root) => path,
                            Ok(_) => continue,
                            Err(_) => continue,
                        };
                        let name = entry_path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();
                        
                        // Keep repository dotfiles visible (for example, .gitignore and .github)
                        // just like GitHub, but never expose Git's internal metadata or Finder noise.
                        if name == ".git" || name == ".DS_Store" {
                            continue;
                        }
                        
                        let is_directory = canonical_entry_path.is_dir();
                        let size = if is_directory {
                            None
                        } else {
                            fs::metadata(&canonical_entry_path).ok().map(|m| m.len())
                        };
                        
                        let modified = fs::metadata(&canonical_entry_path)
                            .and_then(|m| m.modified())
                            .ok()
                            .and_then(|time| {
                                use std::time::UNIX_EPOCH;
                                time.duration_since(UNIX_EPOCH)
                                    .ok()
                                    .map(|d| DateTime::<Utc>::from_timestamp(d.as_secs() as i64, 0))
                                    .flatten()
                            });
                        
                        entries.push(FileEntry {
                            name,
                            path: canonical_entry_path.to_string_lossy().to_string(),
                            is_directory,
                            size,
                            modified,
                        });
                    }
                    Err(e) => {
                        // Skip entries we can't read
                        eprintln!("Failed to read directory entry: {}", e);
                        continue;
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read directory: {}", e));
        }
    }
    
    // Sort entries: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(DirectoryListing {
        path: path.to_string_lossy().to_string(),
        entries,
    })
}

#[command]
async fn read_file_content(file_path: String, root_path: String) -> Result<String, String> {
    let path = resolve_path_within_root(&root_path, &file_path)?;
    let metadata = fs::metadata(&path).map_err(|error| format!("Unable to inspect file: {error}"))?;

    if !metadata.is_file() {
        return Err("Path is not a regular file".to_string());
    }

    if metadata.len() > MAX_VIEWABLE_FILE_SIZE_BYTES {
        return Err(format!(
            "This file is too large to preview ({} bytes; limit is {} MiB)",
            metadata.len(),
            MAX_VIEWABLE_FILE_SIZE_BYTES / 1_048_576,
        ));
    }

    fs::read_to_string(path).map_err(|error| format!("Unable to read UTF-8 text file: {error}"))
}

fn resolve_path_within_root(root_path: &str, candidate_path: &str) -> Result<PathBuf, String> {
    let root = fs::canonicalize(root_path)
        .map_err(|error| format!("Repository root does not exist: {error}"))?;
    let candidate = fs::canonicalize(candidate_path)
        .map_err(|error| format!("Path does not exist: {error}"))?;

    if candidate.starts_with(&root) {
        Ok(candidate)
    } else {
        Err("Path must stay inside the selected repository".to_string())
    }
}

// Keep the existing greet command for compatibility
#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[command]
async fn open_in_file_manager(repo_path: String) -> Result<(), String> {
    use std::process::Command;
    
    let result = if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&repo_path)
            .spawn()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer")
            .arg(&repo_path)
            .spawn()
    } else if cfg!(target_os = "linux") {
        // Try common Linux file managers
        Command::new("xdg-open")
            .arg(&repo_path)
            .spawn()
            .or_else(|_| {
                Command::new("nautilus")
                    .arg(&repo_path)
                    .spawn()
            })
            .or_else(|_| {
                Command::new("dolphin")
                    .arg(&repo_path)
                    .spawn()
            })
            .or_else(|_| {
                Command::new("thunar")
                    .arg(&repo_path)
                    .spawn()
            })
    } else {
        return Err("Unsupported operating system".to_string());
    };
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open file manager: {}", e))
    }
}

#[command]
async fn scan_custom_paths(
    window: Window,
    state: State<'_, AppState>,
    scan_paths: Vec<String>,
) -> Result<Vec<GitRepository>, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.scan_custom_paths(&window, scan_paths).await
}

#[command]
async fn refresh_cache(state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let mut scanner = state.scanner.lock().await;
    scanner.refresh_cache()
}

#[command]
async fn add_scan_path(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner.add_scan_path(path)
}

#[command]
async fn remove_scan_path(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner.remove_scan_path(&path)
}

#[command]
async fn get_scan_paths(state: State<'_, AppState>) -> Result<Vec<repo_types::ScanPath>, String> {
    let scanner = state.scanner.lock().await;
    scanner.get_scan_paths()
}

#[command]
async fn delete_repository(repo_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner.remove_repository_from_cache(&repo_path)
}

// Pin-related commands
#[command]
async fn toggle_repository_pin(repo_path: String, state: State<'_, AppState>) -> Result<GitRepository, String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.toggle_repository_pin(&repo_path)
}

#[command]
async fn get_pinned_repositories(state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.get_pinned_repositories()
}

// Collection-related commands
#[command]
async fn create_collection(name: String, color: String, state: State<'_, AppState>) -> Result<Collection, String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.create_collection(name, color)
}

#[command]
async fn get_collections(state: State<'_, AppState>) -> Result<Vec<Collection>, String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.get_collections()
}

#[command]
async fn add_repository_to_collection(
    collection_id: String,
    repo_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.add_repository_to_collection(&collection_id, &repo_path)
}

#[command]
async fn get_repositories_in_collection(
    collection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GitRepository>, String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.get_repositories_in_collection(&collection_id)
}

#[command]
async fn delete_collection(collection_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner.data_store.delete_collection(&collection_id)
}

#[command]
async fn remove_repo_from_collection(
    collection_id: String,
    repo_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let scanner = state.scanner.lock().await;
    scanner
        .data_store
        .remove_repository_from_collection(&collection_id, &repo_path)
}

#[command]
async fn list_cleanable_items(repo_path: String) -> Result<Vec<CleanableItem>, String> {
    cleanup::scan_cleanable_items(Path::new(&repo_path))
}

#[command]
async fn delete_cleanable_items(
    repo_path: String,
    selected_paths: Vec<String>,
) -> Result<CleanupDeletionResult, String> {
    cleanup::delete_cleanable_items(Path::new(&repo_path), &selected_paths)
}

// === OPTIMIZED SEARCH COMMANDS ===

#[command]
async fn find_repositories_under_path(path: String) -> Result<Vec<GitRepository>, String> {
    let data_store = data_store::DataStore::new()?;
    data_store.find_repositories_under_path_optimized(&path)
}

#[command]
async fn advanced_repository_search(
    name_prefix: Option<String>,
    min_size_mb: Option<f64>,
    max_size_mb: Option<f64>,
    file_type: Option<String>
) -> Result<Vec<GitRepository>, String> {
    let data_store = data_store::DataStore::new()?;
    data_store.advanced_search(
        name_prefix.as_deref(),
        min_size_mb,
        max_size_mb,
        file_type.as_deref()
    )
}

#[command]
async fn get_repository_fast(repo_path: String) -> Result<Option<GitRepository>, String> {
    let data_store = data_store::DataStore::new()?;
    data_store.get_repository_fast(&repo_path)
}

#[command]
async fn get_optimization_stats() -> Result<serde_json::Value, String> {
    let data_store = data_store::DataStore::new()?;
    data_store.get_optimization_stats()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let scanner = GitScanner::new().expect("Failed to initialize GitScanner");

    tauri::Builder::default()
        .manage(AppState {
            scanner: Mutex::new(scanner),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_repositories,
            scan_repositories_with_cache,
            load_cached_repositories,
            get_cache_info,
            get_cache_file_path,
            open_cache_in_file_manager,
            clear_cache,
            cleanup_invalid_repositories,
            open_in_vscode,
            refresh_repository,
            list_directory_contents,
            read_file_content,
            open_in_file_manager,
            scan_custom_paths,
            refresh_cache,
            add_scan_path,
            remove_scan_path,
            get_scan_paths,
            delete_repository,
            toggle_repository_pin,
            get_pinned_repositories,
            create_collection,
            get_collections,
            add_repository_to_collection,
            remove_repo_from_collection,
            delete_collection,
            get_repositories_in_collection,
            list_cleanable_items,
            delete_cleanable_items,
            discover_repositories,
            analyze_discovered_repositories
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
