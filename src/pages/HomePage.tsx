import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoryManager } from '../hooks/useRepositoryManager';
import { GitRepository } from '../types/repository';
import { RepositoryList } from '../components/RepositoryList';
import { ScanProgress } from '../components/ScanProgress';
import { ScanDirectoryManager } from '../components/ScanDirectoryManager';
import { Navigation } from '../components/Navigation';
import { CollectionsSidebar } from '../components/CollectionsSidebar';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, ArrowUpDown } from "lucide-react";
import { invoke } from '@tauri-apps/api/core';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
type SortOption = 'name' | 'lastUpdated' | 'size';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [collectionRepositories, setCollectionRepositories] = useState<GitRepository[]>([]);
  const [collectionsRefreshTrigger, setCollectionsRefreshTrigger] = useState(0);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const {
    repositories,
    isScanning,
    scanProgress,
    error,
    scanCustomPaths,
    refreshCache,
    openInVSCode,
    openInFileManager,
    togglePin,
    loadCachedRepositories,
    refreshRepository,
  } = useRepositoryManager();

  const handleDeleteNodeModules = async (repoPath: string) => {
    try {
      await invoke('delete_node_modules', { repoPath });
      // Refresh the specific repository to update node_modules info
      await refreshRepository(repoPath);
    } catch (error) {
      throw error; // Re-throw so the component can handle it
    }
  };

  // Refresh repositories when component mounts
  useEffect(() => {
    console.log('HomePage mounted, loading repositories...'); // Debug log
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        await loadCachedRepositories();
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadInitialData();
  }, [loadCachedRepositories]);

  const filteredAndSortedRepositories = useMemo(() => {
    const startTime = performance.now();
    console.log('🔄 Filtering and sorting repositories. Total:', repositories.length); // Debug log
    
    // First filter by collection
    let collectionFiltered = repositories;
    if (selectedCollection !== 'all') {
      // Filter repositories to only those in the selected collection
      const collectionPaths = new Set(collectionRepositories.map(repo => repo.path));
      collectionFiltered = repositories.filter(repo => collectionPaths.has(repo.path));
    }
    
    // Then filter by search query
    const filtered = searchQuery.trim() 
      ? collectionFiltered.filter(repo => 
          repo.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : collectionFiltered;
    
    console.log('After filtering:', filtered.length, 'repositories'); // Debug log
    
    // Separate pinned and unpinned repositories
    const pinnedRepos = filtered.filter(repo => repo.is_pinned);
    const unpinnedRepos = filtered.filter(repo => !repo.is_pinned);
    
    console.log('Pinned repos:', pinnedRepos.length, 'Unpinned repos:', unpinnedRepos.length); // Debug log
    
    // Apply sorting to both pinned and unpinned repositories
    const sortFunction = (a: GitRepository, b: GitRepository) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastUpdated':
          const dateA = a.last_commit_date ? new Date(a.last_commit_date).getTime() : 0;
          const dateB = b.last_commit_date ? new Date(b.last_commit_date).getTime() : 0;
          return dateB - dateA; // Most recent first
        case 'size':
          return b.size_mb - a.size_mb; // Largest first
        default:
          return 0;
      }
    };
    
    // Sort both pinned and unpinned repositories
    const sortedPinnedRepos = [...pinnedRepos].sort(sortFunction);
    const sortedUnpinnedRepos = [...unpinnedRepos].sort(sortFunction);
    
    // Combine sorted pinned repos first, then sorted unpinned repos
    const result = [...sortedPinnedRepos, ...sortedUnpinnedRepos];
    console.log('Final sorted result:', result.length, 'repositories'); // Debug log
    console.log('Final pinned repos in result:', result.filter(r => r.is_pinned).map(r => r.name)); // Debug log
    
    const endTime = performance.now();
    console.log(`🔄 Filtering and sorting took: ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  }, [repositories, sortBy, searchQuery, selectedCollection, collectionRepositories]);

  const handleCollectionChange = async (collectionId: string) => {
    console.log(`🕐 Starting collection change to: ${collectionId}`);
    const startTime = performance.now();
    
    // Set loading state immediately
    setIsLoadingCollection(true);
    setSelectedCollection(collectionId);
    
    // If it's not "all", load the repositories in this collection
    if (collectionId !== 'all') {
      try {
        const backendStart = performance.now();
        const collectionRepos = await invoke<GitRepository[]>('get_repositories_in_collection', {
          collectionId
        });
        const backendEnd = performance.now();
        console.log(`🕐 Backend call took: ${(backendEnd - backendStart).toFixed(2)}ms`);
        
        setCollectionRepositories(collectionRepos);
      } catch (error) {
        console.error('Failed to load collection repositories:', error);
        setCollectionRepositories([]);
      }
    } else {
      setCollectionRepositories([]);
    }
    
    // Add a small delay to ensure DOM has time to update, then clear loading
    setTimeout(() => {
      setIsLoadingCollection(false);
    }, 100);
    
    const endTime = performance.now();
    console.log(`🕐 Total collection change took: ${(endTime - startTime).toFixed(2)}ms`);
  };

  const handleCollectionAssignmentChange = () => {
    // Trigger a refresh of the collections sidebar
    setCollectionsRefreshTrigger(prev => prev + 1);
  };

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
      {/* Navigation */}
      <Navigation repositoryCount={repositories.length} />

      <div className="flex min-h-[calc(100vh-3rem)] w-full items-stretch">
        {/* Collections Sidebar */}
        <aside className="md:w-32 w-4 border-r"></aside>
        
        <main className="h-full grow flex flex-col">
          <div className="grid grid-cols-5 gap-4 w-full">

            <div className='col-span-1 w-full h-screen border-r flex flex-col items-center sticky top-0 bg-background pt-16'>
              {/* collections list sidebar */}
              <div className='flex flex-col items-center justify-center mt-40 border-t border-b p-4 w-full bg-[#f7faf6] inset-shadow-sm inset-shadow-lime-600/50'>
                <div className='flex flex-col items-center justify-center px-4 mb-2'>

              <h2 className='text-lg font-semibold'>Collections</h2>
              {/* <p className='text-sm text-muted-foreground'>Manage your collections of repositories</p> */}
                </div>
              

              {/* render the collection list here */}
              <CollectionsSidebar 
                selectedCollection={selectedCollection}
                onCollectionChange={handleCollectionChange}
                refreshTrigger={collectionsRefreshTrigger}
                isLoadingCollection={isLoadingCollection}
              />


              </div>
            </div>
            {/* Title and Controls Section */}
            <div className='col-span-3 w-full flex flex-col'>
            <div className="flex flex-col gap-4 sticky top-6 bg-background z-2">
              <div className="pt-12">
                <div className='my-5'>
                  <h1 className="text-2xl font-bold">Local Repositories</h1>
                  <p className="text-sm text-muted-foreground">
                    Discover and manage your local Git repositories
                  </p>
                </div>
                
                

            
              <div className="grid lg:grid-cols-3  grid-cols-1 border w-full h-50 lg:h-15 shadow-md">

               <div className="flex items-center justify-center gap-2 border-r border-b lg:border-b-0">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sort by:</span>
                  <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="w-40 h-10 hover:cursor-pointer rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="lastUpdated">Last Updated</SelectItem>
                      <SelectItem value="size">folder Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>



                <div className="flex border-r border-b lg:border-b-0 w-full">
                  <div className='h-full w-10 flex items-center justify-center'>

                  <Search className="transform h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className='w-full h-full flex items-center justify-center'>

                 
                    <Input
                    placeholder="Search repositories by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-0 shadow-none focus:border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  {/* {searchQuery && (
                    <div className='h-full w-15 flex items-center justify-center mr-2'>
                  <Button
                  onClick={() => setSearchQuery('')}
                  variant="ghost"
                  size="sm"
                  className="hover:text-foreground transform text-muted-foreground h-10 w-12 rounded-sm hover:cursor-pointer" 
                  >
                  Clear
                  </Button>
                  </div>
                )} */}
                </div>


                <div className="grid grid-cols-2 gap-2 justify-center items-center px-2">
                 
                  <Tooltip>
                    <TooltipTrigger asChild>
                    <Button
                    onClick={handleShowScanDialog}
                    disabled={isScanning}
                    size="sm"
                    className="gap-2 h-10 hover:cursor-pointer"
                  >
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {isScanning ? 'Scanning...' : 'Scan'}
                  </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Scan for new Repositories</p>
                    </TooltipContent>
                  </Tooltip>
                   <Tooltip>
                    <TooltipTrigger asChild>
                  <Button
                    onClick={refreshCache}
                    disabled={isScanning}
                    variant="outline"
                    size="sm"
                    className="gap-2 h-10 hover:cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh cached data</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
                
                
                
                
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
            <div className="w-full mt-6">
              <RepositoryList
                repositories={filteredAndSortedRepositories}
                onRepositoryClick={handleRepositoryClick}
                onOpenInVSCode={openInVSCode}
                onOpenInFileManager={openInFileManager}
                onTogglePin={togglePin}
                onCollectionChange={handleCollectionAssignmentChange}
                collectionRefreshTrigger={collectionsRefreshTrigger}
                isLoading={(isScanning && !scanProgress) || isLoadingCollection || isInitialLoading}
                isInitialLoad={isInitialLoading}
                onDeleteNodeModules={handleDeleteNodeModules}
              />
            </div></div>
      <div className='col-span-1 w-full border-l h-full flex flex-col'>

            </div>
          </div>
        </main>
        
        <aside className="md:w-32 w-4 border-l"></aside>
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
