use crate::repo_types::{CleanableInfo, CleanableItem, CleanupDeletionResult};
use chrono::Utc;
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use walkdir::{DirEntry, WalkDir};

const MAX_CLEANUP_SCAN_DEPTH: usize = 4;

/// Finds generated dependencies, build outputs, and tool caches that are safe to recreate.
/// Source directories, version-control metadata, lockfiles, and tool configuration are excluded.
pub fn scan_cleanable_items(repo_path: &Path) -> Result<Vec<CleanableItem>, String> {
    if !repo_path.is_dir() {
        return Err("Repository path does not exist or is not a directory".to_string());
    }

    let mut items = Vec::new();
    let mut walker = WalkDir::new(repo_path)
        .max_depth(MAX_CLEANUP_SCAN_DEPTH)
        .follow_links(false)
        .into_iter();

    while let Some(entry) = walker.next() {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        if entry.depth() == 0 {
            continue;
        }

        if entry.file_type().is_symlink() {
            if entry.file_type().is_dir() {
                walker.skip_current_dir();
            }
            continue;
        }

        let name = entry.file_name().to_string_lossy();
        if entry.file_type().is_dir() && matches!(name.as_ref(), ".git" | ".svn" | ".hg" | "vendor")
        {
            walker.skip_current_dir();
            continue;
        }

        if let Some(category) = cleanable_category(&entry) {
            let size_bytes = path_size_bytes(entry.path());
            let relative_path = entry
                .path()
                .strip_prefix(repo_path)
                .unwrap_or(entry.path())
                .to_string_lossy()
                .to_string();

            items.push(CleanableItem {
                path: entry.path().to_string_lossy().to_string(),
                relative_path,
                category: category.to_string(),
                is_directory: entry.file_type().is_dir(),
                size_bytes,
            });

            if entry.file_type().is_dir() {
                walker.skip_current_dir();
            }
        }
    }

    items.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    Ok(items)
}

pub fn cleanable_info(repo_path: &Path) -> Result<Option<CleanableInfo>, String> {
    let items = scan_cleanable_items(repo_path)?;
    if items.is_empty() {
        return Ok(None);
    }

    Ok(Some(CleanableInfo {
        total_size_bytes: items.iter().map(|item| item.size_bytes).sum(),
        item_count: items.len() as u32,
        last_scanned: Utc::now(),
    }))
}

/// Deletes only paths which are currently recognised cleanable items under the given repository.
/// Re-scanning and canonical-path checks prevent a caller from supplying arbitrary file paths.
pub fn delete_cleanable_items(
    repo_path: &Path,
    selected_paths: &[String],
) -> Result<CleanupDeletionResult, String> {
    if selected_paths.is_empty() {
        return Err("Select at least one item to delete".to_string());
    }

    let repo_canonical = repo_path
        .canonicalize()
        .map_err(|error| format!("Unable to access repository: {error}"))?;
    let available_items = scan_cleanable_items(repo_path)?;
    let mut selected_items = Vec::with_capacity(selected_paths.len());
    let mut seen_paths = HashSet::with_capacity(selected_paths.len());

    for selected_path in selected_paths {
        if !seen_paths.insert(selected_path) {
            return Err(format!("Duplicate selected path: {selected_path}"));
        }

        let item = available_items
            .iter()
            .find(|item| item.path == *selected_path)
            .ok_or_else(|| format!("Refusing to delete unrecognised path: {selected_path}"))?;

        let canonical_path = Path::new(&item.path)
            .canonicalize()
            .map_err(|error| format!("Unable to access {}: {error}", item.relative_path))?;
        if !canonical_path.starts_with(&repo_canonical) {
            return Err(format!(
                "Refusing to delete {} because it resolves outside the repository",
                item.relative_path
            ));
        }

        selected_items.push(item);
    }

    let mut deleted_paths = Vec::with_capacity(selected_items.len());
    let mut deleted_size_bytes = 0;
    for item in selected_items {
        let result = if item.is_directory {
            fs::remove_dir_all(&item.path)
        } else {
            fs::remove_file(&item.path)
        };

        result.map_err(|error| format!("Failed to delete {}: {error}", item.relative_path))?;
        deleted_paths.push(item.path.clone());
        deleted_size_bytes += item.size_bytes;
    }

    Ok(CleanupDeletionResult {
        deleted_paths,
        deleted_size_bytes,
    })
}

