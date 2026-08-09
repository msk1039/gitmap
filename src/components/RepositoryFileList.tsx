import React, { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DirectoryListing, FileEntry } from '../types/repository';
import { formatFileSize } from '../lib/formatSize';
import {
  ChevronRight,
  File,
  FileCode2,
  FileText,
  Folder,
  Loader2,
  MoveLeft,
} from 'lucide-react';

interface RepositoryFileListProps {
  repositoryPath: string;
  directoryListing: DirectoryListing | null;
  isLoading?: boolean;
  onBrowseStateChange?: (showReadme: boolean) => void;
}

const codeExtensions = new Set([
  'c', 'cc', 'cpp', 'cs', 'css', 'go', 'h', 'hpp', 'html', 'java', 'js', 'jsx',
  'json', 'kt', 'md', 'mdx', 'php', 'py', 'rs', 'scss', 'sh', 'sql', 'swift',
  'toml', 'ts', 'tsx', 'yaml', 'yml', 'zsh',
]);

const getFileIcon = (entry: FileEntry) => {
  if (entry.is_directory) {
    return <Folder className="h-4 w-4 shrink-0 fill-sky-500 text-sky-500 dark:fill-sky-400 dark:text-sky-400" />;
  }

  const extension = entry.name.split('.').pop()?.toLowerCase();
  if (extension && codeExtensions.has(extension)) {
    return <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  if (extension === 'txt') {
    return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
};

const relativePath = (rootPath: string, path: string) => {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, '');
  const normalizedPath = path.replace(/[\\/]+$/, '');
  return normalizedPath.startsWith(normalizedRoot)
    ? normalizedPath.slice(normalizedRoot.length).replace(/^[\\/]+/, '')
    : normalizedPath;
};

const getParentPath = (rootPath: string, path: string) => {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, '');
  const normalizedPath = path.replace(/[\\/]+$/, '');
  if (normalizedPath === normalizedRoot) return normalizedRoot;

  const separatorIndex = Math.max(normalizedPath.lastIndexOf('/'), normalizedPath.lastIndexOf('\\'));
  return separatorIndex > 0 ? normalizedPath.slice(0, separatorIndex) : normalizedRoot;
};

export const RepositoryFileList: React.FC<RepositoryFileListProps> = ({
  repositoryPath,
  directoryListing,
  isLoading = false,
  onBrowseStateChange,
}) => {
  const [currentListing, setCurrentListing] = useState<DirectoryListing | null>(directoryListing);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  useEffect(() => {
    setCurrentListing(directoryListing);
    setSelectedFile(null);
    setFileContent(null);
    setBrowserError(null);
  }, [directoryListing]);

  const currentPath = currentListing?.path ?? repositoryPath;
  const pathParts = useMemo(
    () => relativePath(repositoryPath, currentPath).split(/[\\/]+/).filter(Boolean),
    [repositoryPath, currentPath],
  );
  const isAtRoot = relativePath(repositoryPath, currentPath) === '';

  useEffect(() => {
    onBrowseStateChange?.(isAtRoot && !selectedFile);
  }, [isAtRoot, selectedFile, onBrowseStateChange]);

  const loadDirectory = async (path: string) => {
    try {
      setIsNavigating(true);
      setBrowserError(null);
      const listing = await invoke<DirectoryListing>('list_directory_contents', {
        repoPath: path,
        rootPath: repositoryPath,
      });
      setCurrentListing(listing);
      setSelectedFile(null);
      setFileContent(null);
    } catch (error) {
      setBrowserError(error instanceof Error ? error.message : 'Unable to open this folder.');
    } finally {
      setIsNavigating(false);
    }
  };

  const openEntry = async (entry: FileEntry) => {
    if (entry.is_directory) {
      await loadDirectory(entry.path);
      return;
    }

    try {
      setIsLoadingFile(true);
      setBrowserError(null);
      setSelectedFile(entry);
      const content = await invoke<string>('read_file_content', {
        filePath: entry.path,
        rootPath: repositoryPath,
      });
      setFileContent(content);
    } catch (error) {
      setFileContent(null);
      setBrowserError(error instanceof Error ? error.message : 'Unable to read this file.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const openBreadcrumb = async (partIndex: number) => {
    const targetPath = [repositoryPath, ...pathParts.slice(0, partIndex + 1)].join('/');
    await loadDirectory(targetPath);
  };

  const sortedEntries = useMemo(() => {
    if (!currentListing) return [];
    return [...currentListing.entries].sort((a, b) => {
      if (a.is_directory !== b.is_directory) return a.is_directory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [currentListing]);

  const isEmptyFile = fileContent === '';

  if (isLoading && !currentListing) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading files…
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b bg-muted/35 px-3 py-2 text-sm">
        <button type="button" onClick={() => void loadDirectory(repositoryPath)} className="font-semibold text-foreground hover:text-primary hover:underline">
          {repositoryPath.split(/[\\/]+/).filter(Boolean).pop() || 'Repository'}
        </button>
        {pathParts.map((part, index) => (
          <React.Fragment key={`${part}-${index}`}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button type="button" onClick={() => void openBreadcrumb(index)} className="text-muted-foreground hover:text-primary hover:underline">
              {part}
            </button>
          </React.Fragment>
        ))}
        {selectedFile && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">{selectedFile.name}</span>
          </>
        )}
      </div>

      {browserError && (
        <div className="border-b bg-destructive/10 px-3 py-2 text-sm text-destructive">{browserError}</div>
      )}

      {selectedFile ? (
        <div>
          <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              {getFileIcon(selectedFile)}
              <span className="truncate font-medium text-foreground">{selectedFile.name}</span>
            </div>
            <span className="shrink-0">{selectedFile.size ? formatFileSize(selectedFile.size) : ''}</span>
          </div>
          {isLoadingFile ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening file…
            </div>
          ) : fileContent !== null ? (
            <div className="max-h-[70vh] overflow-auto bg-background text-sm">
              <table className="w-full border-collapse font-mono leading-6">
                <tbody>
                  {fileContent.split('\n').map((line, index) => (
                    <tr key={index} className="group hover:bg-muted/40">
                      <td className="w-12 select-none border-r bg-muted/35 px-3 text-right text-xs text-muted-foreground">{index + 1}</td>
                      <td className="whitespace-pre px-4 text-foreground">{line || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isEmptyFile && <div className="p-4 text-muted-foreground">This file is empty.</div>}
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          {!isAtRoot && (
            <button
              type="button"
              onClick={() => void loadDirectory(getParentPath(repositoryPath, currentPath))}
              className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <MoveLeft className="h-4 w-4" /> Go to parent directory
            </button>
          )}
          {isNavigating ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading directory…
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">This directory is empty.</div>
          ) : (
            <div className="divide-y">
              {sortedEntries.map((entry) => (
                <button
                  type="button"
                  key={entry.path}
                  onClick={() => void openEntry(entry)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {getFileIcon(entry)}
                  <span className="min-w-0 flex-1 truncate font-medium text-primary hover:underline">{entry.name}</span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {entry.modified ? new Date(entry.modified).toLocaleDateString() : ''}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                    {!entry.is_directory && entry.size ? formatFileSize(entry.size) : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
