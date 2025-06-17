import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { GitRepository, ScanProgress, CacheInfo, DirectoryListing } from '../types/repository';

export const useRepositoryManager = () => {
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitRepository | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [directoryListing, setDirectoryListing] = useState<DirectoryListing | null>(null);
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
      // Update selected repo if it's the one being refreshed
      if (selectedRepo?.path === repoPath) {
        setSelectedRepo(updatedRepo);
      }
      await loadCacheInfo();
    } catch (err) {
      setError(err as string);
    }
  }, [selectedRepo, loadCacheInfo]);

  const loadDirectoryContents = useCallback(async (repoPath: string) => {
    try {
      const listing = await invoke<DirectoryListing>('list_directory_contents', { repoPath });
      setDirectoryListing(listing);
    } catch (err) {
      setError(err as string);
    }
  }, []);

  const navigateTo = useCallback((view: 'list' | 'detail', repo?: GitRepository) => {
    setCurrentView(view);
    if (view === 'detail' && repo) {
      setSelectedRepo(repo);
      loadDirectoryContents(repo.path);
    } else {
      setSelectedRepo(null);
      setDirectoryListing(null);
    }
  }, [loadDirectoryContents]);

  const navigateToRepository = useCallback((repo: GitRepository) => {
    setSelectedRepo(repo);
    setCurrentView('detail');
    loadDirectoryContents(repo.path);
  }, [loadDirectoryContents]);

  const navigateBack = useCallback(() => {
    setCurrentView('list');
    setSelectedRepo(null);
    setDirectoryListing(null);
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
    selectedRepo,
    currentView,
    directoryListing,
    isScanning,
    scanProgress,
    error,
    cacheInfo,
    setSelectedRepo,
    scanRepositories,
    clearCache,
    cleanupInvalidRepositories,
    openInVSCode,
    refreshRepository,
    loadCachedRepositories,
    loadCacheInfo,
    loadDirectoryContents,
    navigateTo,
    navigateToRepository,
    navigateBack,
  };
};
