import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleTable, Column } from '@/components/ui/simple-table';
import { RecordPayoutDialog } from '@/components/consignments/RecordPayoutDialog';
import { useSupplierConsignments } from '@/hooks/useSupplierTradeInsConsignments';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { useSupplier } from '@/hooks/useSuppliers';
import { Download, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { exportActiveStockCSV, exportUnsettledSalesCSV, exportSettledConsignmentsCSV } from '@/utils/consignmentExport';

interface SupplierConsignmentTabsProps {
  supplierId: number;
}

export function SupplierConsignmentTabs({ supplierId }: SupplierConsignmentTabsProps) {
  const navigate = useNavigate();
  const { data: consignments, isLoading } = useSupplierConsignments(supplierId);
  const { data: supplier } = useSupplier(supplierId);
  const isOwner = useOwnerGuard();
  
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

  const activeStock = consignments?.filter(item => item.status === 'active') || [];
  const unsettledSales = consignments?.filter(item => item.status === 'sold') || [];
  const settledItems = consignments?.filter(item => item.status === 'settled') || [];

  const handleRecordPayout = (item: any) => {
    setSelectedSettlement({
      id: item.settlement_id,
      product: { 
        name: item.product_name,
        consignment_terms: item.consignment_terms 
      },
      supplier: { name: supplier?.name || '' },
      sale_price: item.sold_price || 0,
      payout_amount: item.agreed_payout,
    });
    setPayoutDialogOpen(true);
  };

  const handleExportActiveStock = () => {
    exportActiveStockCSV(activeStock, supplier?.name || 'supplier');
  };

  const handleExportUnsettled = () => {
    exportUnsettledSalesCSV(unsettledSales, supplier?.name || 'supplier');
  };

  const handleExportSettled = () => {
    exportSettledConsignmentsCSV(settledItems, supplier?.name || 'supplier');
  };

  // Check if payment is overdue (>30 days since sale)
  const isPaymentOverdue = (soldAt: string | null | undefined): boolean => {
    if (!soldAt) return false;
    const soldDate = new Date(soldAt);
    const daysSinceSale = (Date.now() - soldDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSale > 30;
  };

  // Check if consignment is expiring soon (within 30 days)
  const isExpiringSoon = (endDate: string | null | undefined): boolean => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const daysUntilExpiry = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const activeStockColumns: Column<any>[] = [
    {
      key: 'product_name',
      title: 'Product Name',
      render: (item) => (
        <button
          onClick={() => navigate(`/products?id=${item.product_id}`)}
          className="text-left hover:text-primary font-medium"
        >
          {item.product_name}
        </button>
      ),
    },
    {
      key: 'internal_sku',
      title: 'SKU',
      render: (item) => (
        <span className="font-mono text-xs">{item.internal_sku}</span>
      ),
    },
    {
      key: 'agreed_payout',
      title: 'Agreed Payout',
      render: (item) => (
        <span className="font-bold text-[#D4AF37]">
          £{item.agreed_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      align: 'right',
    },
    {
      key: 'status',
      title: 'Status',
      render: (item) => {
        const expiring = isExpiringSoon(item.sold_at);
        return expiring ? (
          <Badge variant="outline" className="border-orange-500/50 text-orange-600 bg-orange-500/10">
            ⚠ Expiring Soon
          </Badge>
        ) : (
          <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10">
            Active
          </Badge>
        );
      },
      align: 'center',
    },
  ];

  const unsettledColumns: Column<any>[] = [
    {
      key: 'product_name',
      title: 'Product Name',
      render: (item) => (
        <button
          onClick={() => navigate(`/products?id=${item.product_id}`)}
          className="text-left hover:text-primary font-medium"
        >
          {item.product_name}
        </button>
      ),
    },
    {
      key: 'sold_at',
      title: 'Date Sold',
      render: (item) => item.sold_at ? new Date(item.sold_at).toLocaleDateString() : '-',
    },
    {
      key: 'sold_price',
      title: 'Sale Price',
      render: (item) => (
        <span className="font-mono">
          £{(item.sold_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      align: 'right',
    },
    {
      key: 'agreed_payout',
      title: 'Payout Owed',
      render: (item) => (
        <span className="font-bold text-[#D4AF37]">
          £{item.agreed_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      align: 'right',
    },
    {
      key: 'payment_status',
      title: 'Payment Status',
      render: (item) => {
        const overdue = isPaymentOverdue(item.sold_at);
        return overdue ? (
          <Badge variant="outline" className="border-red-500/50 text-red-600 bg-red-500/10">
            ⚠ Overdue
          </Badge>
        ) : (
          <Badge variant="outline" className="border-orange-500/50 text-orange-600 bg-orange-500/10">
            Pending
          </Badge>
        );
      },
      align: 'center',
    },
    ...(isOwner ? [{
      key: 'actions',
      title: 'Actions',
      render: (item: any) => (
        <Button
          size="sm"
          onClick={() => handleRecordPayout(item)}
        >
          Record Settlement
        </Button>
      ),
      align: 'center' as const,
    }] : []),
  ];

  const settledColumns: Column<any>[] = [
    {
      key: 'product_name',
      title: 'Product Name',
      render: (item) => (
        <button
          onClick={() => navigate(`/products?id=${item.product_id}`)}
          className="text-left hover:text-primary font-medium"
        >
          {item.product_name}
        </button>
      ),
    },
    {
      key: 'sold_at',
      title: 'Date Sold',
      render: (item) => item.sold_at ? new Date(item.sold_at).toLocaleDateString() : '-',
    },
    {
      key: 'sold_price',
      title: 'Sale Price',
      render: (item) => (
        <span className="font-mono">
          £{(item.sold_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      align: 'right',
    },
    {
      key: 'payout_completed',
      title: 'Payout Completed',
      render: (item) => (
        <div className="text-right">
          <div className="font-bold text-[#D4AF37]">
            £{item.agreed_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.paid_at ? new Date(item.paid_at).toLocaleDateString() : '-'}
          </div>
        </div>
      ),
      align: 'right',
    },
    {
      key: 'status',
      title: 'Status',
      render: () => (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <Badge variant="outline" className="border-slate-500/50 text-slate-600 bg-slate-500/10">
            Settled
          </Badge>
        </div>
      ),
      align: 'center',
    },
  ];

  return (
    <>
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Stock</TabsTrigger>
          <TabsTrigger value="unsettled">Sold & Unsettled</TabsTrigger>
          <TabsTrigger value="settled">Settled</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-luxury">Active Consignment Stock</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportActiveStock}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {activeStock.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No active consignment stock</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Items on consignment will appear here
                  </p>
                </div>
              ) : (
                <SimpleTable
                  data={activeStock}
                  columns={activeStockColumns}
                  loading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unsettled">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-luxury">Sold & Unsettled</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportUnsettled}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {unsettledSales.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No unsettled sales</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sold items awaiting settlement will appear here
                  </p>
                </div>
              ) : (
                <SimpleTable
                  data={unsettledSales}
                  columns={unsettledColumns}
                  loading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settled">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-luxury">Settlement History</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportSettled}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {settledItems.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No settlement history yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Completed settlements will appear here
                  </p>
                </div>
              ) : (
                <SimpleTable
                  data={settledItems}
                  columns={settledColumns}
                  loading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedSettlement && (
        <RecordPayoutDialog
          open={payoutDialogOpen}
          onOpenChange={setPayoutDialogOpen}
          settlement={selectedSettlement}
        />
      )}
    </>
  );
}
