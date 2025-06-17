import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { GitRepository, DirectoryListing } from '../types/repository';
import { RepositoryDetail } from '../components/RepositoryDetailView';
import { useRepositoryManager } from '../hooks/useRepositoryManager';

export const RepositoryPage: React.FC = () => {
  const { repoName } = useParams<{ repoName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openInVSCode, refreshRepository } = useRepositoryManager();
  
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

  const handleRefresh = async (path: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg text-gray-600">Loading repository details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Repository</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Repository Not Found</h2>
          <p className="text-gray-600 mb-4">The requested repository could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <RepositoryDetail
      repository={repository}
      directoryListing={directoryListing}
      onOpenInVSCode={openInVSCode}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    />
  );
};
