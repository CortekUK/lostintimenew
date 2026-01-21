import { ReactNode, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusManager } from '@/components/accessibility/FocusManager';
import { useAppShortcuts } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchInput } from '@/components/search/GlobalSearchInput';
import { CommandPalette } from '@/components/search/CommandPalette';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showDatePicker?: boolean;
}

export const AppLayout = ({ children, title, subtitle, showSearch = false, showDatePicker = false }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Setup keyboard shortcuts
  useAppShortcuts({
    onNewSale: () => navigate('/sales'),
    onNewProduct: () => navigate('/products'),
    onSearch: () => setCommandPaletteOpen(true)
  });
  
  const getBreadcrumbFromPath = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ title: 'Home', href: '/' }];
    
    // Map for top-level segments
    const pageMap: Record<string, string> = {
      'products': 'Products',
      'suppliers': 'Suppliers',
      'sales': 'Sales',
      'expenses': 'Expenses',
      'reports': 'Reports',
      'settings': 'Settings',
    };

    // Map for nested segments (e.g., /sales/my-sales)
    const nestedPageMap: Record<string, string> = {
      'my-sales': 'My Sales',
      'items': 'Sold Items',
    };

    let accumulatedPath = '';
    segments.forEach((segment) => {
      accumulatedPath += `/${segment}`;
      // Check nested map first, then top-level, then format the segment
      const title = nestedPageMap[segment] 
        || pageMap[segment] 
        || segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      breadcrumbs.push({ title, href: accumulatedPath });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbFromPath(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="z-50">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="sticky top-0 z-40 header-divider bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6">
              <SidebarTrigger className="text-foreground" />
              
              {/* Breadcrumb */}
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>{crumb.title}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              <div className="ml-auto flex items-center gap-2 md:gap-4 flex-1 md:flex-initial">
                {/* Global Search */}
                <GlobalSearchInput 
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  className="w-full md:w-auto"
                />
                
                {showDatePicker && (
                  <Button variant="outline" size="sm" aria-label="Open date picker">
                    <Calendar className="h-4 w-4 mr-2" />
                    Today
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <FocusManager>
            <main 
              className="flex-1 p-4 md:p-6 relative z-10" 
              tabIndex={-1}
              role="main"
              aria-label="Main content"
            >
              {title && (
                <div className="mb-4 md:mb-6">
                  <h1 className="font-luxury text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
                  {subtitle && (
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">{subtitle}</p>
                  )}
                </div>
              )}
              {children}
            </main>
          </FocusManager>
        </div>
        
        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />

        {/* AI Chat Sidebar */}
        <ChatSidebar />
      </div>
    </SidebarProvider>
  );
};