import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useReadmeContent } from '../hooks/useReadmeContent';
import { RefreshCw } from 'lucide-react';

interface ReadmeRendererProps {
  repositoryPath: string;
}

export const ReadmeRenderer: React.FC<ReadmeRendererProps> = ({
  repositoryPath
}) => {
  const { readmeContent, isLoading, error } = useReadmeContent(repositoryPath);

  if (isLoading) {
    return (
      <div className="border-t p-4 w-full border-x border-b">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin mr-3" />
          <span className="text-muted-foreground">Loading README...</span>
        </div>
      </div>
    );
  }

  if (error || !readmeContent) {
    return null; // Don't show anything if no README found
  }

  // Transform image URLs to be relative to the repository
  const transformImgUrl = (src: string | undefined): string => {
    if (!src) return "";
    
    if (src.startsWith("http")) {
      return src;
    }
    
    // For local files, we'll need to handle this based on your file serving setup
    // For now, return as-is
    return src;
  };

  return (
    <div className="border-t p-4 w-full border-x border-b">
      <div className="prose dark:prose-invert max-w-none">
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img: ({ src, alt, ...props }) => (
              <img
                src={transformImgUrl(src)}
                alt={alt}
                {...props}
              />
            ),
          }}
        >
          {readmeContent}
        </Markdown>
      </div>
    </div>
  );
};
