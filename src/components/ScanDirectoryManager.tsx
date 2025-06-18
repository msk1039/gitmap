import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Folder, Search, AlertCircle } from "lucide-react";
import { GitRepository } from '../types/repository';

interface ScanDirectoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: (selectedPaths: string[]) => void;
  isScanning?: boolean;
  repositories?: GitRepository[]; // Add repositories to update scan stats
}

interface ScanPath {
  path: string;
  lastScanned?: string;
  repositoryCount?: number;
}

export const ScanDirectoryManager: React.FC<ScanDirectoryManagerProps> = ({
  isOpen,
  onClose,
  onStartScan,
  isScanning = false,
  repositories = [] // TODO: Use for updating scan statistics
}) => {
  const [scanPaths, setScanPaths] = useState<ScanPath[]>([]);
  const [newPath, setNewPath] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Load saved scan paths from localStorage on component mount
  useEffect(() => {
    const savedPaths = localStorage.getItem('git-manager-scan-paths');
    if (savedPaths) {
      try {
        const paths = JSON.parse(savedPaths);
        setScanPaths(paths);
        // Select all paths by default
        setSelectedPaths(new Set(paths.map((p: ScanPath) => p.path)));
      } catch (err) {
        console.error('Failed to load saved scan paths:', err);
        // Set default paths if no saved paths
        setDefaultPaths();
      }
    } else {
      setDefaultPaths();
    }
  }, []);

  const setDefaultPaths = () => {
    const defaultPaths: ScanPath[] = [
      { path: '/Users', repositoryCount: 0 },
      { path: '/opt', repositoryCount: 0 },
      { path: '/usr/local', repositoryCount: 0 },
    ];
    
    setScanPaths(defaultPaths);
    setSelectedPaths(new Set(defaultPaths.map(p => p.path)));
  };

  // Save scan paths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('git-manager-scan-paths', JSON.stringify(scanPaths));
  }, [scanPaths]);

  const handleAddPath = () => {
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

    const newScanPath: ScanPath = {
      path: trimmedPath,
      repositoryCount: 0
    };

    setScanPaths(prev => [...prev, newScanPath]);
    setSelectedPaths(prev => new Set([...prev, trimmedPath]));
    setNewPath('');
    setError(null);
  };

  const handleRemovePath = (pathToRemove: string) => {
    setScanPaths(prev => prev.filter(p => p.path !== pathToRemove));
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      newSet.delete(pathToRemove);
      return newSet;
    });
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
                placeholder="Enter directory path (e.g., /Users/username/Projects)"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleAddPath} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
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
                            {scanPath.lastScanned && (
                              <span>Last scanned: {new Date(scanPath.lastScanned).toLocaleDateString()}</span>
                            )}
                            {scanPath.repositoryCount !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {scanPath.repositoryCount} repos found
                              </Badge>
                            )}
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
          {selectedPaths.size > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">Selected for scanning:</span> {selectedPaths.size} path{selectedPaths.size !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Array.from(selectedPaths).join(', ')}
              </div>
            </div>
          )}
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
