import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection } from '../types/repository';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface CollectionsSidebarProps {
  selectedCollection: string;
  onCollectionChange: (collectionId: string) => void;
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  selectedCollection,
  onCollectionChange
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

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
      await invoke('create_collection', { name: newCollectionName.trim() });
      await loadCollections();
      setNewCollectionName('');
      setIsCreateDialogOpen(false);
      toast.success('Collection created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCollectionSelect = (collectionId: string) => {
    onCollectionChange(collectionId);
  };

  return (
    <div className="w-full bg-background p-4 flex flex-col">
      <div className="mb-4">
        <h3 className="font-medium text-sm mb-3">Collections</h3>
        
        <div className="space-y-2">
          {/* All repositories option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="all"
              checked={selectedCollection === "all"}
              onChange={() => handleCollectionSelect("all")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="all"
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              All Repositories
            </label>
          </div>

          {/* Custom collections */}
          {collections.map((collection) => (
            <div key={collection.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={collection.id}
                checked={selectedCollection === collection.id}
                onChange={() => handleCollectionSelect(collection.id)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label
                htmlFor={collection.id}
                className="text-sm font-medium cursor-pointer"
              >
                {collection.name}
                <span className="text-xs text-muted-foreground ml-1">
                  ({collection.repository_paths.length})
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* New Collection Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Collection
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Name
              </label>
              <Input
                id="name"
                placeholder="Enter collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCollection();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewCollectionName('');
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCollection} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
