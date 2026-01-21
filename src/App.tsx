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

// Import pages
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import EnhancedSales from "./pages/EnhancedSales";
import MySales from "./pages/MySales";
import MyCommission from "./pages/MyCommission";
import Transactions from "./pages/Transactions";
import SaleDetail from "./pages/SaleDetail";
import SoldItemsReport from "./pages/SoldItemsReport";
import SalesHistory from "./pages/SalesHistory";
import SoldItems from "./pages/SoldItems";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import EnhancedAnalytics from "./pages/EnhancedAnalytics";
import Consignments from "./pages/Consignments";
import PartExchangeIntake from "./pages/PartExchangeIntake";
import DepositOrders from "./pages/DepositOrders";
import DepositOrderDetail from "./pages/DepositOrderDetail";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Receipt from "./pages/Receipt";
import ReceiptPreview from "./pages/ReceiptPreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
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
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans antialiased">
        <SkipLink />
        <WelcomeModal />
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
          <Route path="/products/intake" element={<ProtectedRoute module="products"><PartExchangeIntake /></ProtectedRoute>} />
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
