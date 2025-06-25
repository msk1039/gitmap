import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { GitRepository, DirectoryListing } from '../types/repository';
import { RepositoryDetail } from '../components/RepositoryDetailView';
import { useRepositoryManager } from '../hooks/useRepositoryManager';
import { Navigation } from '../components/Navigation';
import { GitBranchIcon } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export const RepositoryPage: React.FC = () => {
  const { repoName } = useParams<{ repoName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openInVSCode, openInFileManager, refreshRepository, deleteRepository } = useRepositoryManager();
  
  const [repository, setRepository] = useState<GitRepository | null>(null);
  const [directoryListing, setDirectoryListing] = useState<DirectoryListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repoPath = searchParams.get('path');

  useEffect(() => {
    if (!repoName || !repoPath) {
      navigate('/');
      return;
    }

    const loadRepositoryDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load repository details
        const repoDetails = await invoke<GitRepository>('refresh_repository', {
          repoPath: repoPath
        });
        setRepository(repoDetails);

        // Load directory listing
        const listing = await invoke<DirectoryListing>('list_directory_contents', {
          repoPath: repoPath
        });
        setDirectoryListing(listing);
      } catch (err) {
        console.error('Error loading repository details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load repository details');
      } finally {
        setIsLoading(false);
      }
    };

    loadRepositoryDetails();
  }, [repoName, repoPath, navigate]);

  const handleRefresh = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      
      // Refresh repository data
      await refreshRepository(path);
      
      // Reload directory listing
      const listing = await invoke<DirectoryListing>('list_directory_contents', {
        repoPath: path
      });
      setDirectoryListing(listing);
    } catch (err) {
      console.error('Error refreshing repository:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh repository');
    } finally {
      setIsLoading(false);
    }
  }, [refreshRepository]);

  const handleDeleteRepository = useCallback(async (repoPath: string) => {
    try {
      await deleteRepository(repoPath);
      // Navigate back to home page after successful deletion
      navigate('/');
    } catch (err) {
      console.error('Failed to delete repository:', err);
      throw err; // Re-throw so the dialog can handle the error
    }
  }, [deleteRepository, navigate]);

  if (isLoading) {
    return (
      <div className="h-full grow flex flex-col font-mono">
        {/* Header */}
        <header className="border-b">
          <div className="flex h-12 items-center justify-between">
            <div className="flex justify-center items-center gap-2 w-32 border-r h-full">
              <GitBranchIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">gitlocal</span>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center flex-1 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link 
                        to="/"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium">
                      {repoName || 'Loading...'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center w-48 border-l h-12 justify-center">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-3rem)] w-full items-stretch">
          <aside className="w-32 border-r"></aside>
          <main className="h-full grow flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-lg">Loading repository details...</span>
            </div>
          </main>
          <aside className="w-32 border-l"></aside>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full grow flex flex-col font-mono">
        {/* Header */}
        <header className="border-b fixed top-0 left-0 right-0 z-10 bg-transparent backdrop-blur-md">
          <div className="flex h-12 items-center justify-between">
            <div className="flex justify-center items-center gap-2 w-32 border-r h-full">
              <Link 
                to="/"
                className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
              >
                <GitBranchIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">gitlocal</span>

              </Link>
            </div>
            
            {/* Breadcrumbs */}
            <div className="flex items-center flex-1 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link 
                        to="/"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium">
                      {repoName || 'Error'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            <div className="flex items-center w-48 border-l h-12 justify-center">
              <span className="text-xs text-muted-foreground">Error</span>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-3rem)] w-full items-stretch">
          <aside className="w-32 border-r"></aside>
          <main className="h-full grow flex items-center justify-center">
            <div className="max-w-md text-center space-y-4">
              <h2 className="text-xl font-semibold text-destructive">Error Loading Repository</h2>
              <p className="text-muted-foreground">{error}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </main>
          <aside className="w-32 border-l"></aside>
        </div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="h-full grow flex flex-col font-mono">
        {/* Header */}
        <header className="border-b">
          <div className="flex h-12 items-center justify-between">
            <div className="flex justify-center items-center gap-2 w-32 border-r h-full">
              <GitBranchIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">gitlocal</span>
            </div>
            <div className="flex items-center w-48 border-l h-12 justify-center">
              <span className="text-xs text-muted-foreground">Not Found</span>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-3rem)] w-full items-stretch">
          <aside className="w-32 border-r"></aside>
          <main className="h-full grow flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Repository Not Found</h2>
              <p className="text-muted-foreground">The requested repository could not be found.</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go Back to Home
              </button>
            </div>
          </main>
          <aside className="w-32 border-l"></aside>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full grow flex flex-col font-mono">
      {/* Navigation */}
      <Navigation repositoryCount={0} />

      {/* Repository-specific breadcrumbs */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-6 py-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link 
                    to="/"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">
                  {repository?.name || repoName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-6rem)] w-full items-stretch">
        <aside className="w-32 border-r"></aside>
        <main className="h-full grow">
          <RepositoryDetail
            repository={repository}
            directoryListing={directoryListing}
            onOpenInVSCode={openInVSCode}
            onOpenInFileManager={openInFileManager}
            onRefresh={handleRefresh}
            isLoading={isLoading}
            onDeleteRepository={handleDeleteRepository}
          />
        </main>
        <aside className="w-32 border-l"></aside>
      </div>
    </div>
  );
};
