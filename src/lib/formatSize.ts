/**
 * Formats a size in megabytes to the most appropriate unit with proper formatting
 * @param sizeMb Size in megabytes
 * @returns Formatted size string with appropriate unit
 */
export const formatSize = (sizeMb: number): string => {
  if (sizeMb < 0.1) {
    // Less than 0.1 MB, show in KB
    return `${(sizeMb * 1024).toFixed(0)} KB`;
  } else if (sizeMb < 1) {
    // Less than 1 MB, show in MB with decimal
    return `${sizeMb.toFixed(1)} MB`;
  } else if (sizeMb < 1024) {
    // Less than 1 GB, show in MB
    return `${sizeMb.toFixed(1)} MB`;
  } else {
    // 1 GB or more, show in GB
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  }
};

/**
 * Formats file size in bytes to human-readable format
 * @param bytes Size in bytes
 * @returns Formatted size string
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  if (i === 0) {
    return `${size} B`;
  }
  
  return `${size.toFixed(1)} ${sizes[i]}`;
};
