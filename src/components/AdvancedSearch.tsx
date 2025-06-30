import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Loader2, BarChart3 } from "lucide-react";
import { SearchFilters, GitRepository } from '../types/repository';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';

interface AdvancedSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResults: (results: GitRepository[]) => void;
}

export const AdvancedSearchDialog: React.FC<AdvancedSearchDialogProps> = ({
  isOpen,
  onClose,
  onResults
}) => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showStats, setShowStats] = useState(false);
  
  const {
    searchResults,
    isSearching,
    searchError,
    optimizationStats,
    debouncedSearch,
    loadOptimizationStats
  } = useOptimizedSearch();

  const handleSearch = async () => {
    debouncedSearch(filters);
  };

  const handleInputChange = (field: keyof SearchFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));
  };

  const handleClear = () => {
    setFilters({});
    onResults([]);
  };

  React.useEffect(() => {
    if (searchResults.length > 0) {
      onResults(searchResults);
    }
  }, [searchResults, onResults]);

  React.useEffect(() => {
    if (isOpen) {
      loadOptimizationStats();
    }
  }, [isOpen, loadOptimizationStats]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
          <DialogDescription>
            Use multiple criteria to find repositories efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name/Path Search */}
          <div className="space-y-2">
            <Label htmlFor="namePrefix">Repository Name</Label>
            <Input
              id="namePrefix"
              placeholder="e.g., react, my-project"
              value={filters.namePrefix || ''}
              onChange={(e) => handleInputChange('namePrefix', e.target.value)}
            />
          </div>

          {/* Size Range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="minSize">Min Size (MB)</Label>
              <Input
                id="minSize"
                type="number"
                placeholder="0"
                value={filters.minSizeMb || ''}
                onChange={(e) => handleInputChange('minSizeMb', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxSize">Max Size (MB)</Label>
              <Input
                id="maxSize"
                type="number"
                placeholder="1000"
                value={filters.maxSizeMb || ''}
                onChange={(e) => handleInputChange('maxSizeMb', parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* File Type */}
          <div className="space-y-2">
            <Label htmlFor="fileType">File Type</Label>
            <Input
              id="fileType"
              placeholder="e.g., ts, js, py, rs"
              value={filters.fileType || ''}
              onChange={(e) => handleInputChange('fileType', e.target.value)}
            />
          </div>

          {/* Path Filter */}
          <div className="space-y-2">
            <Label htmlFor="pathFilter">Path Contains</Label>
            <Input
              id="pathFilter"
              placeholder="e.g., /home/user, /projects"
              value={filters.pathFilter || ''}
              onChange={(e) => handleInputChange('pathFilter', e.target.value)}
            />
          </div>

          {/* Error Display */}
          {searchError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {searchError}
            </div>
          )}

          {/* Results Summary */}
          {searchResults.length > 0 && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">
              Found {searchResults.length} repositories
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="flex-1"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowStats(!showStats)}
              size="sm"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Optimization Stats */}
          {showStats && optimizationStats && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Search Performance Stats</CardTitle>
                <CardDescription className="text-xs">
                  Data structure optimization metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Total Repos:</span>
                    <Badge variant="secondary">{optimizationStats.total_repositories}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Size:</span>
                    <Badge variant="secondary">
                      {optimizationStats.lru_cache_size}/{optimizationStats.lru_cache_capacity}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Name Index:</span>
                    <Badge variant="secondary">{optimizationStats.index_name_entries}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Size Ranges:</span>
                    <Badge variant="secondary">{optimizationStats.index_size_ranges}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>File Types:</span>
                    <Badge variant="secondary">{optimizationStats.index_file_types}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Quick search component for the main page
export const QuickSearchBar: React.FC<{
  onSearch: (query: string) => void;
  onAdvancedSearch: () => void;
}> = ({ onSearch, onAdvancedSearch }) => {
  const [query, setQuery] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories by name, path, or file type..."
          value={query}
          onChange={handleInputChange}
          className="pl-10"
        />
      </div>
      <Button variant="outline" onClick={onAdvancedSearch}>
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  );
};
