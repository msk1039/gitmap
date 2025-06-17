import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoryManager } from '../hooks/useRepositoryManager';
import { RepositoryList } from '../components/RepositoryList';
import { ScanProgress } from '../components/ScanProgress';
import { Button } from "@/components/ui/button";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    repositories,
    isScanning,
    scanProgress,
    error,
    scanRepositories,
    openInVSCode,
    refreshRepository,
  } = useRepositoryManager();

  const handleRepositoryClick = (repoPath: string, repoName: string) => {
    // Navigate to the repository detail page
    navigate(`/repository/${encodeURIComponent(repoName)}?path=${encodeURIComponent(repoPath)}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🗂️ Git Repository Manager
        </h1>
        <p className="text-gray-600">
          Discover and manage your local Git repositories
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Scan Progress */}
      {isScanning && scanProgress && (
        <ScanProgress progress={scanProgress} />
      )}

      {/* Controls */}
      <div className="mb-6">
        <Button
          onClick={() => scanRepositories()}
          disabled={isScanning}
          className="flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mr-4"
        >
          <span className="mr-2">🔍</span>
          {isScanning ? 'Scanning...' : 'Scan Repositories'}
        </Button>
        
        {repositories.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Found {repositories.length} repositories
          </p>
        )}
      </div>

      {/* Repository List */}
      <RepositoryList
        repositories={repositories}
        onRepositoryClick={handleRepositoryClick}
        onOpenInVSCode={openInVSCode}
        onRefresh={refreshRepository}
        isLoading={isScanning && !scanProgress}
      />
    </div>
  );
};
