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
  refreshTrigger?: number; // Add this to trigger refreshes from parent
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  selectedCollection,
  onCollectionChange,
  refreshTrigger
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1'); // Default indigo
  const [isCreating, setIsCreating] = useState(false);

  // Predefined color options
  const colorOptions = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Blue', value: '#3b82f6' },
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
      setSelectedColor('#6366f1'); // Reset to default color
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
            
            <div className="grid grid-cols-4 items-start gap-4">
              <label className="text-right text-sm font-medium mt-2">
                Color
              </label>
              <div className="col-span-3">
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color.value 
                          ? 'border-gray-400 ring-2 ring-offset-2 ring-gray-400' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Selected: {colorOptions.find(c => c.value === selectedColor)?.name}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewCollectionName('');
                setSelectedColor('#6366f1'); // Reset to default color
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
