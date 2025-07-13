import React from 'react';
import { DirectoryListing, FileEntry } from '../types/repository';
import { formatFileSize } from '../lib/formatSize';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Folder, 
  File,
  FileCode,
  Code,
  FileText,
  Image,
  Archive,
  Database,
  RefreshCw
} from "lucide-react";

interface RepositoryFileListProps {
  directoryListing: DirectoryListing | null;
  isLoading?: boolean;
}

const getFileIcon = (entry: FileEntry) => {
  if (entry.is_directory) {
    return (
      <Folder
        className="h-5 w-5 text-muted-foreground"
        stroke="none"
        fill="currentColor"
      />
    );
  }
  
  const extension = entry.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className="h-5 w-5 text-muted-foreground" />;
    case 'json':
      return <Code className="h-5 w-5 text-muted-foreground" />;
    case 'md':
    case 'mdx':
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'html':
    case 'htm':
      return <Code className="h-5 w-5 text-muted-foreground" />;
    case 'py':
    case 'rs':
    case 'go':
    case 'java':
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c':
    case 'sh':
    case 'bash':
      return <FileCode className="h-5 w-5 text-muted-foreground" />;
    case 'yml':
    case 'yaml':
    case 'xml':
      return <Code className="h-5 w-5 text-muted-foreground" />;
    case 'sql':
      return <Database className="h-5 w-5 text-muted-foreground" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image className="h-5 w-5 text-muted-foreground" />;
    case 'zip':
    case 'tar':
    case 'gz':
      return <Archive className="h-5 w-5 text-muted-foreground" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

export const RepositoryFileList: React.FC<RepositoryFileListProps> = ({
  directoryListing,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-3" />
        <span>Loading files...</span>
      </div>
    );
  }

  if (!directoryListing) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Unable to load directory contents
      </div>
    );
  }

  if (directoryListing.entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No files found in this directory
      </div>
    );
  }

  // Sort directories first, then files
  const sortedEntries = [...directoryListing.entries].sort((a, b) => {
    if (a.is_directory !== b.is_directory) {
      return a.is_directory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* Empty header to match reference design */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry, index) => (
            <TableRow
              key={`${entry.name}-${index}`}
              className="hover:bg-muted/30 !border-b"
            >
              <TableCell className="font-medium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 hover:underline cursor-pointer">
                    {getFileIcon(entry)}
                    <span>{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {entry.modified && (
                      <span>
                        {new Date(entry.modified).toLocaleDateString()}
                      </span>
                    )}
                    {!entry.is_directory && entry.size && (
                      <span>{formatFileSize(entry.size)}</span>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
