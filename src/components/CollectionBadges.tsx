import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection } from '../types/repository';
import { Badge } from "@/components/ui/badge";

interface CollectionBadgesProps {
  repositoryPath: string;
  refreshTrigger?: number; // Add this to trigger refreshes from parent
}

export const CollectionBadges: React.FC<CollectionBadgesProps> = ({ repositoryPath, refreshTrigger }) => {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    loadCollections();
  }, [repositoryPath]);

  // Refresh collections when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      loadCollections();
    }
  }, [refreshTrigger]);

  const loadCollections = async () => {
    try {
      const allCollections = await invoke<Collection[]>('get_collections');
      const repoCollections = allCollections.filter(collection =>
        collection.repository_paths.includes(repositoryPath)
      );
      setCollections(repoCollections);
    } catch (error) {
      console.error('Failed to load collections for repository:', error);
    }
  };

  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {collections.map((collection) => (
        <Badge 
          key={collection.id} 
          variant="secondary" 
          className="text-xs text-gray-700 border-sm" 
          style={{ backgroundColor: collection.color }}
        >
          {collection.name}
        </Badge>
      ))}
    </div>
  );
};
