import { useRepositoryManager } from './hooks/useRepositoryManager';
import { RepositoryList } from './components/RepositoryList';
import { RepositoryDetail } from './components/RepositoryDetailView';
import { ScanProgress } from './components/ScanProgress';
import { invoke } from '@tauri-apps/api/core';
import "./App.css";

function App() {
  const {
    repositories,
    selectedRepo,
    currentView,
    directoryListing,
    isScanning,
    scanProgress,
    error,
    scanRepositories,
    openInVSCode,
    refreshRepository,
    navigateToRepository,
    navigateBack,
  } = useRepositoryManager();

  console.log('App render - repositories:', repositories, 'isScanning:', isScanning, 'error:', error);

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'list' ? (
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
            onRepositoryClick={navigateToRepository}
            onOpenInVSCode={openInVSCode}
            onRefresh={refreshRepository}
            isLoading={isScanning && !scanProgress}
          />
        </div>
      ) : (
        // Repository Detail View
        selectedRepo && (
          <RepositoryDetail
            repository={selectedRepo}
            directoryListing={directoryListing}
            onBack={navigateBack}
            onOpenInVSCode={openInVSCode}
            onRefresh={refreshRepository}
            isLoading={isScanning}
          />
        )
      )}
    </div>
  );
}

export default App;
