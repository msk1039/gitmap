import React, { useState } from 'react';
import { GitRepository } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CollectionAssignmentDialog } from './CollectionAssignmentDialog';
import { CollectionBadges } from './CollectionBadges';
import { GitBranch, Folder, FolderOpen, Pin, Tags } from "lucide-react";
import { toast } from "sonner";

interface RepositoryListProps {
  repositories: GitRepository[];
  onRepositoryClick?: (repoPath: string, repoName: string) => void;
  onOpenInVSCode: (path: string) => void;
  onOpenInFileManager?: (path: string) => void;
  onTogglePin?: (repoPath: string) => void;
  onCollectionChange?: () => void;
  collectionRefreshTrigger?: number;
  isLoading?: boolean;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({ 
  repositories, 
  onRepositoryClick, 
  onOpenInVSCode,
  onOpenInFileManager,
  onTogglePin,
  onCollectionChange,
  collectionRefreshTrigger,
  isLoading = false
}) => {
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<GitRepository | null>(null);

  // Debug logging
  console.log('RepositoryList rendered with:', repositories.length, 'repositories');
  console.log('Pinned repositories:', repositories.filter(r => r.is_pinned).length);
  console.log('Repositories data:', repositories.map(r => ({ name: r.name, pinned: r.is_pinned })));
  
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

  if (repositories.length === 0 ) {
    return (
      <div className="space-y-4">
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

  // Separate pinned and unpinned repositories
  const pinnedRepositories = repositories.filter(repo => repo.is_pinned);
  const unpinnedRepositories = repositories.filter(repo => !repo.is_pinned);

  const renderRepository = (repo: GitRepository) => {
    const topFileTypes = getTopFileTypes(repo.file_types);
    
    return (
      <li key={repo.path} className="border-b last:border-b-0">
        <div
          className="block p-4 text-sm font-medium transition-colors cursor-pointer group"
          onClick={() => onRepositoryClick?.(repo.path, repo.name)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-start justify-between flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="font-semibold truncate">{repo.name}</h3>
                {repo.is_pinned && (
                  <Pin className="h-3 w-3 text-amber-500 shrink-0" fill="currentColor" />
                )}
              </div>
              
              <div className="relative group/path pr-6">
                <div className="text-xs text-muted-foreground mb-2 truncate w-full hover:underline">
                  {repo.path}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-0 top-0 h-4 w-4 p-0 opacity-0 group-hover/path:opacity-100 transition-opacity rounded-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(repo.path);
                        toast.success("Path copied to clipboard!", {
                          description: repo.path,
                          duration: 2000,
                        });
                      }}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy path to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground ">
                        {/* <div className="">
                <CollectionBadges repositoryPath={repo.path} refreshTrigger={collectionRefreshTrigger} />
              </div> */}

                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  <span className='text-green-700'>{repo.current_branch || 'Unknown'}</span>
                </div>
                <span className='text-red-700'>{repo.commit_count} commits</span>
                <span className='text-sky-700'>{formatSize(repo.size_mb)}</span>
                {topFileTypes && <span>{topFileTypes}</span>}
              </div>
              
              {/* Collection badges */}
              <div className="mt-2">
                <CollectionBadges repositoryPath={repo.path} refreshTrigger={collectionRefreshTrigger} />
              </div>
            </div>
            
            <div className="flex flex-col items-end min-w-32 shrink-0">
              <div className="flex gap-2 mb-2">
                   {/* <div className="">
                <CollectionBadges repositoryPath={repo.path} refreshTrigger={collectionRefreshTrigger} />
              </div> */}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepository(repo);
                        setCollectionDialogOpen(true);
                      }}
                    >
                      <Tags className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to Collections</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInVSCode(repo.path);
                      }}
                    >
                      <img 
                        src="/vscode-icon.svg" 
                        alt="VS Code" 
                        className="h-4 w-4"
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in VS Code</p>
                  </TooltipContent>
                </Tooltip>

                {onOpenInFileManager && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-black"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInFileManager(repo.path);
                        }}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open in File Manager</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={repo.is_pinned}
                      onPressedChange={() => {
                        onTogglePin?.(repo.path);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className={`h-8 px-2 shadow-xs border-1 ${
                        repo.is_pinned ? "opacity-100 shadow-md hover:shadow-lg hover:bg-muted/50" : "opacity-0 group-hover:opacity-100 "
                      } transition-opacity`}
                    >
                      <Pin className="h-4 w-4" />
                       {/* <span>{repo.is_pinned ? "Unpin" : ""}</span> */}
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{repo.is_pinned ? "Unpin repository" : "Pin repository"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="text-xs text-muted-foreground text-right">
                <div>Last commit:</div>
                <div>{formatDate(repo.last_commit_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Pinned Repositories Section */}
        {pinnedRepositories.length > 0 && (
          <div className="border bg-amber-50">
            <div className="bg-amber-50 px-4 pt-2">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-amber-600" fill="currentColor" />
                <h2 className="text-sm font-medium text-amber-800">
                  Pinned Repositories ({pinnedRepositories.length})
                </h2>
              </div>
            </div>
            <ul className='m-2 border-1 rounded-xl bg-background shadow-sm'>
              {pinnedRepositories.map(renderRepository)}
            </ul>
          </div>
        )}
        
        {/* Regular Repositories Section */}
        {unpinnedRepositories.length > 0 && (
          <div className="border bg-muted/50">
            {pinnedRepositories.length > 0 && (
              <div className="bg-muted/50 px-4 pt-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  All Repositories ({unpinnedRepositories.length})
                </h2>
              </div>
            )}
            <ul className='m-2 border-1 rounded-xl bg-background shadow-sm'>
              {unpinnedRepositories.map(renderRepository)}
            </ul>
          </div>
        )}
      </div>
      
      {/* Collection Assignment Dialog */}
      {selectedRepository && (
        <CollectionAssignmentDialog
          isOpen={collectionDialogOpen}
          onClose={() => {
            setCollectionDialogOpen(false);
            setSelectedRepository(null);
          }}
          repositoryPath={selectedRepository.path}
          repositoryName={selectedRepository.name}
          onCollectionChange={() => {
            // Refresh the collection badges by re-rendering
            // The CollectionBadges component will automatically update
            onCollectionChange?.();
          }}
        />
      )}
    </>
  );
};
