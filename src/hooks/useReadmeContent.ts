import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const useReadmeContent = (repositoryPath: string) => {
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReadme = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try common README filenames
        const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'readme.txt', 'README'];
        
        for (const filename of readmeFiles) {
          try {
            // For now, we'll need to add a Tauri command to read file content
            // This is a placeholder - you might need to implement read_file_content in Rust
            const content = await invoke<string>('read_file_content', {
              filePath: `${repositoryPath}/${filename}`
            });
            
            if (content) {
              setReadmeContent(content);
              break;
            }
          } catch (err) {
            // Continue to next filename
            continue;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load README');
      } finally {
        setIsLoading(false);
      }
    };

    if (repositoryPath) {
      loadReadme();
    }
  }, [repositoryPath]);

  return { readmeContent, isLoading, error };
};
