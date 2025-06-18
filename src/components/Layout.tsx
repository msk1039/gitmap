import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export const Layout: React.FC = () => {
  const location = useLocation();
  
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { name: 'Home', path: '/', isCurrentPage: location.pathname === '/' }
    ];

    // Don't show breadcrumbs for repository pages - they handle their own breadcrumbs
    if (pathSegments.length > 0 && pathSegments[0] === 'repository') {
      return []; // Return empty array for repository pages
    }

    if (pathSegments.length > 0) {
      // Handle other pages if needed in the future
      // For now, we only have repository pages, so this section is mostly for future use
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb Navigation - Only show on non-repository pages */}
      {breadcrumbs.length > 1 && (
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-3 max-w-7xl">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.isCurrentPage ? (
                        <BreadcrumbPage className="font-medium">
                          {crumb.name}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link 
                            to={crumb.path}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {crumb.name}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <Outlet />
    </div>
  );
};
