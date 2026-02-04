import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SkipLink } from '@/components/accessibility/SkipLink';
import { useNetworkNotifications } from '@/components/ui/toast-notifications';
import { EnhancedOfflineIndicator } from '@/components/offline/EnhancedOfflineIndicator';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { DevTools } from '@/components/dev/DevTools';
import { Loader2 } from 'lucide-react';

// Lazy load pages for code splitting with preload support
const lazyWithPreload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  const Component = lazy(factory);
  (Component as any).preload = factory;
  return Component;
};

const Dashboard = lazyWithPreload(() => import("./pages/Dashboard"));
const Products = lazyWithPreload(() => import("./pages/Products"));
const Suppliers = lazyWithPreload(() => import("./pages/Suppliers"));
const SupplierDetail = lazyWithPreload(() => import("./pages/SupplierDetail"));
const Customers = lazyWithPreload(() => import("./pages/Customers"));
const CustomerDetail = lazyWithPreload(() => import("./pages/CustomerDetail"));
const EnhancedSales = lazyWithPreload(() => import("./pages/EnhancedSales"));
const MySales = lazyWithPreload(() => import("./pages/MySales"));
const MyCommission = lazyWithPreload(() => import("./pages/MyCommission"));
const Transactions = lazyWithPreload(() => import("./pages/Transactions"));
const SaleDetail = lazyWithPreload(() => import("./pages/SaleDetail"));
const SoldItemsReport = lazyWithPreload(() => import("./pages/SoldItemsReport"));
const SalesHistory = lazyWithPreload(() => import("./pages/SalesHistory"));
const SoldItems = lazyWithPreload(() => import("./pages/SoldItems"));
const Expenses = lazyWithPreload(() => import("./pages/Expenses"));
const Reports = lazyWithPreload(() => import("./pages/Reports"));
const EnhancedAnalytics = lazyWithPreload(() => import("./pages/EnhancedAnalytics"));
const Consignments = lazyWithPreload(() => import("./pages/Consignments"));
const DepositOrders = lazyWithPreload(() => import("./pages/DepositOrders"));
const DepositOrderDetail = lazyWithPreload(() => import("./pages/DepositOrderDetail"));
const Settings = lazyWithPreload(() => import("./pages/Settings"));
const Auth = lazyWithPreload(() => import("./pages/Auth"));
const Receipt = lazyWithPreload(() => import("./pages/Receipt"));
const ReceiptPreview = lazyWithPreload(() => import("./pages/ReceiptPreview"));
const NotFound = lazyWithPreload(() => import("./pages/NotFound"));

// Route to component mapping for preloading
export const routePreloadMap: Record<string, { preload: () => Promise<any> }> = {
  '/': Dashboard,
  '/products': Products,
  '/suppliers': Suppliers,
  '/customers': Customers,
  '/consignments': Consignments,
  '/deposits': DepositOrders,
  '/sales': EnhancedSales,
  '/sales/my-sales': MySales,
  '/sales/my-commission': MyCommission,
  '/sales/transactions': Transactions,
  '/sales/items': SoldItemsReport,
  '/expenses': Expenses,
  '/reports': Reports,
  '/analytics': EnhancedAnalytics,
  '/settings': Settings,
};

// Loading fallback component with fade-in transition
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen animate-in fade-in duration-300">
    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
  </div>
);

// Preload core pages after initial render
const usePreloadPages = () => {
  useEffect(() => {
    // Wait for initial page to load, then preload common pages
    const timer = setTimeout(() => {
      const corePagesToPreload = [Dashboard, Products, Customers, EnhancedSales];
      corePagesToPreload.forEach(component => {
        if ((component as any).preload) {
          (component as any).preload();
        }
      });
    }, 2000); // Start preloading 2s after mount
    
    return () => clearTimeout(timer);
  }, []);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache retention
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && 'status' in error && typeof error.status === 'number') {
          return error.status >= 500 && failureCount < 3;
        }
        return failureCount < 3;
      },
    },
  },
});

function AppInner() {
  useNetworkNotifications();
  usePreloadPages(); // Preload core pages after initial render
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans antialiased">
        <SkipLink />
        <WelcomeModal />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute module="suppliers"><Suppliers /></ProtectedRoute>} />
            <Route path="/suppliers/:id" element={<ProtectedRoute module="suppliers"><SupplierDetail /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute module="customers"><Customers /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute module="customers"><CustomerDetail /></ProtectedRoute>} />
            <Route path="/consignments" element={<ProtectedRoute module="consignments"><Consignments /></ProtectedRoute>} />
            <Route path="/deposits" element={<ProtectedRoute module="sales"><DepositOrders /></ProtectedRoute>} />
            <Route path="/deposits/:id" element={<ProtectedRoute module="sales"><DepositOrderDetail /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute module="sales"><EnhancedSales /></ProtectedRoute>} />
            <Route path="/sales/my-sales" element={<ProtectedRoute module="sales"><MySales /></ProtectedRoute>} />
            <Route path="/sales/my-commission" element={<ProtectedRoute module="sales"><MyCommission /></ProtectedRoute>} />
            <Route path="/sales/transactions" element={<ProtectedRoute module="sales"><Transactions /></ProtectedRoute>} />
            <Route path="/sales/items" element={<ProtectedRoute module="sales"><SoldItemsReport /></ProtectedRoute>} />
            {/* Legacy redirects */}
            <Route path="/sales/history" element={<ProtectedRoute module="sales"><SalesHistory /></ProtectedRoute>} />
            <Route path="/sales/sold-items" element={<ProtectedRoute module="sales"><SoldItems /></ProtectedRoute>} />
            <Route path="/sales/:id" element={<ProtectedRoute module="sales"><SaleDetail /></ProtectedRoute>} />
            <Route path="/receipt/:id" element={<ProtectedRoute module="sales"><Receipt /></ProtectedRoute>} />
            <Route path="/pos/receipt/:saleId" element={<ProtectedRoute module="sales"><ReceiptPreview /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute module="expenses"><Expenses /></ProtectedRoute>} />
            
            {/* Manager+ Routes (Reports & Analytics) */}
            <Route path="/reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
            <Route path="/advanced-reports" element={<Navigate to="/reports?tab=products" replace />} />
            <Route path="/analytics" element={<ProtectedRoute module="analytics"><EnhancedAnalytics /></ProtectedRoute>} />

            {/* Owner-only Routes */}
            <Route path="/settings" element={<ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />
            
            {/* 404 Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <EnhancedOfflineIndicator />
        <DevTools />
      </div>
    </BrowserRouter>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppInner />
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
