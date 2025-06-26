import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection } from '../types/repository';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface CollectionAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryPath: string;
  repositoryName: string;
  onCollectionChange?: () => void;
}

export const CollectionAssignmentDialog: React.FC<CollectionAssignmentDialogProps> = ({
  isOpen,
  onClose,
  repositoryPath,
  repositoryName,
  onCollectionChange
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen, repositoryPath]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const collectionsData = await invoke<Collection[]>('get_collections');
      setCollections(collectionsData);
      
      // Determine which collections currently contain this repository
      const repoCollections = collectionsData
        .filter(collection => collection.repository_paths.includes(repositoryPath))
        .map(collection => collection.id);
      
      setSelectedCollections(new Set(repoCollections));
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId);
      } else {
        newSet.add(collectionId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Get current collections that contain this repository
      const currentCollections = collections
        .filter(collection => collection.repository_paths.includes(repositoryPath))
        .map(collection => collection.id);
      
      const currentSet = new Set(currentCollections);
      
      // Add to new collections
      for (const collectionId of selectedCollections) {
        if (!currentSet.has(collectionId)) {
          await invoke('add_repository_to_collection', {
            collectionId,
            repoPath: repositoryPath
          });
        }
      }
      
      // Remove from unselected collections
      for (const collectionId of currentSet) {
        if (!selectedCollections.has(collectionId)) {
          await invoke('remove_repository_from_collection', {
            collectionId,
            repoPath: repositoryPath
          });
        }
      }
      
      toast.success('Collection assignments updated');
      onCollectionChange?.();
      onClose();
    } catch (error) {
      console.error('Failed to save collection assignments:', error);
      toast.error('Failed to save collection assignments');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Collections</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which collections should contain &quot;{repositoryName}&quot;
          </p>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No collections available.</p>
              <p className="text-xs mt-1">Create a collection first from the sidebar.</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {collections.map((collection) => (
                  <div 
                    key={collection.id} 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 px-2 justify-center rounded-md border"
                    onClick={() => handleCollectionToggle(collection.id)}
                  >
                    <input
                      type="checkbox"
                      id={`dialog-${collection.id}`}
                      checked={selectedCollections.has(collection.id)}
                      onChange={() => handleCollectionToggle(collection.id)}
                      disabled={isSaving}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary pointer-events-none"
                    />
                    <span 
                    className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: collection.color }}
                  ></span>
                    <label
                      htmlFor={`dialog-${collection.id}`}
                      className="text-md font-medium cursor-pointer flex-1 pointer-events-none h-10 flex items-center justify-start"
                    >
                      {collection.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({collection.repository_paths.length} repos)
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || collections.length === 0}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
