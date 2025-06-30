export interface NodeModulesInfo {
  total_size_mb: number;
  count: number;
  paths: string[];
  last_scanned: string;
  package_json_modified: string;
}

export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number; // Size in bytes, undefined for directories
  modified?: string;
}

export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
}

export interface GitRepository {
  name: string;
  path: string;
  size_mb: number;
  file_types: Record<string, number>;
  last_commit_date?: string;
  current_branch?: string;
  branches: string[];
  remote_url?: string;
  commit_count: number;
  // Persistence metadata
  last_analyzed: string;
  is_valid: boolean;
  is_pinned: boolean;
  pinned_at?: string;
  node_modules_info?: NodeModulesInfo;
}

export interface ScanProgress {
  current_path: string;
  repos_found: number;
  completed: boolean;
}

export interface ScanPath {
  path: string;
  last_scanned?: string;
  repository_count: number;
}

export interface CacheInfo {
  total_repositories: number;
  last_updated: string;
  cache_file_size: number;
  valid_repositories: number;
  invalid_repositories: number;
}

export interface Collection {
  id: string;
  name: string;
  color: string; // Theme color for the collection (hex color code)
  repository_paths: string[];
  created_at: string;
}

export interface SearchFilters {
  namePrefix?: string;
  minSizeMb?: number;
  maxSizeMb?: number;
  fileType?: string;
  pathFilter?: string;
}

export interface OptimizationStats {
  total_repositories: number;
  lru_cache_size: number;
  lru_cache_capacity: number;
  index_name_entries: number;
  index_size_ranges: number;
  index_file_types: number;
}

export interface AppState {
  repositories: GitRepository[];
  selectedRepo: GitRepository | null;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  error: string | null;
  cacheInfo: CacheInfo | null;
}
