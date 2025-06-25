mod repo_types;
mod git_scanner;
mod data_store;

use repo_types::{GitRepository, FileEntry, DirectoryListing};
use git_scanner::GitScanner;
use data_store::CacheInfo;
use tauri::{command, Window, State};
use std::sync::Mutex;
use std::path::Path;
use std::fs;

struct AppState {
    scanner: Mutex<GitScanner>,
}

#[command]
async fn scan_repositories(window: Window, state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    // Create a new scanner for this operation
    let mut temp_scanner = GitScanner::new()?;
    let repos = temp_scanner.scan_disk(&window).await?;
    
    // Update the state with the results
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        scanner_guard.repos = repos.clone();
    }
    
    Ok(repos)
}

#[command]
async fn scan_repositories_with_cache(
    window: Window, 
    state: State<'_, AppState>,
    force_rescan: bool
) -> Result<Vec<GitRepository>, String> {
    // Create a new scanner for this operation
    let mut temp_scanner = GitScanner::new()?;
    let repos = temp_scanner.scan_disk_with_cache(&window, force_rescan).await?;
    
    // Update the state with the results
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        scanner_guard.repos = repos.clone();
    }
    
    Ok(repos)
}

#[command]
async fn load_cached_repositories(state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let mut temp_scanner = GitScanner::new()?;
    let repos = temp_scanner.load_cached_repositories().await?;
    
    // Update the state with the results
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        scanner_guard.repos = repos.clone();
    }
    
    Ok(repos)
}

#[command]
async fn get_cache_info(_state: State<'_, AppState>) -> Result<CacheInfo, String> {
    let scanner = GitScanner::new()?;
    scanner.get_cache_info()
}

#[command]
async fn clear_cache(state: State<'_, AppState>) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    scanner.clear_cache()?;
    
    // Clear the state as well
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        scanner_guard.repos.clear();
    }
    
    Ok(())
}

#[command]
async fn cleanup_invalid_repositories(_state: State<'_, AppState>) -> Result<usize, String> {
    let scanner = GitScanner::new()?;
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
    let mut temp_scanner = GitScanner::new()?;
    let updated_repo = temp_scanner.refresh_repository(&repo_path)?;
    
    // Update the repository in the scanner's list
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        if let Some(index) = scanner_guard.repos.iter().position(|r| r.path == repo_path) {
            scanner_guard.repos[index] = updated_repo.clone();
        }
    }
    
    Ok(updated_repo)
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
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }
    
    // Read the file content
    match fs::read_to_string(path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
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
    scan_paths: Vec<String>
) -> Result<Vec<GitRepository>, String> {
    // Create a new scanner for this operation
    let mut temp_scanner = GitScanner::new()?;
    let repos = temp_scanner.scan_custom_paths(&window, scan_paths).await?;
    
    // Update the state with the results
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        scanner_guard.repos = repos.clone();
    }
    
    Ok(repos)
}

#[command]
async fn refresh_cache(state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let mut temp_scanner = GitScanner::new()?;
    let refreshed_repos = temp_scanner.refresh_cache()?;
    
    // Update the state with the results
    {
        let mut scanner_guard = state.scanner.lock().map_err(|e| format!("Failed to lock scanner state: {}", e))?;
        scanner_guard.repos = refreshed_repos.clone();
    }
    
    Ok(refreshed_repos)
}

#[command]
async fn add_scan_path(path: String, _state: State<'_, AppState>) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    scanner.add_scan_path(path)
}

#[command]
async fn remove_scan_path(path: String, _state: State<'_, AppState>) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    scanner.remove_scan_path(&path)
}

#[command]
async fn get_scan_paths(_state: State<'_, AppState>) -> Result<Vec<repo_types::ScanPath>, String> {
    let scanner = GitScanner::new()?;
    scanner.get_scan_paths()
}

#[command]
async fn delete_repository(repo_path: String, _state: State<'_, AppState>) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    scanner.remove_repository_from_cache(&repo_path)
}

// Pin-related commands
#[command]
async fn toggle_repository_pin(repo_path: String, _state: State<'_, AppState>) -> Result<GitRepository, String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.toggle_repository_pin(&repo_path)
}

#[command]
async fn get_pinned_repositories(_state: State<'_, AppState>) -> Result<Vec<GitRepository>, String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.get_pinned_repositories()
}

// Collection-related commands
#[command]
async fn create_collection(name: String, _state: State<'_, AppState>) -> Result<repo_types::Collection, String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.create_collection(name)
}

#[command]
async fn get_collections(_state: State<'_, AppState>) -> Result<Vec<repo_types::Collection>, String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.get_collections()
}

#[command]
async fn add_repository_to_collection(
    collection_id: String,
    repo_path: String,
    _state: State<'_, AppState>
) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.add_repository_to_collection(&collection_id, &repo_path)
}

#[command]
async fn remove_repository_from_collection(
    collection_id: String,
    repo_path: String,
    _state: State<'_, AppState>
) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.remove_repository_from_collection(&collection_id, &repo_path)
}

#[command]
async fn delete_collection(collection_id: String, _state: State<'_, AppState>) -> Result<(), String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.delete_collection(&collection_id)
}

#[command]
async fn get_repositories_in_collection(
    collection_id: String,
    _state: State<'_, AppState>
) -> Result<Vec<GitRepository>, String> {
    let scanner = GitScanner::new()?;
    let data_store = scanner.data_store;
    data_store.get_repositories_in_collection(&collection_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    match GitScanner::new() {
        Ok(scanner_instance) => {
            let app_state = AppState {
                scanner: Mutex::new(scanner_instance),
            };

            tauri::Builder::default()
                .plugin(tauri_plugin_opener::init())
                .manage(app_state)
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
                    remove_repository_from_collection,
                    delete_collection,
                    get_repositories_in_collection
                ])
                .run(tauri::generate_context!())
                .expect("error while running tauri application");
        }
        Err(e) => {
            // Handle error during GitScanner initialization
            // This is a critical startup error. For now, print to stderr.
            // In a real app, you might show a dialog or log to a file.
            eprintln!("Failed to initialize GitScanner: {}", e);
            // Consider exiting or showing a minimal error UI if possible before Tauri fully starts.
            // For simplicity here, we'll let it panic if we can't show UI.
            panic!("Failed to initialize GitScanner: {}", e);
        }
    }
}
