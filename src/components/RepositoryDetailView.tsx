import React from 'react';
import { GitRepository, DirectoryListing, FileEntry } from '../types/repository';

interface RepositoryDetailProps {
  repository: GitRepository;
  directoryListing: DirectoryListing | null;
  onBack: () => void;
  onOpenInVSCode: (repoPath: string) => void;
  onRefresh: (repoPath: string) => void;
  isLoading?: boolean;
}

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const getFileIcon = (entry: FileEntry): string => {
  if (entry.is_directory) {
    return '📁';
  }
  
  const extension = entry.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return '📄';
    case 'json':
      return '📋';
    case 'md':
    case 'mdx':
      return '📝';
    case 'css':
    case 'scss':
    case 'sass':
      return '🎨';
    case 'html':
    case 'htm':
      return '🌐';
    case 'py':
      return '🐍';
    case 'rs':
      return '🦀';
    case 'go':
      return '🐹';
    case 'java':
      return '☕';
    case 'cpp':
    case 'cc':
    case 'cxx':
      return '⚙️';
    case 'c':
      return '🔧';
    case 'sh':
    case 'bash':
      return '🔨';
    case 'yml':
    case 'yaml':
      return '⚙️';
    case 'xml':
      return '📊';
    case 'sql':
      return '🗃️';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return '🖼️';
    case 'pdf':
      return '📕';
    case 'zip':
    case 'tar':
    case 'gz':
      return '📦';
    default:
      return '📄';
  }
};

export const RepositoryDetail: React.FC<RepositoryDetailProps> = ({
  repository,
  directoryListing,
  onBack,
  onOpenInVSCode,
  onRefresh,
  isLoading = false
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="mr-2">←</span>
              Back
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">
              {repository.name}
            </h1>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => onOpenInVSCode(repository.path)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open in VS Code
            </button>
            <button
              onClick={() => onRefresh(repository.path)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Browser - Left Side */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-lg font-semibold text-gray-900">Files</h2>
                <p className="text-sm text-gray-600">{repository.path}</p>
              </div>
              
              <div className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading files...</span>
                  </div>
                ) : directoryListing ? (
                  <div className="divide-y divide-gray-100">
                    {directoryListing.entries.map((entry, index) => (
                      <div
                        key={`${entry.name}-${index}`}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg mr-3">{getFileIcon(entry)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.name}
                          </p>
                          {entry.modified && (
                            <p className="text-xs text-gray-500">
                              Modified {new Date(entry.modified).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {!entry.is_directory && entry.size && (
                          <span className="text-sm text-gray-500">
                            {formatFileSize(entry.size)}
                          </span>
                        )}
                      </div>
                    ))}
                    
                    {directoryListing.entries.length === 0 && (
                      <div className="px-4 py-12 text-center text-gray-500">
                        No files found in this directory
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center text-gray-500">
                    Unable to load directory contents
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Repository Info - Right Side */}
          <div className="space-y-6">
            {/* Repository Stats */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Info</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Size</p>
                  <p className="text-lg text-gray-900">{(repository.size_mb / 1024).toFixed(2)} GB</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Branch</p>
                  <p className="text-lg text-gray-900">{repository.current_branch || 'Unknown'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Commits</p>
                  <p className="text-lg text-gray-900">{repository.commit_count.toLocaleString()}</p>
                </div>
                
                {repository.last_commit_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Commit</p>
                    <p className="text-lg text-gray-900">
                      {new Date(repository.last_commit_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {repository.remote_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Remote URL</p>
                    <a 
                      href={repository.remote_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 break-all"
                    >
                      {repository.remote_url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Branches */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Branches ({repository.branches.length})
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {repository.branches.map(branch => (
                  <div
                    key={branch}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      branch === repository.current_branch 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {branch === repository.current_branch && (
                      <span className="mr-2">●</span>
                    )}
                    {branch}
                  </div>
                ))}
              </div>
            </div>

            {/* File Types */}
            {Object.keys(repository.file_types).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">File Types</h3>
                
                <div className="space-y-2">
                  {Object.entries(repository.file_types)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([ext, count]) => (
                    <div key={ext} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">.{ext}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
