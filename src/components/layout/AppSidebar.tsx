import { LayoutDashboard, Package, Truck, ShoppingCart, PoundSterling, BarChart3, Activity, Settings, LogOut, Moon, Sun, ChevronRight, Handshake, CreditCard, Repeat, type LucideIcon } from 'lucide-react';
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
import { FlyoutSubmenu } from './FlyoutSubmenu';
import { useState } from 'react';
interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  module?: CRMModule;
  subItems?: Array<{
    title: string;
    url: string;
    icon: LucideIcon;
  }>;
}
const navigationItems: NavigationItem[] = [{
  title: 'Dashboard',
  url: '/',
  icon: LayoutDashboard,
  module: CRM_MODULES.DASHBOARD
}, {
  title: 'Products',
  url: '/products',
  icon: Package,
  module: CRM_MODULES.PRODUCTS,
  subItems: [{
    title: 'All Products',
    url: '/products',
    icon: Package
  }, {
    title: 'PX Intake',
    url: '/products/intake',
    icon: Repeat
  }]
}, {
  title: 'Suppliers',
  url: '/suppliers',
  icon: Truck,
  module: CRM_MODULES.SUPPLIERS
}, {
  title: 'Consignments',
  url: '/consignments',
  icon: Handshake,
  module: CRM_MODULES.CONSIGNMENTS
}, {
  title: 'Sales/POS',
  url: '/sales',
  icon: ShoppingCart,
  module: CRM_MODULES.SALES,
  subItems: [{
    title: 'POS',
    url: '/sales',
    icon: CreditCard
  }, {
    title: 'Transactions',
    url: '/sales/transactions',
    icon: PoundSterling
  }, {
    title: 'Sold Items',
    url: '/sales/items',
    icon: Package
  }]
}, {
  title: 'Expenses',
  url: '/expenses',
  icon: PoundSterling,
  module: CRM_MODULES.EXPENSES
}];

// Items accessible by manager and owner (Reports, Analytics)
const managerPlusItems: NavigationItem[] = [{
  title: 'Reports',
  url: '/reports',
  icon: BarChart3,
  module: CRM_MODULES.REPORTS
}, {
  title: 'Analytics',
  url: '/analytics',
  icon: Activity,
  module: CRM_MODULES.ANALYTICS
}];

// Items only accessible by owner (Settings)
const ownerOnlyItems: NavigationItem[] = [{
  title: 'Settings',
  url: '/settings',
  icon: Settings,
  module: CRM_MODULES.SETTINGS
}];
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
    ...navigationItems,
    ...managerPlusItems,
    ...ownerOnlyItems
  ].filter(item => !item.module || canAccess(item.module));
  const isCollapsed = state === 'collapsed';
  return <TooltipProvider>
      <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon" variant="sidebar">
        <SidebarHeader className="header-divider flex items-center justify-center px-2 py-4">
          {isCollapsed ? <Tooltip>
              <TooltipTrigger asChild>
                <img src="/new-logo.png" alt="Sourced Jewellers" className="w-10 object-contain cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sourced Jewellers</p>
              </TooltipContent>
            </Tooltip> :
            <img src="/new-logo.png" alt="Sourced Jewellers" className="max-h-[56px] w-[60%] object-contain" />
          }
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className={isCollapsed ? "gap-2" : ""}>
                {allItems.map(item => {
                if (item.subItems) {
                  // Handle expandable menu items (like Sales and Products)
                  const isExpanded = item.title === 'Sales/POS' ? salesExpanded : productsExpanded;
                  const setExpanded = item.title === 'Sales/POS' ? setSalesExpanded : setProductsExpanded;
                  const hasActiveChild = item.subItems.some(sub => isActive(sub.url));
                  if (isCollapsed) {
                    // Collapsed: show flyout on hover
                    return <SidebarMenuItem key={item.title} className="flex justify-center">
                          <FlyoutSubmenu title={item.title} icon={item.icon} subItems={item.subItems} isActive={isActive} />
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
                              {item.subItems.map(subItem => <SidebarMenuSubItem key={subItem.title}>
                                  <NavLink to={subItem.url} end className={getNavClass}>
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
                            <NavLink to={item.url} end className={({
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
                        </Tooltip> : <NavLink to={item.url} end className={getNavClass}>
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
          <div className="space-y-3">
            {!isCollapsed ? <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-background))] text-xs font-medium">
                    {user?.email ? getUserInitials(user.email) : 'LI'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {user?.email}
                  </p>
                  <Badge variant={ROLE_BADGE_VARIANTS[role]} className={role === 'owner' ? 'text-xs mt-0.5 bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-background))]' : 'text-xs mt-0.5'}>
                    {ROLE_LABELS[role]}
                  </Badge>
                </div>
              </div> : <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-background))] text-xs font-medium">
                        {user?.email ? getUserInitials(user.email) : 'LI'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                </TooltipContent>
              </Tooltip>}
            
            <div className={isCollapsed ? "flex flex-col gap-1 items-center" : "flex gap-1"}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`transition-all duration-[160ms] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))] outline-none ${isCollapsed ? "w-11 h-11 p-0" : "flex-1"}`} aria-label="Toggle theme">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {!isCollapsed && <span className="ml-2">Theme</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Toggle theme</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={signOut} className={`transition-all duration-[160ms] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))] outline-none ${isCollapsed ? "w-11 h-11 p-0" : "flex-1"}`} aria-label="Sign out">
                    <LogOut className="h-4 w-4" />
                    {!isCollapsed && <span className="ml-2">Sign Out</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>;
}