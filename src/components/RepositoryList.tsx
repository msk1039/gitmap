import React, { useEffect, useState } from 'react';
import { CleanableItem, CleanupDeletionResult, GitRepository } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CollectionAssignmentDialog } from './CollectionAssignmentDialog';
import { CollectionBadges } from './CollectionBadges';
import { formatFileSize, formatSize } from '../lib/formatSize';
import { ChevronLeft, ChevronRight, GitBranch, Folder, FolderOpen, Pin, Tags, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { HardDrive } from 'lucide-react';
import { GitCommitVertical } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { LanguageIcons } from './LanguageIcons';


interface RepositoryListProps {
  repositories: GitRepository[];
  onRepositoryClick?: (repoPath: string, repoName: string) => void;
  onOpenInVSCode: (path: string) => void;
  onOpenInFileManager?: (path: string) => void;
  onTogglePin?: (repoPath: string) => void;
  onCollectionChange?: () => void;
  collectionRefreshTrigger?: number;
  isLoading?: boolean;
  isInitialLoad?: boolean; // Add this to distinguish initial load from collection switching
  onDeleteCleanableItems?: (repoPath: string, selectedPaths: string[]) => Promise<CleanupDeletionResult>;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({ 
  repositories, 
  onRepositoryClick, 
  onOpenInVSCode,
  onOpenInFileManager,
  onTogglePin,
  onCollectionChange,
  collectionRefreshTrigger,
  isLoading = false,
  isInitialLoad = false,
  onDeleteCleanableItems
}) => {
  const repositoriesPerPage = 20;
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<GitRepository | null>(null);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [repositoryToClean, setRepositoryToClean] = useState<GitRepository | null>(null);
  const [cleanableItems, setCleanableItems] = useState<CleanableItem[]>([]);
  const [selectedCleanablePaths, setSelectedCleanablePaths] = useState<Set<string>>(new Set());
  const [isLoadingCleanableItems, setIsLoadingCleanableItems] = useState(false);
  const [isDeletingCleanableItems, setIsDeletingCleanableItems] = useState(false);
  const [deletingRepositoryPaths, setDeletingRepositoryPaths] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [repositories]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const handleOpenCleanupDialog = (repo: GitRepository) => {
    if (!onDeleteCleanableItems) return;

    setRepositoryToClean(repo);
    setCleanupDialogOpen(true);
  };

  const handleCleanupDialogOpenChange = (open: boolean) => {
    if (isDeletingCleanableItems) return;

    setCleanupDialogOpen(open);
    if (!open) {
      setRepositoryToClean(null);
      setCleanableItems([]);
      setSelectedCleanablePaths(new Set());
    }
  };

  useEffect(() => {
    if (!cleanupDialogOpen || !repositoryToClean) return;

    let cancelled = false;
    setIsLoadingCleanableItems(true);
    setCleanableItems([]);
    setSelectedCleanablePaths(new Set());

    void invoke<CleanableItem[]>('list_cleanable_items', { repoPath: repositoryToClean.path })
      .then((items) => {
        if (cancelled) return;
        setCleanableItems(items);
        setSelectedCleanablePaths(new Set(items.map((item) => item.path)));
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(`Failed to inspect cleanable items: ${error}`);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCleanableItems(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cleanupDialogOpen, repositoryToClean]);

  const toggleCleanableItem = (path: string, checked: boolean) => {
    setSelectedCleanablePaths((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const maxCleanableBytes = cleanableItems.reduce((total, item) => total + item.size_bytes, 0);
  const selectedCleanableBytes = cleanableItems
    .filter((item) => selectedCleanablePaths.has(item.path))
    .reduce((total, item) => total + item.size_bytes, 0);

  const handleDeleteSelectedCleanableItems = async () => {
    if (!repositoryToClean || !onDeleteCleanableItems || selectedCleanablePaths.size === 0) return;

    setIsDeletingCleanableItems(true);
    setDeletingRepositoryPaths((current) => new Set(current).add(repositoryToClean.path));
    try {
      const result = await onDeleteCleanableItems(repositoryToClean.path, [...selectedCleanablePaths]);
      toast.success(`Freed ${formatFileSize(result.deleted_size_bytes)} from ${repositoryToClean.name}`, {
        description: `${result.deleted_paths.length} item${result.deleted_paths.length === 1 ? '' : 's'} deleted`,
      });
      setCleanupDialogOpen(false);
      setRepositoryToClean(null);
      setCleanableItems([]);
      setSelectedCleanablePaths(new Set());
    } catch (error) {
      toast.error(`Failed to clean generated files: ${error}`);
    } finally {
      setIsDeletingCleanableItems(false);
      setDeletingRepositoryPaths((current) => {
        const next = new Set(current);
        next.delete(repositoryToClean.path);
        return next;
      });
    }
  };

  if (isLoading) {
    const loadingMessage = isInitialLoad ? "Loading repositories..." : "Filtering and organizing your collection";
    const loadingDescription = isInitialLoad ? "Discovering your Git repositories" : "Applying collection filters";
    
    return (
      <div className="space-y-4">
        <div className="border">
          {/* Loading indicator with spinner and message */}
          <div className="flex items-center justify-center w-full p-8 text-sm text-muted-foreground">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
              <div className="font-medium text-lg mb-2">{loadingMessage}</div>
              <div className="text-xs">{loadingDescription}</div>
            </div>
          </div>
          
          {/* Skeleton loading items for better UX */}
          <ul className="border-t">
            {[...Array(3)].map((_, i) => (
              <li key={i} className="border-b last:border-b-0">
                <div className="block p-4 animate-pulse">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-start flex-1">
                      <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-64 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-32"></div>
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

  // Keep pinned projects first, but only mount one small page at a time.
  const pinnedRepositories = repositories.filter(repo => repo.is_pinned);
  const unpinnedRepositories = repositories.filter(repo => !repo.is_pinned);
  const orderedRepositories = [...pinnedRepositories, ...unpinnedRepositories];
  const totalPages = Math.max(1, Math.ceil(orderedRepositories.length / repositoriesPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRepositories = orderedRepositories.slice(
    (safeCurrentPage - 1) * repositoriesPerPage,
    safeCurrentPage * repositoriesPerPage,
  );
  const paginatedPinnedRepositories = paginatedRepositories.filter(repo => repo.is_pinned);
  const paginatedUnpinnedRepositories = paginatedRepositories.filter(repo => !repo.is_pinned);

  const renderRepository = (repo: GitRepository) => {
    const isDeleting = deletingRepositoryPaths.has(repo.path);
    
    return (
      <li key={repo.path} className="border-b last:border-b-0 hover:shadow-sm transition-shadow bg-background/80 hover:bg-background relative">
        {/* Loading overlay while generated items are being deleted */}
        {isDeleting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded">
            <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg shadow-md border">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Cleaning generated files...</span>
            </div>
          </div>
        )}
        
        <div
          className={`block p-4 text-sm font-medium transition-colors cursor-pointer group ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}
          onClick={() => !isDeleting && onRepositoryClick?.(repo.path, repo.name)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-start justify-between flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="font-semibold truncate">{repo.name}</h3>
                {repo.is_pinned && (
                  <Pin className="h-3 w-3 text-amber-500 shrink-0" fill="currentColor" />
                )}
              </div>
              
                <div className="relative group/path pr-6 overflow-hidden">
                <div className="text-xs text-muted-foreground mb-2 truncate w-full hover:underline max-w-[500px]">
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
                <div className="flex items-center gap-1">
                  <GitCommitVertical className="h-3 w-3" />
                <span className='text-red-700'>{repo.commit_count} commits</span>
                </div>

                <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                <span className='text-sky-700'>{formatSize(repo.size_mb)}</span>
                </div>
                <LanguageIcons fileTypes={repo.file_types} />
              </div>
              
              {/* Collection badges */}
              <div className="mt-2">
                <CollectionBadges 
                  repositoryPath={repo.path} 
                  refreshTrigger={collectionRefreshTrigger} 
                  // allCollections={allCollections}
                />
              </div>
            </div>
            
            <div className="flex flex-col items-end min-w-32 shrink-0">
              <div className="flex gap-2 mb-2">
                   {/* <div className="">
                <CollectionBadges repositoryPath={repo.path} refreshTrigger={collectionRefreshTrigger} />
              </div> */}

                  {/* Cleanup Button - Only shown for repositories with known reproducible artifacts */}
                {repo.cleanable_info && repo.cleanable_info.total_size_bytes > 0 && onDeleteCleanableItems && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-700  border-dashed border border-red-400/50"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDeleting) {
                            handleOpenCleanupDialog(repo);
                          }
                        }}
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <div className='flex px-1 gap-1 items-center justify-center'><span className='text-sm font-medium'>Free up {formatFileSize(repo.cleanable_info.total_size_bytes)}</span></div>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isDeleting ? 'Cleaning...' : `Review ${repo.cleanable_info.item_count} cleanable item${repo.cleanable_info.item_count === 1 ? '' : 's'} (${formatFileSize(repo.cleanable_info.total_size_bytes)})`}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        repo.is_pinned ? "opacity-100 shadow-md hover:shadow-lg hover:bg-muted/50 border-1 border-amber-300 ring-2 ring-amber-100" : "opacity-0 group-hover:opacity-100 "
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
      <div className="space-y-4 ">
        {/* Pinned Repositories Section */}
        {paginatedPinnedRepositories.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/35 inset-shadow-sm inset-shadow-amber-200 dark:inset-shadow-amber-400/20 pb-2">
            <div className="bg-amber-50 dark:bg-amber-950/35 px-4 py-2 inset-shadow-sm inset-shadow-amber-300/50 dark:inset-shadow-amber-400/25">
              <div className="flex items-center gap-2 ">
                <Pin className="h-4 w-4 text-amber-600 dark:text-amber-300" fill="currentColor" />
                <h2 className="text-sm font-medium text-amber-800 dark:text-amber-100">
                  Pinned Repositories ({pinnedRepositories.length})
                </h2>
              </div>
            </div>
            <ul className='mx-2 border-1 rounded-xl bg-transparent shadow-sm overflow-hidden'>
              {paginatedPinnedRepositories.map(renderRepository)}
            </ul>
          </div>
        )}
        
        {/* Regular Repositories Section */}
        {paginatedUnpinnedRepositories.length > 0 && (
          <div className="bg-muted/50 inset-shadow-sm inset-shadow-gray-300 pb-2">

              <div className="bg-muted/50 px-4 py-2 inset-shadow-sm inset-shadow-gray-300">
                <h2 className="text-sm font-medium text-muted-foreground">
                  All Repositories ({unpinnedRepositories.length})
                </h2>
              </div>

            <ul className='mx-2 border-1 rounded-xl bg-transparent shadow-sm overflow-hidden'>
              {paginatedUnpinnedRepositories.map(renderRepository)}
            </ul>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border rounded-lg bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Showing {(safeCurrentPage - 1) * repositoriesPerPage + 1}–{Math.min(safeCurrentPage * repositoriesPerPage, orderedRepositories.length)} of {orderedRepositories.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="px-2 text-muted-foreground">Page {safeCurrentPage} of {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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

      {/* Selectable generated-files cleanup dialog */}
      {repositoryToClean && (
        <Dialog open={cleanupDialogOpen} onOpenChange={handleCleanupDialogOpenChange}>
          <DialogContent className="max-w-2xl" showCloseButton={!isDeletingCleanableItems}>
            <DialogHeader>
              <DialogTitle>Clean generated files</DialogTitle>
              <DialogDescription>
                Select reproducible dependencies, build outputs, and caches to permanently remove from "{repositoryToClean.name}". Source files, Git metadata, lockfiles, and tool configuration are not included.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Max deletable</div>
                <div className="mt-1 font-semibold">{formatFileSize(maxCleanableBytes)}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected</div>
                <div className="mt-1 font-semibold text-red-600">{formatFileSize(selectedCleanableBytes)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Cleanable items ({cleanableItems.length})</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLoadingCleanableItems || isDeletingCleanableItems || cleanableItems.length === 0}
                onClick={() => setSelectedCleanablePaths(new Set(
                  selectedCleanablePaths.size === cleanableItems.length ? [] : cleanableItems.map((item) => item.path),
                ))}
              >
                {selectedCleanablePaths.size === cleanableItems.length ? 'Clear all' : 'Select all'}
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border">
              {isLoadingCleanableItems ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Inspecting generated files…
                </div>
              ) : cleanableItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No cleanable items were found. The repository may have changed since it was last scanned.</div>
              ) : (
                <div className="divide-y">
                  {cleanableItems.map((item) => (
                    <label key={item.path} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedCleanablePaths.has(item.path)}
                        disabled={isDeletingCleanableItems}
                        onCheckedChange={(checked) => toggleCleanableItem(item.path, checked === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-sm">{item.relative_path}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{item.category} · {item.is_directory ? 'Folder' : 'File'}</div>
                      </div>
                      <div className="shrink-0 text-sm font-medium">{formatFileSize(item.size_bytes)}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isDeletingCleanableItems}
                onClick={() => handleCleanupDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isLoadingCleanableItems || isDeletingCleanableItems || selectedCleanablePaths.size === 0}
                onClick={handleDeleteSelectedCleanableItems}
              >
                {isDeletingCleanableItems ? 'Cleaning…' : `Delete selected (${formatFileSize(selectedCleanableBytes)})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
