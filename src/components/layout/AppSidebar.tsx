import { LayoutDashboard, Package, Truck, ShoppingCart, PoundSterling, BarChart3, Activity, Settings, LogOut, Moon, Sun, ChevronRight, Handshake, CreditCard, Users, User, ReceiptPoundSterling, Coins, KeyRound, ChevronUp, Wallet, Crown, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS, CRMModule } from '@/lib/permissions';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FlyoutSubmenu } from './FlyoutSubmenu';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { useState, useCallback } from 'react';
import { routePreloadMap } from '@/App';

// Preload a route's component on hover
const usePreloadOnHover = () => {
  const preload = useCallback((url: string) => {
    const component = routePreloadMap[url];
    if (component?.preload) {
      component.preload();
    }
  }, []);
  return preload;
};
interface SubNavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  module?: CRMModule;
}

interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  module?: CRMModule;
  subItems?: SubNavigationItem[];
}
// Core Operations: Dashboard, Products, Suppliers, Customers, Consignments
const coreOperationsItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
    module: CRM_MODULES.DASHBOARD
  },
  {
    title: 'Products',
    url: '/products',
    icon: Package,
    module: CRM_MODULES.PRODUCTS
  },
  {
    title: 'Suppliers',
    url: '/suppliers',
    icon: Truck,
    module: CRM_MODULES.SUPPLIERS
  },
  {
    title: 'Customers',
    url: '/customers',
    icon: Users,
    module: CRM_MODULES.CUSTOMERS
  },
  {
    title: 'Consignments',
    url: '/consignments',
    icon: Handshake,
    module: CRM_MODULES.CONSIGNMENTS
  },
  {
    title: 'Deposits',
    url: '/deposits',
    icon: Wallet,
    module: CRM_MODULES.SALES
  }
];

// Sales: POS, My Sales, My Commission, Sold Items, Transactions
const salesItems: NavigationItem[] = [
  {
    title: 'Sales',
    url: '/sales',
    icon: ShoppingCart,
    module: CRM_MODULES.SALES,
    subItems: [
      { title: 'POS', url: '/sales', icon: CreditCard },
      { title: 'My Sales', url: '/sales/my-sales', icon: User },
      { title: 'My Commission', url: '/sales/my-commission', icon: Coins },
      { title: 'Sold Items', url: '/sales/items', icon: Package },
      { title: 'Transactions', url: '/sales/transactions', icon: ReceiptPoundSterling, module: CRM_MODULES.REPORTS }
    ]
  }
];

// Financial: Expenses, Reports, Analytics
const financialItems: NavigationItem[] = [
  {
    title: 'Expenses',
    url: '/expenses',
    icon: PoundSterling,
    module: CRM_MODULES.EXPENSES
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: BarChart3,
    module: CRM_MODULES.REPORTS
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: Activity,
    module: CRM_MODULES.ANALYTICS
  }
];

