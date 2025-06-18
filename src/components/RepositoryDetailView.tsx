import React from 'react';
import { GitRepository, DirectoryListing } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RepositoryFileList } from './RepositoryFileList';
import { ReadmeRenderer } from './ReadmeRenderer';
import { 
  GitBranch, 
  ExternalLink, 
  RefreshCw,
  FolderOpen
} from "lucide-react";

interface RepositoryDetailProps {
  repository: GitRepository;
  directoryListing: DirectoryListing | null;
  onOpenInVSCode: (repoPath: string) => void;
  onOpenInFileManager?: (repoPath: string) => void;
  onRefresh: (repoPath: string) => void;
  isLoading?: boolean;
}

export const RepositoryDetail: React.FC<RepositoryDetailProps> = ({
  repository,
  directoryListing,
  onOpenInVSCode,
  onOpenInFileManager,
  onRefresh,
  isLoading = false
}) => {
  return (
    <div className="p-4 mx-auto md:max-w-7xl w-full flex flex-col gap-4">
      {/* Repository name and controls row */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">{repository.name}</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <GitBranch className="h-3 w-3" />
              {repository.current_branch || 'Unknown'}
            </Badge>
            {/* <Badge variant={repository.is_valid ? "default" : "destructive"}>
              {repository.is_valid ? 'Valid' : 'Invalid'}
            </Badge> */}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onOpenInVSCode(repository.path)}
              size="sm"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in VS Code
            </Button>
            {onOpenInFileManager && (
              <Button
                onClick={() => onOpenInFileManager(repository.path)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Open in Files
              </Button>
            )}
            <Button
              onClick={() => onRefresh(repository.path)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-4 gap-8">
        {/* File Browser and README */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="border">
            <RepositoryFileList
              directoryListing={directoryListing}
              isLoading={isLoading}
            />
          </div>

          {/* README Renderer */}
          <ReadmeRenderer repositoryPath={repository.path} />
        </div>

        {/* Repository Info Sidebar */}
        <div className="col-span-1 flex flex-col gap-2">
          {/* About Section */}
          <section className="flex flex-col gap-2">
            <div>
              <h2 className="font-bold">About</h2>
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Size</p>
                  <p className="text-sm">{(repository.size_mb / 1024).toFixed(2)} GB</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Branch</p>
                  <p className="text-sm">{repository.current_branch || 'Unknown'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Commits</p>
                  <p className="text-sm">{repository.commit_count.toLocaleString()}</p>
                </div>
                
                {repository.last_commit_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Commit</p>
                    <p className="text-sm">
                      {new Date(repository.last_commit_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {repository.remote_url && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remote URL</p>
                    <a 
                      href={repository.remote_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {repository.remote_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* File Types as badges */}
            {Object.keys(repository.file_types).length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(repository.file_types)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([ext, count]) => (
                    <Badge key={ext} variant="secondary" className="text-xs">
                      .{ext} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Branches Section */}
          {repository.branches.length > 0 && (
            <section className="space-y-2 mt-6">
              <h3 className="font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Branches ({repository.branches.length})
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {repository.branches.slice(0, 10).map(branch => (
                  <div
                    key={branch}
                    className={`px-2 py-1 rounded text-xs ${
                      branch === repository.current_branch 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {branch === repository.current_branch && (
                      <span className="mr-1">●</span>
                    )}
                    {branch}
                  </div>
                ))}
                {repository.branches.length > 10 && (
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    +{repository.branches.length - 10} more branches
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
