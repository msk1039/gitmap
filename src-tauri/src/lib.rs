mod repo_types;
mod git_scanner;
mod data_store;
mod optimizations;

use repo_types::{GitRepository, FileEntry, DirectoryListing, Collection};
use git_scanner::GitScanner;
use data_store::CacheInfo;
use tauri::{command, Window, State};
use tauri::async_runtime::Mutex;
use std::path::Path;
use std::fs;

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
async fn list_directory_contents(repo_path: String) -> Result<DirectoryListing, String> {
    use chrono::{DateTime, Utc};
    
    let path = Path::new(&repo_path);
    
    if !path.exists() {
        return Err(format!("Path does not exist: {}", repo_path));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", repo_path));
    }
    
    let mut entries = Vec::new();
    
    match fs::read_dir(path) {
        Ok(dir_entries) => {
            for entry in dir_entries {
                match entry {
                    Ok(dir_entry) => {
                        let entry_path = dir_entry.path();
                        let name = entry_path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();
                        
                        // Skip hidden files and directories starting with .
                        if name.starts_with('.') {
                            continue;
                        }
                        
                        let is_directory = entry_path.is_dir();
                        let size = if is_directory {
                            None
                        } else {
                            dir_entry.metadata().ok().map(|m| m.len())
                        };
                        
                        let modified = dir_entry.metadata()
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
                            path: entry_path.to_string_lossy().to_string(),
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
        path: repo_path,
        entries,
    })
}

#[command]
async fn read_file_content(file_path: String) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| e.to_string())
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
    let mut scanner = state.scanner.lock().await;
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
    let mut scanner = state.scanner.lock().await;
    scanner.data_store.delete_collection(&collection_id)
}

#[command]
async fn remove_repo_from_collection(
    collection_id: String,
    repo_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut scanner = state.scanner.lock().await;
    scanner
        .data_store
        .remove_repository_from_collection(&collection_id, &repo_path)
}

#[command]
async fn delete_node_modules(repo_path: String) -> Result<(), String> {
    use std::fs;
    use walkdir::WalkDir;
    
    let repo_path = Path::new(&repo_path);
    
    if !repo_path.exists() {
        return Err("Repository path does not exist".to_string());
    }
    
    // Look for node_modules directories in the repository
    let walker = WalkDir::new(repo_path)
        .max_depth(3) // Don't go too deep to avoid nested node_modules
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|entry| {
            entry.file_type().is_dir() && 
            entry.file_name() == "node_modules"
        });
    
    let mut deleted_count = 0;
    let mut errors = Vec::new();
    
    for entry in walker {
        let node_modules_path = entry.path();
        match fs::remove_dir_all(node_modules_path) {
            Ok(_) => {
                deleted_count += 1;
                println!("Deleted node_modules at: {}", node_modules_path.display());
            }
            Err(e) => {
                let error_msg = format!("Failed to delete {}: {}", node_modules_path.display(), e);
                errors.push(error_msg);
            }
        }
    }
    
    if !errors.is_empty() {
        return Err(format!("Deleted {} node_modules directories but encountered errors: {}", 
                          deleted_count, errors.join("; ")));
    }
    
    if deleted_count == 0 {
        return Err("No node_modules directories found to delete".to_string());
    }
    
    Ok(())
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
            delete_node_modules,
            discover_repositories,
            analyze_discovered_repositories
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
