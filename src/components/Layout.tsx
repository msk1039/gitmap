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

    if (pathSegments.length > 0) {
      // If we're on a repository page
      if (pathSegments[0] === 'repository' && pathSegments[1]) {
        const repoName = decodeURIComponent(pathSegments[1]);
        breadcrumbs.push({
          name: repoName,
          path: `/repository/${pathSegments[1]}`,
          isCurrentPage: pathSegments.length === 2
        });

        // If we're in a subdirectory of the repository
        if (pathSegments.length > 2) {
          const subPath = pathSegments.slice(2).join('/');
          breadcrumbs.push({
            name: decodeURIComponent(subPath),
            path: location.pathname,
            isCurrentPage: true
          });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 1 && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3 max-w-7xl">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.isCurrentPage ? (
                        <BreadcrumbPage className="text-gray-900 font-medium">
                          {crumb.name}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link 
                            to={crumb.path}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
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
