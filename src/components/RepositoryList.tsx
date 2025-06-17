import React from 'react';
import { GitRepository } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ExternalLink, RefreshCw, Folder } from "lucide-react";

interface RepositoryListProps {
  repositories: GitRepository[];
  onRepositoryClick?: (repoPath: string, repoName: string) => void;
  onOpenInVSCode: (path: string) => void;
  onRefresh?: (path: string) => void;
  isLoading?: boolean;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({ 
  repositories, 
  onRepositoryClick, 
  onOpenInVSCode,
  onRefresh,
  isLoading = false 
}) => {
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
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="border">
        <div className="flex items-center justify-center w-full p-8 text-sm text-muted-foreground">
          <div className="text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <div>No repositories found</div>
            <div className="text-xs mt-1">Click "Scan Repositories" to search for Git repositories</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border">
      <ul>
        {repositories.map((repo) => {
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
                        className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInVSCode(repo.path);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        VS Code
                      </Button>
                      {onRefresh && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
  );
};
