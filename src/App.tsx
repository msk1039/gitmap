import { useRepositoryManager } from './hooks/useRepositoryManager';
import { RepositoryList } from './components/RepositoryList';
import { ScanProgress } from './components/ScanProgress';
import { invoke } from '@tauri-apps/api/core';
import "./App.css";

function App() {
  const {
    repositories,
    selectedRepo,
    isScanning,
    scanProgress,
    error,
    setSelectedRepo,
    scanRepositories,
    openInVSCode,
    refreshRepository,
  } = useRepositoryManager();

  console.log('App render - repositories:', repositories, 'isScanning:', isScanning, 'error:', error);

  return (
    <div className="min-h-screen bg-gray-50">
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
          <button
            onClick={() => scanRepositories()}
            disabled={isScanning}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mr-4"
          >
            <span className="mr-2">🔍</span>
            {isScanning ? 'Scanning...' : 'Scan Repositories'}
          </button>
          
          <button
            onClick={async () => {
              try {
                console.log('Testing basic Tauri invoke...');
                const result = await invoke('get_cache_info');
                console.log('Cache info result:', result);
                alert('Tauri communication works! Check console for details.');
              } catch (err) {
                console.error('Error testing Tauri:', err);
                alert('Tauri communication failed: ' + err);
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Test Connection
          </button>
          
          {repositories.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              Found {repositories.length} repositories
            </p>
          )}
        </div>

        {/* Repository List */}
        <RepositoryList
          repositories={repositories}
          onRepositoryClick={setSelectedRepo}
          onOpenInVSCode={openInVSCode}
          onRefresh={refreshRepository}
          isLoading={isScanning && !scanProgress}
        />

        {/* Simple Repository Detail Modal */}
        {selectedRepo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedRepo.name}</h2>
                <button
                  onClick={() => setSelectedRepo(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3 text-sm">
                <p><strong>Path:</strong> {selectedRepo.path}</p>
                <p><strong>Size:</strong> {(selectedRepo.size_mb / 1024).toFixed(2)} GB</p>
                <p><strong>Current Branch:</strong> {selectedRepo.current_branch || 'Unknown'}</p>
                <p><strong>Commits:</strong> {selectedRepo.commit_count}</p>
                
                <div>
                  <strong>Branches ({selectedRepo.branches.length}):</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedRepo.branches.map(branch => (
                      <span 
                        key={branch}
                        className={`px-2 py-1 rounded text-xs ${
                          branch === selectedRepo.current_branch 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {branch}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedRepo.remote_url && (
                  <p>
                    <strong>Remote:</strong> 
                    <a 
                      href={selectedRepo.remote_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      {selectedRepo.remote_url}
                    </a>
                  </p>
                )}
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => openInVSCode(selectedRepo.path)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Open in VS Code
                </button>
                <button
                  onClick={() => refreshRepository(selectedRepo.path)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
