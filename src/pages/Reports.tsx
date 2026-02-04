import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { FinancialTab } from '@/components/reports/FinancialTab';
import { ProductsTab } from '@/components/reports/ProductsTab';
import { SuppliersTab } from '@/components/reports/SuppliersTab';
import { StaffCommissionTab } from '@/components/reports/StaffCommissionTab';
import { BarChart3, Building2, PoundSterling, Package, Coins } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export default function ConsolidatedReports() {
  const { isOwner } = usePermissions();
  // Only owners can see financial reports, managers default to products tab
  const [activeTab, setActiveTab] = useState(isOwner ? 'financial' : 'products');

  return (
    <AppLayout 
      title="Reports"
      subtitle="Comprehensive financial reporting and business analytics"
    >
      <div className="space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1">
            {/* Financial tab - Owner only */}
            {isOwner && (
              <TabsTrigger value="financial" className="flex items-center gap-2 flex-1 min-w-[100px]">
                <PoundSterling className="h-4 w-4" />
                <span className="hidden sm:inline">Financial</span>
                <span className="sm:hidden">Finance</span>
              </TabsTrigger>
            )}
            {/* Commission tab - Owner only */}
            {isOwner && (
              <TabsTrigger value="commission" className="flex items-center gap-2 flex-1 min-w-[100px]">
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">Commission</span>
                <span className="sm:hidden">Comm</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="products" className="flex items-center gap-2 flex-1 min-w-[100px]">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2 flex-1 min-w-[100px]">
              <Building2 className="h-4 w-4" />
              Suppliers
            </TabsTrigger>
          </TabsList>

          {/* Financial reports - Owner only */}
          {isOwner && (
            <TabsContent value="financial">
              <FinancialTab />
            </TabsContent>
          )}

          {/* Commission reports - Owner only */}
          {isOwner && (
            <TabsContent value="commission">
              <StaffCommissionTab />
            </TabsContent>
          )}

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersTab />
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}
