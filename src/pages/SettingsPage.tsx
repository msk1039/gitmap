import React, { useState } from 'react';
import { useRepositoryManager } from '../hooks/useRepositoryManager';
import { Navigation } from '../components/Navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const SettingsPage: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { clearCache, cacheInfo, loadCacheInfo } = useRepositoryManager();

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      await clearCache();
      await loadCacheInfo(); // Refresh cache info
      toast.success("Cache cleared successfully!", {
        description: "All repository data has been removed from local storage.",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Failed to clear cache", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        duration: 5000,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="h-full grow flex flex-col font-mono">
      {/* Navigation */}
      <Navigation repositoryCount={cacheInfo?.total_repositories || 0} />

      <div className="flex min-h-[calc(100vh-3rem)] w-full items-stretch mt-12">
        <aside className="md:w-32 w-4 border-r"></aside>
        
        <main className="h-full grow flex flex-col">
          <div className="mx-auto md:max-w-4xl w-full flex flex-col p-6">
            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your application preferences and data
              </p>
            </div>

            {/* Cache Information Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache Information
                </CardTitle>
                <CardDescription>
                  Current status of your local repository cache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cacheInfo ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Total Repositories</p>
                      <p className="text-2xl font-bold text-primary">{cacheInfo.total_repositories}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Valid Repositories</p>
                      <p className="text-2xl font-bold text-green-600">{cacheInfo.valid_repositories}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Invalid Repositories</p>
                      <p className="text-2xl font-bold text-red-600">{cacheInfo.invalid_repositories}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Cache Size</p>
                      <p className="text-2xl font-bold text-blue-600">{formatFileSize(cacheInfo.cache_file_size)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">Loading cache information...</p>
                  </div>
                )}
                
                {cacheInfo && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Last updated: {formatDate(cacheInfo.last_updated)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Manage your local repository data and cache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Clear All Data</h3>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete all cached repository data, including pinned repositories, 
                    scan paths, and repository metadata. You'll need to rescan your repositories after clearing the cache.
                  </p>
                  
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      This action cannot be undone. All your pinned repositories and custom scan paths will be lost.
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={isClearing}
                        className="mt-4"
                      >
                        {isClearing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear All Data
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>This action cannot be undone. This will permanently delete:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>All cached repository data</li>
                            <li>Your pinned repositories</li>
                            <li>Custom scan paths</li>
                            <li>Repository metadata and statistics</li>
                          </ul>
                          <p className="font-medium">
                            You will need to rescan your repositories to use the application again.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearData}
                          disabled={isClearing}
                          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                          {isClearing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Clearing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Yes, clear all data
                            </>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <aside className="md:w-32 w-4 border-l"></aside>
      </div>
    </div>
  );
};
