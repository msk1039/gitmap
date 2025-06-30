import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitRepository, SearchFilters, OptimizationStats } from '../types/repository';

// Debounce hook for search optimization
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<number | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

export const useOptimizedSearch = () => {
  const [searchResults, setSearchResults] = useState<GitRepository[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [optimizationStats, setOptimizationStats] = useState<OptimizationStats | null>(null);
  
  // Cache for fast repository access
  const repositoryCache = useRef(new Map<string, GitRepository>());
  
  // Optimized repository search with debouncing
  const debouncedSearch = useDebounce(async (filters: SearchFilters) => {
    if (!filters.namePrefix && !filters.minSizeMb && !filters.maxSizeMb && !filters.fileType) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      setSearchError(null);
      
      const results = await invoke<GitRepository[]>('advanced_repository_search', {
        namePrefix: filters.namePrefix || null,
        minSizeMb: filters.minSizeMb || null,
        maxSizeMb: filters.maxSizeMb || null,
        fileType: filters.fileType || null,
      });
      
      // Update cache with results
      results.forEach(repo => {
        repositoryCache.current.set(repo.path, repo);
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, 300); // 300ms debounce
  
  // Fast path-based search
  const searchByPath = useCallback(async (path: string): Promise<GitRepository[]> => {
    try {
      const results = await invoke<GitRepository[]>('find_repositories_under_path', { path });
      
      // Update cache
      results.forEach(repo => {
        repositoryCache.current.set(repo.path, repo);
      });
      
      return results;
    } catch (error) {
      console.error('Path search failed:', error);
      throw error;
    }
  }, []);
  
  // Fast single repository access
  const getRepository = useCallback(async (repoPath: string): Promise<GitRepository | null> => {
    // Check cache first
    const cached = repositoryCache.current.get(repoPath);
    if (cached) {
      return cached;
    }
    
    try {
      const repo = await invoke<GitRepository | null>('get_repository_fast', { repoPath });
      
      // Update cache
      if (repo) {
        repositoryCache.current.set(repoPath, repo);
      }
      
      return repo;
    } catch (error) {
      console.error('Failed to get repository:', error);
      return null;
    }
  }, []);
  
  // Load optimization statistics
  const loadOptimizationStats = useCallback(async () => {
    try {
      const stats = await invoke<OptimizationStats>('get_optimization_stats');
      setOptimizationStats(stats);
    } catch (error) {
      console.error('Failed to load optimization stats:', error);
    }
  }, []);
  
  // Smart search that combines multiple strategies
  const smartSearch = useCallback((query: string, repositories: GitRepository[]): GitRepository[] => {
    if (!query.trim()) {
      return repositories;
    }
    
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/).filter(term => term.length > 0);
    
    return repositories.filter(repo => {
      const searchableText = [
        repo.name,
        repo.path,
        repo.current_branch || '',
        repo.remote_url || '',
        ...Object.keys(repo.file_types)
      ].join(' ').toLowerCase();
      
      // All search terms must match somewhere in the searchable text
      return searchTerms.every(term => searchableText.includes(term));
    });
  }, []);
  
  // Memoized filtering and sorting
  const filterAndSortRepositories = useCallback((
    repositories: GitRepository[],
    searchQuery: string,
    sortBy: 'name' | 'lastUpdated' | 'size' = 'name',
    filters?: Partial<SearchFilters>
  ): GitRepository[] => {
    let filtered = repositories;
    
    // Apply text search
    if (searchQuery.trim()) {
      filtered = smartSearch(searchQuery, filtered);
    }
    
    // Apply additional filters
    if (filters) {
      if (filters.minSizeMb !== undefined) {
        filtered = filtered.filter(repo => repo.size_mb >= filters.minSizeMb!);
      }
      if (filters.maxSizeMb !== undefined) {
        filtered = filtered.filter(repo => repo.size_mb <= filters.maxSizeMb!);
      }
      if (filters.fileType) {
        filtered = filtered.filter(repo => 
          Object.keys(repo.file_types).some(ext => 
            ext.toLowerCase().includes(filters.fileType!.toLowerCase())
          )
        );
      }
      if (filters.pathFilter) {
        filtered = filtered.filter(repo => 
          repo.path.toLowerCase().includes(filters.pathFilter!.toLowerCase())
        );
      }
    }
    
    // Sort results
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'lastUpdated':
        sorted.sort((a, b) => {
          const dateA = a.last_commit_date ? new Date(a.last_commit_date) : new Date(0);
          const dateB = b.last_commit_date ? new Date(b.last_commit_date) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'size':
        sorted.sort((a, b) => b.size_mb - a.size_mb);
        break;
    }
    
    // Separate pinned and unpinned, with pinned first
    const pinned = sorted.filter(repo => repo.is_pinned);
    const unpinned = sorted.filter(repo => !repo.is_pinned);
    
    return [...pinned, ...unpinned];
  }, [smartSearch]);
  
  // Clear cache
  const clearCache = useCallback(() => {
    repositoryCache.current.clear();
  }, []);
  
  return {
    // Search state
    searchResults,
    isSearching,
    searchError,
    optimizationStats,
    
    // Search functions
    debouncedSearch,
    searchByPath,
    getRepository,
    smartSearch,
    filterAndSortRepositories,
    
    // Utility functions
    loadOptimizationStats,
    clearCache,
  };
};
