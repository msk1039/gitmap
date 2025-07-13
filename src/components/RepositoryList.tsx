import React, { useState } from 'react';
import { GitRepository } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CollectionAssignmentDialog } from './CollectionAssignmentDialog';
import { CollectionBadges } from './CollectionBadges';
import { formatSize } from '../lib/formatSize';
import { GitBranch, Folder, FolderOpen, Pin, Tags, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { HardDrive } from 'lucide-react';
import { GitCommitVertical } from 'lucide-react';


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
  onDeleteNodeModules?: (repoPath: string) => Promise<void>;
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
  onDeleteNodeModules
}) => {
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<GitRepository | null>(null);
  const [deleteNodeModulesDialogOpen, setDeleteNodeModulesDialogOpen] = useState(false);
  const [repositoryToDeleteNodeModules, setRepositoryToDeleteNodeModules] = useState<GitRepository | null>(null);
  const [isDeletingNodeModules, setIsDeletingNodeModules] = useState(false);
  const [deletingRepositoryPaths, setDeletingRepositoryPaths] = useState<Set<string>>(new Set());

  // Debug logging with performance timing
  console.log('🎨 RepositoryList rendered with:', repositories.length, 'repositories');
  console.log('Pinned repositories:', repositories.filter(r => r.is_pinned).length);
  console.log('Repositories data:', repositories.map(r => ({ name: r.name, pinned: r.is_pinned })));
  
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

  const handleDeleteNodeModules = async (repo: GitRepository) => {
    if (!onDeleteNodeModules) return;
    
    setRepositoryToDeleteNodeModules(repo);
    setDeleteNodeModulesDialogOpen(true);
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

  // Separate pinned and unpinned repositories
  const pinnedRepositories = repositories.filter(repo => repo.is_pinned);
  const unpinnedRepositories = repositories.filter(repo => !repo.is_pinned);

  const renderRepository = (repo: GitRepository) => {
    const topFileTypes = getTopFileTypes(repo.file_types);
    const isDeleting = deletingRepositoryPaths.has(repo.path);
    
    return (
      <li key={repo.path} className="border-b last:border-b-0 hover:shadow-sm transition-shadow bg-white/80 hover:bg-white relative">
        {/* Loading overlay when deleting node_modules */}
        {isDeleting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-md border">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Deleting node_modules...</span>
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
                {topFileTypes && <span>{topFileTypes}</span>}
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

                  {/* Delete Node Modules Button - Only show if repository has node_modules */}
                {repo.node_modules_info && repo.node_modules_info.count > 0 && onDeleteNodeModules && (
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
                            handleDeleteNodeModules(repo);
                          }
                        }}
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          // <div className='flex px-1 gap-1 items-center justify-center'><Trash2 className="h-3 w-3" /> <span className='text-sm'>node_modules</span></div>
                          <div className='flex px-1 gap-1 items-center justify-center'><span className='text-sm font-medium'>Free up {formatSize(repo.node_modules_info.total_size_mb)}</span></div>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isDeleting ? 'Deleting...' : `Delete node_modules (${formatSize(repo.node_modules_info.total_size_mb)})`}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

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
        {pinnedRepositories.length > 0 && (
          <div className="bg-amber-50 inset-shadow-sm inset-shadow-amber-200 pb-2">
            <div className="bg-amber-50 px-4 py-2 inset-shadow-sm inset-shadow-amber-300/50">
              <div className="flex items-center gap-2 ">
                <Pin className="h-4 w-4 text-amber-600" fill="currentColor" />
                <h2 className="text-sm font-medium text-amber-800">
                  Pinned Repositories ({pinnedRepositories.length})
                </h2>
              </div>
            </div>
            <ul className='mx-2 border-1 rounded-xl bg-transparent shadow-sm overflow-hidden'>
              {pinnedRepositories.map(renderRepository)}
            </ul>
          </div>
        )}
        
        {/* Regular Repositories Section */}
        {unpinnedRepositories.length > 0 && (
          <div className="bg-muted/50 inset-shadow-sm inset-shadow-gray-300 pb-2">

              <div className="bg-muted/50 px-4 py-2 inset-shadow-sm inset-shadow-gray-300">
                <h2 className="text-sm font-medium text-muted-foreground">
                  All Repositories ({unpinnedRepositories.length})
                </h2>
              </div>

            <ul className='mx-2 border-1 rounded-xl bg-transparent shadow-sm overflow-hidden'>
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

      {/* Delete node_modules Confirmation Dialog */}
      {repositoryToDeleteNodeModules && (
        <AlertDialog open={deleteNodeModulesDialogOpen} onOpenChange={setDeleteNodeModulesDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete node_modules?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the <code>node_modules</code> folder(s) in "{repositoryToDeleteNodeModules.name}". 
                {repositoryToDeleteNodeModules.node_modules_info && (
                  <span> This will free up {formatSize(repositoryToDeleteNodeModules.node_modules_info.total_size_mb)} of space.</span>
                )}
                <br /><br />
                This action cannot be undone, but you can reinstall dependencies by running <code>npm install</code> or <code>yarn install</code>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingNodeModules}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  if (repositoryToDeleteNodeModules && onDeleteNodeModules) {
                    setIsDeletingNodeModules(true);
                    setDeletingRepositoryPaths(prev => new Set(prev).add(repositoryToDeleteNodeModules.path));
                    try {
                      await onDeleteNodeModules(repositoryToDeleteNodeModules.path);
                      toast.success(`node_modules deleted successfully from ${repositoryToDeleteNodeModules.name}`);
                    } catch (error) {
                      toast.error(`Failed to delete node_modules: ${error}`);
                    } finally {
                      setIsDeletingNodeModules(false);
                      setDeletingRepositoryPaths(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(repositoryToDeleteNodeModules.path);
                        return newSet;
                      });
                      setDeleteNodeModulesDialogOpen(false);
                      setRepositoryToDeleteNodeModules(null);
                    }
                  }
                }}
                disabled={isDeletingNodeModules}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeletingNodeModules ? "Deleting..." : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
