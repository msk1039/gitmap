import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Plus, FolderOpen, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CollectionsSidebarProps {
  selectedCollection: string;
  onCollectionChange: (collectionId: string) => void;
  refreshTrigger?: number; // Add this to trigger refreshes from parent
  isLoadingCollection?: boolean; // Add loading state
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  selectedCollection,
  onCollectionChange,
  refreshTrigger,
  isLoadingCollection = false
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#e5e7eb'); // Default light gray
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Predefined color options with lighter, faint versions
  const colorOptions = [
    { name: 'Default', value: '#e5e7eb' }, // Very light gray
    { name: 'Gray', value: '#f3f4f6' },    // Lighter gray
    { name: 'Brown', value: '#fef3c7' },   // Light amber/cream
    { name: 'Orange', value: '#fed7aa' },  // Light orange/peach
    { name: 'Yellow', value: '#fef08a' },  // Light yellow
    { name: 'Green', value: '#bbf7d0' },   // Light green/mint
    { name: 'Blue', value: '#bfdbfe' },    // Light blue/sky
    { name: 'Purple', value: '#e9d5ff' },  // Light purple/lavender
    { name: 'Pink', value: '#fce7f3' },    // Light pink/rose
    { name: 'Red', value: '#fecaca' },     // Light red/coral
  ];

  useEffect(() => {
    loadCollections();
  }, []);

  // Refresh collections when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      loadCollections();
    }
  }, [refreshTrigger]);

  const loadCollections = async () => {
    try {
      const collectionsData = await invoke<Collection[]>('get_collections');
      setCollections(collectionsData);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    try {
      setIsCreating(true);
      await invoke('create_collection', { 
        name: newCollectionName.trim(), 
        color: selectedColor 
      });
      await loadCollections();
      setNewCollectionName('');
      setSelectedColor('#e5e7eb'); // Reset to default color
      setIsCreateDialogOpen(false);
      toast.success('Collection created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      setIsDeleting(true);
      await invoke('delete_collection', { 
        collectionId: collectionToDelete.id 
      });
      await loadCollections();
      setDeleteConfirmOpen(false);
      setCollectionToDelete(null);
      
      // If the deleted collection was selected, switch to "all"
      if (selectedCollection === collectionToDelete.id) {
        onCollectionChange('all');
      }
      
      toast.success('Collection deleted successfully');
      
      // Refresh the entire page to update badges
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete collection');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirmation = (collection: Collection, event: React.MouseEvent) => {
    event.stopPropagation();
    setCollectionToDelete(collection);
    setDeleteConfirmOpen(true);
  };

  const handleCollectionSelect = (collectionId: string) => {
    onCollectionChange(collectionId);
  };

  return (
    <div className="flex flex-col w-full rounded-lg">
      <div className="">
        {/* <h3 className="font-medium text-sm mb-3">Collections</h3> */}
        
        <div className="">
          {/* All repositories option */}
          <div className={`flex items-center space-x-2 px-2  rounded-lg border-1 shadow-lime-600/20` + (selectedCollection === "all" ? ' bg-background shadow-md' : ' hover:bg-muted/100 transition-colors')}>
            <input
              type="checkbox"
              id="all"
              checked={selectedCollection === "all"}
              onChange={() => handleCollectionSelect("all")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="all"
              className="text-xs md:text-sm font-medium cursor-pointer flex items-center gap-2 h-10"
            >
              <FolderOpen className="h-4 w-4" />
              All Repositories
              {isLoadingCollection && selectedCollection === "all" && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </label>
          </div>

          {/* Custom collections */}
          {collections.map((collection) => (
            <div key={collection.id} className={`group flex items-center justify-between space-x-2 my-2 rounded-lg hover:bg-white transition-colors border-1 shadow-lime-600/30 ${selectedCollection === collection.id ? 'bg-background shadow-md ' : ''} `}>
              <div className="flex items-center space-x-2 flex-1 min-w-0 h-10 px-2">
                <input
                  type="checkbox"
                  id={collection.id}
                  checked={selectedCollection === collection.id}
                  onChange={() => handleCollectionSelect(collection.id)}
                  className="h-4 w-4 rounded focus:ring-primary border-2"
                  style={{ 
                    borderColor: collection.color,
                    accentColor: collection.color 
                  }}
                />
                <label
                  htmlFor={collection.id}
                  className="text-xs md:text-sm font-medium cursor-pointer flex-1 min-w-0 flex items-center h-full"
                >
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                    style={{ backgroundColor: collection.color }}
                  ></span>
                  <span className="truncate flex-1 min-w-0" title={collection.name}>
                    {collection.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    ({collection.repository_paths.length})
                  </span>
                  {isLoadingCollection && selectedCollection === collection.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-2 flex-shrink-0" />
                  )}
                </label>
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted rounded-full border-1 mr-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4 rounded-full" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 cursor-pointer font-medium"
                      onClick={(e) => openDeleteConfirmation(collection, e)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Collection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Collection Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button 
        variant="outline" 
        size="sm" 
        className="w-full gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/50 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300/60 transition-all duration-200 text-emerald-700 hover:text-emerald-800 shadow-sm hover:shadow-md mt-2 text-xs md:text-sm"
          >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Collection</span>
        <span className="sm:hidden">New</span>
          </Button>
        </DialogTrigger>
        <DialogContent className='w-[480px] bg-gradient-to-br from-white to-gray-50'>
          <DialogHeader className="text-center pb-2">
        <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Create New Collection
        </DialogTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Organize your repositories with a custom collection
        </p>
          </DialogHeader>
          <div className="grid gap-6 py-4">
        <div className="space-y-4">
          <label htmlFor="name" className="text-lg font-medium text-gray-700">
            Collection Name
          </label>
          <Input
            id="name"
            placeholder="Enter a descriptive name..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            className="h-11 rounded-lg border-gray-200 focus:border-emerald-300 focus:ring-emerald-200 transition-all duration-200"
            onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleCreateCollection();
          }
            }}
          />
        </div>
        
        <div className="space-y-4">
          <label className="text-lg font-medium text-gray-700">
            Choose Color Theme
          </label>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
            selectedColor === color.value 
              ? 'border-gray-400 ring-3 ring-emerald-200 scale-110 shadow-lg' 
              : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <div 
            className="w-4 h-4 rounded-full border border-emerald-200" 
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-sm font-medium text-emerald-700">
            {colorOptions.find(c => c.value === selectedColor)?.name} Theme
          </span>
            </div>
          </div>
        </div>
          </div>
          <DialogFooter className="gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={() => {
            setIsCreateDialogOpen(false);
            setNewCollectionName('');
            setSelectedColor('#e5e7eb');
          }}
          disabled={isCreating}
          className="px-6 h-10 rounded-lg border-gray-200 hover:bg-gray-50 transition-colors duration-200"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateCollection} 
          disabled={isCreating || !newCollectionName.trim()}
          className="px-6 h-10 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Creating...
            </>
          ) : (
            <>
          <Plus className="h-4 w-4 mr-2" />
          Create Collection
            </>
          )}
        </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the collection &quot;{collectionToDelete?.name}&quot;? 
              This will remove the collection but will not delete the repositories themselves. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollection}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Collection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
