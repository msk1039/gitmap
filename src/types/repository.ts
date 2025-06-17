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
}

export interface ScanProgress {
  current_path: string;
  repos_found: number;
  completed: boolean;
}

export interface CacheInfo {
  total_repositories: number;
  last_updated: string;
  cache_file_size: number;
  valid_repositories: number;
  invalid_repositories: number;
}

export interface AppState {
  repositories: GitRepository[];
  selectedRepo: GitRepository | null;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  error: string | null;
  cacheInfo: CacheInfo | null;
}
