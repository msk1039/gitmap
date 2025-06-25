import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection } from '../types/repository';
import { Badge } from "@/components/ui/badge";

interface CollectionBadgesProps {
  repositoryPath: string;
}

export const CollectionBadges: React.FC<CollectionBadgesProps> = ({ repositoryPath }) => {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    loadCollections();
  }, [repositoryPath]);

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
        <Badge key={collection.id} variant="secondary" className="text-xs">
          {collection.name}
        </Badge>
      ))}
    </div>
  );
};
