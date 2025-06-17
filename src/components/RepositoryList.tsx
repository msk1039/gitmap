import React from 'react';
import { GitRepository } from '../types/repository';

interface RepositoryListProps {
  repositories: GitRepository[];
  onRepositoryClick?: (repo: GitRepository) => void;
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
      .slice(0, 3)
      .map(([ext, count]) => `${ext} (${count})`)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
        <p className="text-gray-500">
          Click "Quick Scan" to load from cache or "Full Rescan" to search your entire disk.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {repositories.map((repo) => (
        <div 
          key={repo.path}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <div className="text-4xl mr-4">📁</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{repo.name}</h3>
                <p className="text-sm text-gray-500 truncate mb-2">{repo.path}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <span>📊 {formatSize(repo.size_mb)}</span>
                  <span>🌿 {repo.current_branch || 'Unknown branch'}</span>
                  <span>📝 {repo.commit_count} commits</span>
                  <span className={`px-2 py-1 rounded ${repo.is_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {repo.is_valid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onOpenInVSCode(repo.path)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Open in VS Code
              </button>
              {onRefresh && (
                <button
                  onClick={() => onRefresh(repo.path)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Refresh
                </button>
              )}
              {onRepositoryClick && (
                <button
                  onClick={() => onRepositoryClick(repo)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Details
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="text-gray-600">📅 Last commit: {formatDate(repo.last_commit_date)}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-gray-600">🔍 Last analyzed: {formatDate(repo.last_analyzed)}</span>
            </div>
            
            {getTopFileTypes(repo.file_types) && (
              <div className="text-gray-500">
                <span>📄 File types: {getTopFileTypes(repo.file_types)}</span>
              </div>
            )}

            {repo.remote_url && (
              <div className="text-gray-500">
                <span>🔗 Remote: </span>
                <a 
                  href={repo.remote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 truncate"
                >
                  {repo.remote_url}
                </a>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
