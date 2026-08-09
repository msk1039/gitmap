import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useTheme } from 'next-themes';

import { Home, Settings, GitBranchIcon, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  repositoryCount?: number;
}

export const Navigation: React.FC<NavigationProps> = () => {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="border-b fixed top-0 left-0 right-0 z-10 bg-background">
      <div className="flex h-12 items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex justify-center items-center gap-2 w-32 border-r h-full">
          <GitBranchIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">gitmap</span>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-1 px-4">
          <Link to="/">
            <Button
              variant={isActive('/') ? "default" : "ghost"}
              size="sm"
              className={cn(
                "gap-2 h-8",
                isActive('/') && "bg-primary text-primary-foreground"
              )}
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
          
          <Link to="/settings">
            <Button
              variant={isActive('/settings') ? "default" : "ghost"}
              size="sm"
              className={cn(
                "gap-2 h-8",
                isActive('/settings') && "bg-primary text-primary-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Status/Info */}
        {/* <div className="flex items-center gap-2 px-4">
          <Badge variant="secondary" className="text-xs">
            Local
          </Badge>
          <span className="text-xs text-muted-foreground">
            {repositoryCount} repositories found
          </span>
        </div> */}

        {/* Theme toggle */}
        <div className="flex items-center w-32 border-l h-12 justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
