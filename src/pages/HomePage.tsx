import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoryManager } from '../hooks/useRepositoryManager';
import { RepositoryList } from '../components/RepositoryList';
import { ScanProgress } from '../components/ScanProgress';
import { ScanDirectoryManager } from '../components/ScanDirectoryManager';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GitBranchIcon, Search, RefreshCw } from "lucide-react";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    repositories,
    isScanning,
    scanProgress,
    error,
    scanCustomPaths,
    refreshCache,
    openInVSCode,
    openInFileManager,
    refreshRepository,
  } = useRepositoryManager();

  const handleRepositoryClick = (repoPath: string, repoName: string) => {
    // Navigate to the repository detail page
    navigate(`/repository/${encodeURIComponent(repoName)}?path=${encodeURIComponent(repoPath)}`);
  };

  const handleShowScanDialog = () => {
    setShowScanDialog(true);
  };

  const handleCloseScanDialog = () => {
    setShowScanDialog(false);
  };

  const handleStartScan = (selectedPaths: string[]) => {
    setShowScanDialog(false);
    scanCustomPaths(selectedPaths);
  };

  return (
    <div className="h-full grow flex flex-col font-mono">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-12 items-center justify-between">
          <div className="flex justify-center items-center gap-2 w-32 border-r h-full">
            <GitBranchIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">gitlocal</span>
          </div>
          
          <div className="flex items-center gap-2 px-4">
            <Badge variant="secondary" className="text-xs">
              Local
            </Badge>
            <span className="text-xs text-muted-foreground">
              {repositories.length} repositories found
            </span>
          </div>

          <div className="flex items-center w-32 border-l h-12 justify-center">
            <span className="text-xs text-muted-foreground">
              Home
            </span>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3rem)] w-full items-stretch">
        <aside className="w-32 border-r"></aside>
        
        <main className="h-full grow flex flex-col">
          <div className="p-4 mx-auto md:max-w-7xl w-full flex flex-col gap-4">
            {/* Title and Controls Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Local Repositories</h1>
                  <p className="text-sm text-muted-foreground">
                    Discover and manage your local Git repositories
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleShowScanDialog}
                    disabled={isScanning}
                    size="sm"
                    className="gap-2"
                  >
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {isScanning ? 'Scanning...' : 'Scan Repositories'}
                  </Button>
                  <Button
                    onClick={refreshCache}
                    disabled={isScanning}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Cache
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <Button
                    onClick={() => setSearchQuery('')}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
                  <p className="text-sm">❌ {error}</p>
                </div>
              )}

              {/* Scan Progress */}
              {isScanning && scanProgress && (
                <ScanProgress progress={scanProgress} />
              )}
            </div>

            {/* Repository Grid */}
            <div className="w-full">
              <RepositoryList
                repositories={repositories}
                onRepositoryClick={handleRepositoryClick}
                onOpenInVSCode={openInVSCode}
                onOpenInFileManager={openInFileManager}
                onRefresh={refreshRepository}
                isLoading={isScanning && !scanProgress}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        </main>
        
        <aside className="w-32 border-l"></aside>
      </div>

      {/* Scan Directory Manager Dialog */}
      <ScanDirectoryManager
        isOpen={showScanDialog}
        onClose={handleCloseScanDialog}
        onStartScan={handleStartScan}
        isScanning={isScanning}
        repositories={repositories}
      />
    </div>
  );
};
