import React, { useState, useMemo } from 'react';
import { GitRepository } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, ExternalLink, RefreshCw, Folder, ArrowUpDown, FolderOpen, Search } from "lucide-react";

interface RepositoryListProps {
  repositories: GitRepository[];
  onRepositoryClick?: (repoPath: string, repoName: string) => void;
  onOpenInVSCode: (path: string) => void;
  onOpenInFileManager?: (path: string) => void;
  onRefresh?: (path: string) => void;
  isLoading?: boolean;
  searchQuery?: string;
}

type SortOption = 'name' | 'lastUpdated' | 'size';

export const RepositoryList: React.FC<RepositoryListProps> = ({ 
  repositories, 
  onRepositoryClick, 
  onOpenInVSCode,
  onOpenInFileManager,
  onRefresh,
  isLoading = false,
  searchQuery = ''
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const filteredAndSortedRepositories = useMemo(() => {
    // First filter by search query
    const filtered = searchQuery.trim() 
      ? repositories.filter(repo => 
          repo.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : repositories;
    
    // Then sort the filtered results
    const sorted = [...filtered];
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'lastUpdated':
        return sorted.sort((a, b) => {
          const dateA = a.last_commit_date ? new Date(a.last_commit_date).getTime() : 0;
          const dateB = b.last_commit_date ? new Date(b.last_commit_date).getTime() : 0;
          return dateB - dateA; // Most recent first
        });
      case 'size':
        return sorted.sort((a, b) => b.size_mb - a.size_mb); // Largest first
      default:
        return sorted;
    }
  }, [repositories, sortBy, searchQuery]);
  const formatSize = (sizeMb: number) => {
    if (sizeMb > 1024) {
      return `${(sizeMb / 1024).toFixed(1)} GB`;
    }
    return `${sizeMb.toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getTopFileTypes = (fileTypes: Record<string, number>) => {
    return Object.entries(fileTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([ext]) => ext)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Filter Controls - Disabled during loading */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sort by:</span>
            <Select disabled value="name">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
                <SelectItem value="size">Repository Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            Loading...
          </div>
        </div>

        <div className="border">
          <ul>
            {[...Array(5)].map((_, i) => (
              <li key={i} className="border-b last:border-b-0">
                <div className="block p-4 animate-pulse">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-start flex-1">
                      <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-64"></div>
                    </div>
                    <div className="flex flex-col items-end min-w-32">
                      <div className="h-3 bg-muted rounded w-16 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
                <SelectItem value="size">Repository Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredAndSortedRepositories.length} repositories
            {searchQuery && repositories.length !== filteredAndSortedRepositories.length && (
              <span> (filtered from {repositories.length})</span>
            )}
          </div>
        </div>

        <div className="border">
          <div className="flex items-center justify-center w-full p-8 text-sm text-muted-foreground">
            <div className="text-center">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <div>No repositories found</div>
              <div className="text-xs mt-1">Click "Scan Repositories" to search for Git repositories</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there are repositories but none match the search
  if (filteredAndSortedRepositories.length === 0 && searchQuery) {
    return (
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
                <SelectItem value="size">Repository Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            0 repositories (filtered from {repositories.length})
          </div>
        </div>

        <div className="border">
          <div className="flex items-center justify-center w-full p-8 text-sm text-muted-foreground">
            <div className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <div>No repositories match "{searchQuery}"</div>
              <div className="text-xs mt-1">Try adjusting your search or clear the filter</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="lastUpdated">Last Updated</SelectItem>
              <SelectItem value="size">Repository Size</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          {filteredAndSortedRepositories.length} repositories
          {searchQuery && repositories.length !== filteredAndSortedRepositories.length && (
            <span> (filtered from {repositories.length})</span>
          )}
        </div>
      </div>

      {/* Repository List */}
      <div className="border">
        <ul>
          {filteredAndSortedRepositories.map((repo) => {
          const topFileTypes = getTopFileTypes(repo.file_types);
          
          return (
            <li key={repo.path} className="border-b last:border-b-0">
              <div
                className="block p-4 text-sm font-medium transition-colors hover:bg-foreground hover:text-background cursor-pointer group"
                onClick={() => onRepositoryClick?.(repo.path, repo.name)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-2">
                      <h3 className="font-semibold truncate">{repo.name}</h3>
                      <Badge 
                        variant={repo.is_valid ? "default" : "destructive"}
                        className="text-xs shrink-0"
                      >
                        {repo.is_valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground group-hover:text-background/70 mb-2 truncate w-full">
                      {repo.path}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground group-hover:text-background/70">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span>{repo.current_branch || 'Unknown'}</span>
                      </div>
                      <span>{repo.commit_count} commits</span>
                      <span>{formatSize(repo.size_mb)}</span>
                      {topFileTypes && <span>{topFileTypes}</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end min-w-32 shrink-0">
                    <div className="flex gap-1 mb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-black"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInVSCode(repo.path);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        VS Code
                      </Button>
                      {onOpenInFileManager && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInFileManager(repo.path);
                          }}
                        >
                          <FolderOpen className="h-3 w-3 mr-1" />
                          Files
                        </Button>
                      )}
                      {onRefresh && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefresh(repo.path);
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground group-hover:text-background/70 text-right">
                      <div>Last commit:</div>
                      <div>{formatDate(repo.last_commit_date)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        </ul>
      </div>
    </div>
  );
};
