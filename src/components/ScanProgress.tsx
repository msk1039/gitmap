import React from 'react';
import { ScanProgress as ScanProgressType } from '../types/repository';

interface ScanProgressProps {
  progress: ScanProgressType;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ progress }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Scanning for repositories... ({progress.repos_found} found)
          </p>
          <p className="text-xs text-blue-700 truncate">
            Current: {progress.current_path}
          </p>
        </div>
      </div>
    </div>
  );
};