// Admin: Settings (owner only)
const adminItems: NavigationItem[] = [
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    module: CRM_MODULES.SETTINGS
  }
];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const {
    userRole,
    signOut,
    user
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const { canAccess, role } = usePermissions();
  const location = useLocation();
  const currentPath = location.pathname;
  const [salesExpanded, setSalesExpanded] = useState(currentPath.startsWith('/sales'));
  const [productsExpanded, setProductsExpanded] = useState(currentPath.startsWith('/products'));
  const [showChangePassword, setShowChangePassword] = useState(false);
  const preloadRoute = usePreloadOnHover();
  const isActive = (path: string) => currentPath === path;
  const getNavClass = ({
    isActive
  }: {
    isActive: boolean;
  }) => `relative flex w-full items-center gap-2.5 h-11 px-3.5 rounded-lg transition-all duration-[160ms] outline-none border-0 focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))] ${isActive ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-semibold" : "bg-transparent text-sidebar-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"}`;
  const getUserInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  // Filter navigation items based on user permissions
  const allItems = [
    ...coreOperationsItems,
    ...salesItems,
    ...financialItems,
    ...adminItems
  ].filter(item => !item.module || canAccess(item.module));
  const isCollapsed = state === 'collapsed';
  return <TooltipProvider>
      <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon" variant="sidebar">
        <SidebarHeader className="header-divider flex items-center justify-center px-2 h-16">
          {isCollapsed ? <Tooltip>
              <TooltipTrigger asChild>
                <Crown className="h-6 w-6 text-primary cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Lost In Time Jewellers</p>
              </TooltipContent>
            </Tooltip> :
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary flex-shrink-0" />
              <span className="font-luxury text-[1.15rem] text-foreground tracking-wide leading-tight">Lost In Time Jewellers</span>
            </div>
          }
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className={isCollapsed ? "gap-2" : ""}>
                {allItems.map(item => {
                if (item.subItems) {
                  // Handle expandable menu items (like Sales and Products)
                  const isExpanded = item.title === 'Sales' ? salesExpanded : productsExpanded;
                  const setExpanded = item.title === 'Sales' ? setSalesExpanded : setProductsExpanded;
                  // Filter sub-items based on permissions
                  const visibleSubItems = item.subItems.filter(sub => !sub.module || canAccess(sub.module));
                  const hasActiveChild = visibleSubItems.some(sub => isActive(sub.url));
                  
                  // Don't render if no sub-items are visible
                  if (visibleSubItems.length === 0) return null;
                  
                  if (isCollapsed) {
                    // Collapsed: show flyout on hover
                    return <SidebarMenuItem key={item.title} className="flex justify-center">
                          <FlyoutSubmenu title={item.title} icon={item.icon} subItems={visibleSubItems} isActive={isActive} />
                        </SidebarMenuItem>;
                  }
                  return <Collapsible key={item.title} open={isExpanded} onOpenChange={setExpanded} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className={`w-full focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))] outline-none transition-all duration-[160ms] ${hasActiveChild ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]" : "hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"}`}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-[160ms] ease-out group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-0 border-0">
                              {visibleSubItems.map(subItem => <SidebarMenuSubItem key={subItem.title}>
                                  <NavLink to={subItem.url} end className={getNavClass} onMouseEnter={() => preloadRoute(subItem.url)}>
                                    {({
                                isActive
                              }) => <>
                                        {isActive && <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] bg-[hsl(var(--sidebar-primary))] rounded-r-[3px]" />}
                                        <subItem.icon className="h-4 w-4" />
                                        <span>{subItem.title}</span>
                                      </>}
                                  </NavLink>
                                </SidebarMenuSubItem>)}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>;
                }

                // Handle regular menu items
                return <SidebarMenuItem key={item.title} className={isCollapsed ? "flex justify-center" : ""}>
                      {isCollapsed ? <Tooltip>
                          <TooltipTrigger asChild>
                            <NavLink to={item.url} end onMouseEnter={() => preloadRoute(item.url)} className={({
                        isActive
                      }) => `relative flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-[160ms] outline-none border-0 ${isActive ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]" : "bg-transparent text-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"} focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))]`} aria-label={item.title}>
                              {({
                          isActive
                        }) => <>
                                  {isActive && <span className="absolute left-0 top-[8px] bottom-[8px] w-[3px] bg-[hsl(var(--sidebar-primary))] rounded-r-[3px]" />}
                                  <item.icon className="h-[18px] w-[18px]" />
                                </>}
                            </NavLink>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip> : <NavLink to={item.url} end className={getNavClass} onMouseEnter={() => preloadRoute(item.url)}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>}
                    </SidebarMenuItem>;
              })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-[hsl(var(--sidebar-border))] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-[160ms] hover:bg-[hsl(var(--sidebar-accent))] focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))] outline-none ${isCollapsed ? "justify-center" : ""}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-background))] text-xs font-medium">
                    {user?.email ? getUserInitials(user.email) : 'LI'}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-sidebar-foreground truncate">
                        {user?.email}
                      </p>
                      <Badge variant={ROLE_BADGE_VARIANTS[role]} className={role === 'owner' ? 'text-xs mt-0.5 bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-background))]' : 'text-xs mt-0.5'}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side={isCollapsed ? "right" : "top"} 
              align={isCollapsed ? "start" : "center"}
              className="w-56 mb-2 bg-popover"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {ROLE_LABELS[role]}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <ChangePasswordModal 
            open={showChangePassword} 
            onOpenChange={setShowChangePassword} 
          />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>;
}