fn cleanable_category(entry: &DirEntry) -> Option<&'static str> {
    if entry.file_type().is_symlink() {
        return None;
    }

    let name = entry.file_name().to_string_lossy();
    if entry.file_type().is_dir() {
        return match name.as_ref() {
            "node_modules" => Some("JavaScript dependencies"),
            "target" => Some("Rust / JVM build output"),
            ".next" | ".nuxt" | ".svelte-kit" | ".astro" | ".angular" | ".vite"
            | ".parcel-cache" | ".turbo" => Some("Frontend build cache"),
            "dist" | "build" | "out" => Some("Generated build output"),
            ".cache" | ".gradle" | ".pytest_cache" | ".mypy_cache" | ".ruff_cache" | ".tox"
            | ".nox" | ".hypothesis" => Some("Tool cache"),
            "__pycache__" => Some("Python bytecode cache"),
            ".venv" | "venv" | "env" => Some("Python virtual environment"),
            "coverage" | "htmlcov" => Some("Test coverage output"),
            "bin" | "obj" => Some(".NET build output"),
            "CMakeFiles" => Some("CMake build metadata"),
            "_build" => Some("Generated build output"),
            _ if name.starts_with("cmake-build-") => Some("CMake build output"),
            _ if name.ends_with(".egg-info") => Some("Python package metadata"),
            _ => None,
        };
    }

    if entry.file_type().is_file() {
        return match name.as_ref() {
            ".coverage" | "coverage.lcov" | "lcov.info" => Some("Test coverage output"),
            "CMakeCache.txt" | "cmake_install.cmake" => Some("CMake build metadata"),
            _ if name.ends_with(".pyc") || name.ends_with(".pyo") => Some("Python bytecode cache"),
            _ => None,
        };
    }

    None
}

fn path_size_bytes(path: &Path) -> u64 {
    if path.is_file() {
        return fs::metadata(path)
            .map(|metadata| metadata.len())
            .unwrap_or(0);
    }

    WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file() && !entry.file_type().is_symlink())
        .filter_map(|entry| entry.metadata().ok())
        .map(|metadata| metadata.len())
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn finds_and_deletes_only_known_generated_artifacts() {
        let test_root =
            std::env::temp_dir().join(format!("gitmap-cleanup-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(test_root.join("node_modules/package")).unwrap();
        fs::create_dir_all(test_root.join("target/debug")).unwrap();
        fs::create_dir_all(test_root.join("src")).unwrap();
        fs::File::create(test_root.join("node_modules/package/index.js"))
            .unwrap()
            .write_all(b"dependency")
            .unwrap();
        fs::File::create(test_root.join("target/debug/app"))
            .unwrap()
            .write_all(b"binary")
            .unwrap();
        fs::File::create(test_root.join("src/main.rs"))
            .unwrap()
            .write_all(b"fn main() {}")
            .unwrap();

        let items = scan_cleanable_items(&test_root).unwrap();
        assert_eq!(items.len(), 2);
        assert!(items
            .iter()
            .any(|item| item.relative_path == "node_modules"));
        assert!(items.iter().any(|item| item.relative_path == "target"));

        let source_file = test_root.join("src/main.rs").to_string_lossy().to_string();
        assert!(delete_cleanable_items(&test_root, &[source_file]).is_err());
        assert!(test_root.join("src/main.rs").exists());

        let node_modules_path = items
            .iter()
            .find(|item| item.relative_path == "node_modules")
            .unwrap()
            .path
            .clone();
        let result = delete_cleanable_items(&test_root, &[node_modules_path]).unwrap();

        assert_eq!(result.deleted_paths.len(), 1);
        assert!(!test_root.join("node_modules").exists());
        assert!(test_root.join("target").exists());
        assert!(test_root.join("src/main.rs").exists());
        fs::remove_dir_all(test_root).unwrap();
    }
}
