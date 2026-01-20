import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductDetailModal } from '@/components/modals/ProductDetailModal';
import { SimpleTable, Column } from '@/components/ui/simple-table';
import { RecordPayoutDialog } from '@/components/consignments/RecordPayoutDialog';
import {
  useConsignmentProducts,
  useConsignmentSettlements,
  isConsignmentExpiringSoon,
  isPaymentOverdue
} from '@/hooks/useConsignments';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Package,
  AlertCircle,
  PoundSterling,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';
import {
  exportAllActiveStockCSV,
  exportAllUnsettledSalesCSV,
  exportAllSettledConsignmentsCSV
} from '@/utils/consignmentExportAll';

export default function Consignments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [supplierTypeFilter, setSupplierTypeFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

  const { canEdit } = usePermissions();
  const canEditConsignments = canEdit(CRM_MODULES.CONSIGNMENTS);

  const { data: consignmentData, isLoading: productsLoading } = useConsignmentProducts();
  const { data: settlements = [], isLoading: settlementsLoading } = useConsignmentSettlements();

  const products = consignmentData?.products || [];
  const totalConsignmentValue = consignmentData?.totalValue || 0;

  const activeProducts = products.filter(p => 
    p.stock && p.stock.qty_on_hand > 0
  );

  const soldUnsettledSettlements = settlements.filter(s => !s.paid_at);
  const settledSettlements = settlements.filter(s => s.paid_at);

  // Filter by supplier type
  const filteredActiveProducts = activeProducts.filter(p => 
    supplierTypeFilter === 'all' || 
    p.consignment_supplier?.supplier_type === supplierTypeFilter
  );

  const filteredUnsettledSettlements = soldUnsettledSettlements.filter(s =>
    supplierTypeFilter === 'all' || 
    s.supplier?.supplier_type === supplierTypeFilter
  );

  const filteredSettledSettlements = settledSettlements.filter(s =>
    supplierTypeFilter === 'all' || 
    s.supplier?.supplier_type === supplierTypeFilter
  );

  const totalUnsettled = soldUnsettledSettlements.reduce((sum, s) => 
    sum + (Number(s.payout_amount) || 0), 0
  );

  const totalSettledValue = settledSettlements.reduce((sum, s) => 
    sum + (Number(s.payout_amount) || 0), 0
  );

  // Export handlers
  const handleExportActiveStock = () => {
    const exportData = activeProducts.map(p => ({
      supplier_name: p.consignment_supplier?.name || '-',
      product_name: p.name,
      internal_sku: p.internal_sku,
      cost: Number(p.unit_cost) || 0,
      agreed_price: Number(p.unit_price) || 0,
      start_date: p.consignment_start_date,
      status: isConsignmentExpiringSoon(p.consignment_end_date) 
        ? 'Expiring Soon' 
        : p.stock?.qty_on_hand === 0 
          ? 'Out of Stock' 
          : 'Active'
    }));
    exportAllActiveStockCSV(exportData);
  };

  const handleExportUnsettled = () => {
    const exportData = soldUnsettledSettlements.map(s => ({
      supplier_name: s.supplier?.name || '-',
      product_name: s.product?.name || '-',
      internal_sku: s.product?.internal_sku || '-',
      sold_at: s.sale?.sold_at,
      sale_price: Number(s.sale_price) || 0,
      payout_owed: Number(s.payout_amount) || 0,
      payment_status: isPaymentOverdue(s.sale?.sold_at) ? 'Overdue' : 'Pending Settlement'
    }));
    exportAllUnsettledSalesCSV(exportData);
  };

  const handleExportSettled = () => {
    const exportData = settledSettlements.map(s => ({
      supplier_name: s.supplier?.name || '-',
      product_name: s.product?.name || '-',
      internal_sku: s.product?.internal_sku || '-',
      sold_at: s.sale?.sold_at,
      sale_price: Number(s.sale_price) || 0,
      payout_amount: Number(s.payout_amount) || 0,
      settlement_date: s.paid_at
    }));
    exportAllSettledConsignmentsCSV(exportData);
  };

  // Active Stock Table Columns
  const activeStockColumns: Column<any>[] = [
    {
      key: 'consignment_supplier.name',
      title: 'Supplier',
      width: 280,
      sortable: true,
      align: 'left',
      render: (_, product) => (
        <div 
          className="cursor-pointer hover:text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (product.consignment_supplier?.id) {
              navigate(`/suppliers/${product.consignment_supplier.id}`);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{product.consignment_supplier?.name || '-'}</span>
            {product.consignment_supplier?.supplier_type === 'customer' && (
              <Badge variant="secondary" className="text-xs">Individual</Badge>
            )}
          </div>
          {product.consignment_supplier?.email && (
            <div className="text-xs text-muted-foreground">{product.consignment_supplier.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'name',
      title: 'Product',
      width: 250,
      sortable: true,
      align: 'left',
      render: (_, product) => (
        <div 
          className="cursor-pointer hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product);
            setViewModalOpen(true);
          }}
        >
          <div className="font-medium">{product.name}</div>
          <div className="text-xs text-muted-foreground">{product.internal_sku}</div>
        </div>
      )
    },
    {
      key: 'unit_cost',
      title: 'Cost',
      width: 120,
      sortable: true,
      align: 'right',
      render: (_, product) => (
        <div className="font-medium text-[#D4AF37]">
          {formatCurrency(Number(product.unit_cost) || 0)}
        </div>
      )
    },
    {
      key: 'unit_price',
      title: 'Agreed Sell Price',
      width: 150,
      sortable: true,
      align: 'right',
      render: (_, product) => (
        <div className="font-medium text-[#D4AF37]">
          {formatCurrency(Number(product.unit_price) || 0)}
        </div>
      )
    },
    {
      key: 'consignment_start_date',
      title: 'Consignment Start Date',
      width: 170,
      sortable: true,
      align: 'left',
      render: (_, product) => (
        <div className="text-sm">
          {product.consignment_start_date 
            ? format(new Date(product.consignment_start_date), 'dd MMM yyyy')
            : '-'}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Current Stock Status',
      width: 180,
      align: 'left',
      render: (_, product) => {
        const qty = product.stock?.qty_on_hand || 0;
        const expiringSoon = isConsignmentExpiringSoon(product.consignment_end_date);
        const outOfStock = qty === 0;
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{qty} units</span>
            <span className="text-muted-foreground">•</span>
            {outOfStock ? (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                Out of Stock
              </Badge>
            ) : expiringSoon ? (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expiring Soon
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Active
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 140,
      align: 'right',
      render: (_, product) => (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product);
            setViewModalOpen(true);
          }}
        >
          <Eye className="h-4 w-4" />
          View Details
        </Button>
      )
    }
  ];

  // Sold & Unsettled Table Columns
  const unsettledColumns: Column<any>[] = [
    {
      key: 'product.name',
      title: 'Product Name',
      width: 250,
      sortable: true,
      align: 'left',
      render: (_, settlement) => (
        <div>
          <div className="font-medium">{settlement.product?.name || '-'}</div>
          <div className="text-xs text-muted-foreground">{settlement.product?.internal_sku}</div>
        </div>
      )
    },
    {
      key: 'supplier.name',
      title: 'Supplier',
      width: 280,
      sortable: true,
      align: 'left',
      render: (_, settlement) => (
        <div 
          className="cursor-pointer hover:text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (settlement.supplier_id) {
              navigate(`/suppliers/${settlement.supplier_id}`);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{settlement.supplier?.name || '-'}</span>
            {settlement.supplier?.supplier_type === 'customer' && (
              <Badge variant="secondary" className="text-xs">Individual</Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'sale.sold_at',
      title: 'Sale Date',
      width: 160,
      sortable: true,
      align: 'left',
      render: (_, settlement) => (
        <div className="text-sm">
          {settlement.sale?.sold_at 
            ? format(new Date(settlement.sale.sold_at), 'dd MMM yyyy, HH:mm')
            : '-'}
        </div>
      )
    },
    {
      key: 'sale_price',
      title: 'Sale Price',
      width: 130,
      sortable: true,
      align: 'right',
      render: (_, settlement) => (
        <div className="font-medium text-[#D4AF37]">
          {formatCurrency(Number(settlement.sale_price) || 0)}
        </div>
      )
    },
    {
      key: 'payout_amount',
      title: 'Supplier Payout Due',
      width: 160,
      sortable: true,
      align: 'right',
      render: (_, settlement) => (
        <div className="font-bold text-[#D4AF37]">
          {formatCurrency(Number(settlement.payout_amount) || 0)}
        </div>
      )
    },
    {
      key: 'payment_status',
      title: 'Payment Status',
      width: 180,
      align: 'left',
      render: (_, settlement) => {
        const overdue = isPaymentOverdue(settlement.sale?.sold_at);
        return (
          <div className="flex items-center gap-2">
            {overdue ? (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                Pending Settlement
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 240,
      align: 'right',
      render: (_, settlement) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProduct(settlement.product);
              setViewModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          {canEditConsignments && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSettlement(settlement);
                setPayoutDialogOpen(true);
              }}
            >
              Record Payout
            </Button>
          )}
        </div>
      )
    }
  ];

  // Settled Table Columns
  const settledColumns: Column<any>[] = [
    {
      key: 'product.name',
      title: 'Product Name',
      width: 250,
      sortable: true,
      align: 'left',
      render: (_, settlement) => (
        <div>
          <div className="font-medium">{settlement.product?.name || '-'}</div>
          <div className="text-xs text-muted-foreground">{settlement.product?.internal_sku}</div>
        </div>
      )
    },
    {
      key: 'supplier.name',
      title: 'Supplier',
      width: 280,
      sortable: true,
      align: 'left',
      render: (_, settlement) => (
        <div 
          className="cursor-pointer hover:text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (settlement.supplier_id) {
              navigate(`/suppliers/${settlement.supplier_id}`);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{settlement.supplier?.name || '-'}</span>
            {settlement.supplier?.supplier_type === 'customer' && (
              <Badge variant="secondary" className="text-xs">Individual</Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'sale.sold_at',
      title: 'Sale Date',
      width: 140,
      sortable: true,
      align: 'left',
      render: (_, settlement) => (
        <div className="text-sm">
          {settlement.sale?.sold_at 
            ? format(new Date(settlement.sale.sold_at), 'dd MMM yyyy')
            : '-'}
        </div>
      )
    },
    {
      key: 'sale_price',
      title: 'Sale Price',
      width: 130,
      sortable: true,
      align: 'right',
      render: (_, settlement) => (
        <div className="font-medium text-[#D4AF37]">
          {formatCurrency(Number(settlement.sale_price) || 0)}
        </div>
      )
    },
    {
      key: 'payout_amount',
      title: 'Payout Completed',
      width: 180,
      sortable: true,
      align: 'right',
      render: (_, settlement) => (
        <div>
          <div className="font-bold text-[#D4AF37]">
            {formatCurrency(Number(settlement.payout_amount) || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            Paid on {settlement.paid_at ? format(new Date(settlement.paid_at), 'dd MMM yyyy') : '-'}
          </div>
        </div>
      )
    },
    {
      key: 'notes',
      title: 'Settlement Reference',
      width: 180,
      align: 'left',
      render: (_, settlement) => (
        <div className="text-sm truncate" title={settlement.notes || ''}>
          {settlement.notes || '-'}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      width: 120,
      align: 'left',
      render: () => (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <Badge className="bg-slate-100 text-slate-800 border-slate-200">
            Settled
          </Badge>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 120,
      align: 'right',
      render: (_, settlement) => (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(settlement.product);
            setViewModalOpen(true);
          }}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      )
    }
  ];

  return (
    <AppLayout 
      title="Consignment Management"
      subtitle="Track consignment stock, unsettled sales, and supplier settlements"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 auto-rows-fr">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Active Consignment Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{activeProducts.length}</div>
              <p className="text-xs text-muted-foreground">
                Total items currently consigned
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Unsettled Sales</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{soldUnsettledSettlements.length}</div>
              <p className="text-xs text-muted-foreground">
                Sold items awaiting supplier payout
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{formatCurrency(totalUnsettled)}</div>
              <p className="text-xs text-muted-foreground">
                £ value owed across all unsettled sales
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Consignment Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{formatCurrency(totalConsignmentValue)}</div>
              <p className="text-xs text-muted-foreground">
                Current liability to suppliers
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Settled Value</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{formatCurrency(totalSettledValue)}</div>
              <p className="text-xs text-muted-foreground">
                All-time payouts made to suppliers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1">
              <TabsTrigger 
                value="active" 
                className="flex-1 min-w-[80px] text-xs sm:text-sm"
              >
                Active Stock
              </TabsTrigger>
              <TabsTrigger 
                value="sold_unsettled" 
                className="flex-1 min-w-[80px] text-xs sm:text-sm gap-2"
              >
                <span className="hidden sm:inline">Sold & Unsettled</span>
                <span className="sm:hidden">Unsettled</span>
                {soldUnsettledSettlements.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                    {soldUnsettledSettlements.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="settled" 
                className="flex-1 min-w-[80px] text-xs sm:text-sm"
              >
                Settled
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={supplierTypeFilter} onValueChange={setSupplierTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Supplier Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Supplier Types</SelectItem>
              <SelectItem value="registered">Registered Suppliers</SelectItem>
              <SelectItem value="customer">Individual Suppliers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          <TabsContent value="active" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredActiveProducts.length} items
              </div>
              <Button variant="outline" size="sm" onClick={handleExportActiveStock}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <SimpleTable
              data={filteredActiveProducts}
              columns={activeStockColumns}
              loading={productsLoading}
              emptyMessage="No active consignment stock. Add a consignment item →"
              showPagination={true}
              pageSize={50}
            />
          </TabsContent>

          <TabsContent value="sold_unsettled" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredUnsettledSettlements.length} items
              </div>
              <Button variant="outline" size="sm" onClick={handleExportUnsettled}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <SimpleTable
              data={filteredUnsettledSettlements}
              columns={unsettledColumns}
              loading={settlementsLoading}
              emptyMessage="No unsettled sales. All payments are up to date."
              showPagination={true}
              pageSize={50}
            />
          </TabsContent>

          <TabsContent value="settled" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredSettledSettlements.length} items
              </div>
              <Button variant="outline" size="sm" onClick={handleExportSettled}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <SimpleTable
              data={filteredSettledSettlements}
              columns={settledColumns}
              loading={settlementsLoading}
              emptyMessage="No settlement history yet."
              showPagination={true}
              pageSize={50}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          onEditClick={() => {
            setViewModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {selectedSettlement && (
        <RecordPayoutDialog
          open={payoutDialogOpen}
          onOpenChange={setPayoutDialogOpen}
          settlement={selectedSettlement}
        />
      )}
    </AppLayout>
  );
}
