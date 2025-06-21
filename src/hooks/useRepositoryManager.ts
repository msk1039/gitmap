import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { GitRepository, ScanProgress, CacheInfo, ScanPath } from '../types/repository';

export const useRepositoryManager = () => {
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);

  // Load cached repositories on component mount
  useEffect(() => {
    loadCachedRepositories();
    loadCacheInfo();
  }, []);

  const loadCachedRepositories = useCallback(async () => {
    try {
      const cachedRepos = await invoke<GitRepository[]>('load_cached_repositories');
      setRepositories(cachedRepos);
    } catch (err) {
      console.warn('Failed to load cached repositories:', err);
      // Don't set error state here, as this is optional
    }
  }, []);

  const loadCacheInfo = useCallback(async () => {
    try {
      const info = await invoke<CacheInfo>('get_cache_info');
      setCacheInfo(info);
    } catch (err) {
      console.warn('Failed to load cache info:', err);
    }
  }, []);

  const scanRepositories = useCallback(async (forceRescan: boolean = false) => {
    setIsScanning(true);
    setError(null);
    
    try {
      const repos = await invoke<GitRepository[]>('scan_repositories_with_cache', { 
        forceRescan 
      });
      setRepositories(repos);
      await loadCacheInfo(); // Update cache info after scan
    } catch (err) {
      setError(err as string);
    } finally {
      setIsScanning(false);
    }
  }, [loadCacheInfo]);

  const scanCustomPaths = useCallback(async (scanPaths: string[]) => {
    setIsScanning(true);
    setError(null);
    
    try {
      const repos = await invoke<GitRepository[]>('scan_custom_paths', { 
        scanPaths 
      });
      setRepositories(repos);
      await loadCacheInfo(); // Update cache info after scan
    } catch (err) {
      setError(err as string);
    } finally {
      setIsScanning(false);
    }
  }, [loadCacheInfo]);

  const clearCache = useCallback(async () => {
    try {
      await invoke('clear_cache');
      setRepositories([]);
      setCacheInfo(null);
      await loadCacheInfo();
    } catch (err) {
      setError(err as string);
    }
  }, [loadCacheInfo]);

  const cleanupInvalidRepositories = useCallback(async () => {
    try {
      const removedCount = await invoke<number>('cleanup_invalid_repositories');
      await loadCachedRepositories();
      await loadCacheInfo();
      return removedCount;
    } catch (err) {
      setError(err as string);
      return 0;
    }
  }, [loadCachedRepositories, loadCacheInfo]);

  const openInVSCode = useCallback(async (repoPath: string) => {
    try {
      await invoke('open_in_vscode', { repoPath });
    } catch (err) {
      setError(err as string);
    }
  }, []);

  const refreshRepository = useCallback(async (repoPath: string) => {
    try {
      const updatedRepo = await invoke<GitRepository>('refresh_repository', { repoPath });
      setRepositories(prev => 
        prev.map(repo => repo.path === repoPath ? updatedRepo : repo)
      );
      await loadCacheInfo();
    } catch (err) {
      setError(err as string);
    }
  }, [loadCacheInfo]);

  const openInFileManager = useCallback(async (repoPath: string) => {
    try {
      await invoke('open_in_file_manager', { repoPath });
    } catch (err) {
      setError(err as string);
    }
  }, []);

  const refreshCache = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const repos = await invoke<GitRepository[]>('refresh_cache');
      setRepositories(repos);
      await loadCacheInfo(); // Update cache info after refresh
    } catch (err) {
      setError(err as string);
    } finally {
      setIsScanning(false);
    }
  }, [loadCacheInfo]);

  const addScanPath = useCallback(async (path: string) => {
    try {
      await invoke('add_scan_path', { path });
      await loadCacheInfo(); // Update cache info after adding
    } catch (err) {
      console.error('Failed to add scan path:', err);
      throw err;
    }
  }, [loadCacheInfo]);

  const removeScanPath = useCallback(async (path: string) => {
    try {
      await invoke('remove_scan_path', { path });
      await loadCacheInfo(); // Update cache info after removing
    } catch (err) {
      console.error('Failed to remove scan path:', err);
      throw err;
    }
  }, [loadCacheInfo]);

  const getScanPaths = useCallback(async () => {
    try {
      return await invoke<ScanPath[]>('get_scan_paths');
    } catch (err) {
      console.error('Failed to get scan paths:', err);
      throw err;
    }
  }, []);

  // Listen for scan progress updates
  useEffect(() => {
    const unlistenProgress = listen<ScanProgress>('scan-progress', (event: any) => {
      setScanProgress(event.payload);
    });

    return () => {
      unlistenProgress.then((fn: any) => fn());
    };
  }, []);

  return {
    repositories,
    isScanning,
    scanProgress,
    error,
    cacheInfo,
    scanRepositories,
    scanCustomPaths,
    clearCache,
    cleanupInvalidRepositories,
    openInVSCode,
    refreshRepository,
    loadCachedRepositories,
    loadCacheInfo,
    openInFileManager,
    refreshCache,
    addScanPath,
    removeScanPath,
    getScanPaths,
  };
};
