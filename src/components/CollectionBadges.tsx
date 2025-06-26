import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection } from '../types/repository';
import { Badge } from "@/components/ui/badge";

interface CollectionBadgesProps {
  repositoryPath: string;
  refreshTrigger?: number; // Add this to trigger refreshes from parent
  allCollections?: Collection[]; // Optional: pass all collections to avoid individual calls
}

export const CollectionBadges: React.FC<CollectionBadgesProps> = ({ 
  repositoryPath, 
  refreshTrigger, 
  allCollections 
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);

  // If allCollections is provided, filter it directly instead of making API calls
  const filteredCollections = useMemo(() => {
    if (allCollections) {
      return allCollections.filter(collection =>
        collection.repository_paths.includes(repositoryPath)
      );
    }
    return collections;
  }, [allCollections, repositoryPath, collections]);

  useEffect(() => {
    // Only load collections if allCollections is not provided
    if (!allCollections) {
      loadCollections();
    }
  }, [repositoryPath, allCollections]);

  // Refresh collections when refreshTrigger changes (only if allCollections is not provided)
  useEffect(() => {
    if (refreshTrigger !== undefined && !allCollections) {
      loadCollections();
    }
  }, [refreshTrigger, allCollections]);

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

  if (filteredCollections.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {filteredCollections.map((collection) => (
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
