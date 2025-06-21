import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Folder, Search, AlertCircle } from "lucide-react";
import { GitRepository, ScanPath } from '../types/repository';
import { invoke } from '@tauri-apps/api/core';

interface ScanDirectoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: (selectedPaths: string[]) => void;
  isScanning?: boolean;
  repositories?: GitRepository[]; // Add repositories to update scan stats
}

export const ScanDirectoryManager: React.FC<ScanDirectoryManagerProps> = ({
  isOpen,
  onClose,
  onStartScan,
  isScanning = false,
  repositories = []
}) => {
  const [scanPaths, setScanPaths] = useState<ScanPath[]>([]);
  const [newPath, setNewPath] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Calculate repository statistics for each scan path
  const updateScanPathStatistics = (paths: ScanPath[]): ScanPath[] => {
    return paths.map(scanPath => {
      // Count repositories that are within this scan path
      const reposInPath = repositories.filter(repo => 
        repo.path.startsWith(scanPath.path)
      );
      
      // Find the most recent scan date from repositories in this path
      const lastScannedDates = reposInPath
        .map(repo => repo.last_analyzed)
        .filter(date => date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      return {
        ...scanPath,
        repository_count: reposInPath.length,
        last_scanned: lastScannedDates.length > 0 ? lastScannedDates[0] : scanPath.last_scanned
      };
    });
  };

  // Update scan path statistics when repositories change
  useEffect(() => {
    if (repositories.length > 0) {
      setScanPaths(prev => updateScanPathStatistics(prev));
    }
  }, [repositories]);

  // Load saved scan paths from backend on component mount
  useEffect(() => {
    const loadScanPaths = async () => {
      try {
        const savedPaths = await invoke<ScanPath[]>('get_scan_paths');
        if (savedPaths.length > 0) {
          const pathsWithStats = updateScanPathStatistics(savedPaths);
          setScanPaths(pathsWithStats);
          // Select all paths by default
          setSelectedPaths(new Set(pathsWithStats.map(p => p.path)));
        } else {
          setDefaultPaths();
        }
      } catch (err) {
        console.error('Failed to load saved scan paths:', err);
        // Set default paths if no saved paths
        setDefaultPaths();
      }
    };
    
    loadScanPaths();
  }, [repositories]); // Add repositories as dependency so it updates when repositories change

  const setDefaultPaths = async () => {
    const defaultPaths: ScanPath[] = [
      { path: '/Users', repository_count: 0 },
      { path: '/opt', repository_count: 0 },
      { path: '/usr/local', repository_count: 0 },
    ];
    
    // Add default paths to backend
    for (const defaultPath of defaultPaths) {
      try {
        await invoke('add_scan_path', { path: defaultPath.path });
      } catch (err) {
        console.warn(`Failed to add default path ${defaultPath.path}:`, err);
      }
    }
    
    const pathsWithStats = updateScanPathStatistics(defaultPaths);
    setScanPaths(pathsWithStats);
    setSelectedPaths(new Set(pathsWithStats.map(p => p.path)));
  };

  // Remove localStorage effect since we're using backend now

  const handleAddPath = async () => {
    if (!newPath.trim()) {
      setError('Please enter a valid path');
      return;
    }

    const trimmedPath = newPath.trim();
    
    // Check if path already exists
    if (scanPaths.some(p => p.path === trimmedPath)) {
      setError('This path is already in the list');
      return;
    }

    try {
      // Add to backend
      await invoke('add_scan_path', { path: trimmedPath });
      
      // Update local state
      const newScanPath: ScanPath = {
        path: trimmedPath,
        repository_count: 0
      };

      const updatedPaths = [...scanPaths, newScanPath];
      const pathsWithStats = updateScanPathStatistics(updatedPaths);
      setScanPaths(pathsWithStats);
      setSelectedPaths(prev => new Set([...prev, trimmedPath]));
      setNewPath('');
      setError(null);
    } catch (err) {
      setError(`Failed to add path: ${err}`);
    }
  };

  const handleRemovePath = async (pathToRemove: string) => {
    try {
      // Remove from backend
      await invoke('remove_scan_path', { path: pathToRemove });
      
      // Update local state
      setScanPaths(prev => prev.filter(p => p.path !== pathToRemove));
      setSelectedPaths(prev => {
        const newSet = new Set(prev);
        newSet.delete(pathToRemove);
        return newSet;
      });
    } catch (err) {
      setError(`Failed to remove path: ${err}`);
    }
  };

  const handlePathToggle = (path: string) => {
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedPaths(new Set(scanPaths.map(p => p.path)));
  };

  const handleSelectNone = () => {
    setSelectedPaths(new Set());
  };

  const handleStartScan = () => {
    if (selectedPaths.size === 0) {
      setError('Please select at least one path to scan');
      return;
    }
    
    onStartScan(Array.from(selectedPaths));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPath();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Scan Directory Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
            {/* Add New Path Section */}
            <div className="space-y-2">
            <h3 className="text-sm font-medium">Add New Scan Path</h3>
            <div className="flex gap-2">
              <Input
              placeholder="Enter path to scan"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 font-mono"
              />
              <Button onClick={handleAddPath} size="sm">
              <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
              <div className="flex items-start gap-2"></div>
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs text-blue-800">
                Use full absolute paths only. Relative paths (~) are not supported.
                </p>
                <p className="text-xs text-blue-700">
                (e.g., /Users/username/Projects or C:\Users\username\Projects)
                </p>
              </div>
              </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
              </div>
            )}
            </div>

          {/* Scan Paths List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Scan Paths ({scanPaths.length})</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAll}
                  disabled={scanPaths.length === 0}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectNone}
                  disabled={selectedPaths.size === 0}
                >
                  Select None
                </Button>
              </div>
            </div>

            {scanPaths.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No scan paths configured</p>
                <p className="text-xs">Add a directory path above to get started</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {scanPaths.map((scanPath) => {
                  const isSelected = selectedPaths.has(scanPath.path);
                  
                  return (
                    <div
                      key={scanPath.path}
                      className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handlePathToggle(scanPath.path)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate">{scanPath.path}</div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {scanPath.last_scanned && (
                              <span>Last scanned: {new Date(scanPath.last_scanned).toLocaleDateString()}</span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {scanPath.repository_count || 0} repo{(scanPath.repository_count || 0) !== 1 ? 's' : ''} found
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePath(scanPath.path);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Summary */}
          {/* {selectedPaths.size > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">Selected for scanning:</span> {selectedPaths.size} path{selectedPaths.size !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Array.from(selectedPaths).join(', ')}
              </div>
              {(() => {
                const totalRepos = scanPaths
                  .filter(path => selectedPaths.has(path.path))
                  .reduce((sum, path) => sum + (path.repository_count || 0), 0);
                
                if (totalRepos > 0) {
                  return (
                    <div className="text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-xs">
                        {totalRepos} repositories currently in selected paths
                      </Badge>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )} */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isScanning}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartScan} 
            disabled={selectedPaths.size === 0 || isScanning}
            className="gap-2"
          >
            {isScanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Start Scan ({selectedPaths.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
