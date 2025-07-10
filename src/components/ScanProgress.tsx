import React from 'react';
import { ScanProgress as ScanProgressType, AnalysisProgress, RepositoriesDiscovered } from '../types/repository';

interface ScanProgressProps {
  progress: ScanProgressType;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ progress }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
        <div className="flex-1">
          <p className="text-sm md:text-base font-medium text-blue-900">
            Discovering repositories... ({progress.repos_found} found)
          </p>
          <p className="text-xs text-blue-700 truncate">
            Current: {progress.current_path}
          </p>
        </div>
      </div>
    </div>
  );
};

export const RepositoriesDiscoveredInfo: React.FC<{ info: RepositoriesDiscovered }> = ({ info }) => (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
    <p className="text-sm md:text-base font-medium text-green-900">
      Discovered {info.count} repositories in {info.time_taken_ms}ms.
    </p>
  </div>
);

export const AnalysisInProgress: React.FC<{ progress: AnalysisProgress }> = ({ progress }) => (
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
    <div className="flex items-center">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-3"></div>
      <div className="flex-1">
        <p className="text-sm md:text-base font-medium text-purple-900">
          Analyzing repositories... ({progress.current}/{progress.total})
        </p>
        <p className="text-xs text-purple-700 truncate">
          Analyzing: {progress.current_path}
        </p>
      </div>
    </div>
  </div>
);
