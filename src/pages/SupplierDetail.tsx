import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
import { useSupplierMetrics } from '@/hooks/useSupplierMetrics';
import { useSupplierProducts, useSupplierTransactions, useSupplierSpendTrend } from '@/hooks/useSupplierDetails';
import { useFilteredExpenses } from '@/hooks/useExpenseAnalytics';
import { useSupplierDocuments, useUploadSupplierDocument, useDeleteSupplierDocument } from '@/hooks/useSupplierDocuments';
import { useBusinessFinancialKPIs } from '@/hooks/useBusinessFinancials';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Tag, Package, TrendingUp, Calendar, FileText, Upload, Download, Trash2, Eye, ExternalLink, Loader2, Building2, User, Repeat, FileDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SupplierKPICards } from '@/components/suppliers/SupplierKPICards';
import { SourceSummaryCard } from '@/components/suppliers/SourceSummaryCard';
import { CustomerInventoryTabs } from '@/components/suppliers/CustomerInventoryTabs';
import { CustomerFinancialsTab } from '@/components/suppliers/CustomerFinancialsTab';
import { AtAGlanceCard } from '@/components/suppliers/AtAGlanceCard';
import { exportSupplierFinancialCSV } from '@/utils/supplierExport';
import { SupplierDocumentsTab } from '@/components/suppliers/SupplierDocumentsTab';
import { ConsignmentSummaryCards } from '@/components/suppliers/ConsignmentSummaryCards';
import { SupplierConsignmentTabs } from '@/components/suppliers/SupplierConsignmentTabs';
import { useSupplierConsignments } from '@/hooks/useSupplierTradeInsConsignments';
import { EditSupplierDialog } from '@/components/suppliers/EditSupplierDialog';
import { CustomerPXHistoryTab } from '@/components/suppliers/CustomerPXHistoryTab';
import { SupplierActivityFeed } from '@/components/suppliers/SupplierActivityFeed';
import { SupplierQuickNotesCard } from '@/components/suppliers/SupplierQuickNotesCard';
import { MiniSpendChart } from '@/components/suppliers/MiniSpendChart';

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplierId = parseInt(id || '0');
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productsFilter, setProductsFilter] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const inventoryRef = useRef<HTMLDivElement>(null);

  const { data: supplier, isLoading: supplierLoading } = useSupplier(supplierId);
  const { data: metrics } = useSupplierMetrics(supplierId);
  const { data: products, isLoading: productsLoading } = useSupplierProducts(supplierId);
  const { data: transactions } = useSupplierTransactions(supplierId);
  const { data: spendTrend } = useSupplierSpendTrend(supplierId);
  const { data: documents } = useSupplierDocuments(supplierId);
  const { data: businessKPIs } = useBusinessFinancialKPIs(supplierId);
  const { data: consignments } = useSupplierConsignments(supplierId);
  const { data: supplierExpenses = [] } = useFilteredExpenses({ suppliers: [supplierId] });
  
  const isOwner = useOwnerGuard();
  
  const uploadMutation = useUploadSupplierDocument();
  const deleteMutation = useDeleteSupplierDocument();

  const filteredProducts = products?.filter(product => {
    if (productsFilter === 'all') return true;
    if (productsFilter === 'consignment') return product.is_consignment;
    if (productsFilter === 'normal') return !product.is_consignment && !product.is_trade_in;
    return false;
  }) || [];

  const getStockStatus = (product: any) => {
    // This would typically come from a stock view, but for now we'll use a placeholder
    return 'In Stock'; // Could be 'Low Stock', 'Out of Stock'
  };

  if (supplierLoading) {
    return (
      <AppLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout title="Supplier Not Found">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Supplier not found</h2>
          <Button onClick={() => navigate('/suppliers')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </div>
      </AppLayout>
    );
  }

  const supplierMetrics = Array.isArray(metrics) ? metrics[0] : metrics;
  const hasConsignments = supplier?.supplier_type === 'customer' && (consignments?.length || 0) > 0;
  const isCustomer = supplier?.supplier_type === 'customer';

  const handleProductsClick = () => {
    inventoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppLayout 
      title={supplier.name}
      subtitle="Supplier Details"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {supplier.supplier_type === 'customer' && (
              <Badge variant="customer">Customer</Badge>
            )}
            <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
              {supplier.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {supplier.supplier_type === 'customer' && (
              <Button 
                onClick={() => setActiveTab('px-history')} 
                variant="outline" 
                size="sm"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Part-Exchange History
              </Button>
            )}
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <SupplierKPICards
          supplierId={supplierId}
          supplierType={supplier.supplier_type}
          productCount={products?.length || 0}
          inventorySpend={supplierMetrics?.inventory_spend_this_year || 0}
          expenseSpend={supplierMetrics?.expense_spend_this_year || 0}
          totalSpend={supplierMetrics?.total_spend_this_year || 0}
          onProductsClick={handleProductsClick}
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1">
            <TabsTrigger value="overview" className="flex-1 min-w-[80px] text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 min-w-[80px] text-xs sm:text-sm">Inventory</TabsTrigger>
            <TabsTrigger value="financials" className="flex-1 min-w-[80px] text-xs sm:text-sm">Financials</TabsTrigger>
            {isCustomer && <TabsTrigger value="px-history" className="flex-1 min-w-[80px] text-xs sm:text-sm">PX History</TabsTrigger>}
            {hasConsignments && <TabsTrigger value="consignments" className="flex-1 min-w-[80px] text-xs sm:text-sm">Consignments</TabsTrigger>}
            <TabsTrigger value="documents" className="flex-1 min-w-[80px] text-xs sm:text-sm">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Row 1: Contact & At-a-glance */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-luxury">
                    {supplier.supplier_type === 'customer' ? 'Customer Details' : 'Contact & Company'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supplier.contact_name ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Contact Person</p>
                        <p className="font-medium">{supplier.contact_name}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground">Contact Person</p>
                        <p className="text-sm text-muted-foreground italic">Not specified</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`} className="font-medium hover:text-primary">
                            {supplier.email}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Not specified</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`} className="font-medium hover:text-primary">
                            {supplier.phone}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Not specified</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        {supplier.address ? (
                          <p className="font-medium whitespace-pre-line">{supplier.address}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Source Summary Card (Customer Suppliers Only) */}
              {supplier.supplier_type === 'customer' ? (
                <SourceSummaryCard supplierId={supplierId} />
              ) : (
                <AtAGlanceCard supplierId={supplierId} tags={supplier.tags} />
              )}
            </div>

            {/* Row 2: Notes + Mini Spend Chart (for registered suppliers) */}
            {supplier.supplier_type !== 'customer' && (
              <div className="grid md:grid-cols-2 gap-4">
                <SupplierQuickNotesCard supplierId={supplierId} notes={supplier.notes} />
                <MiniSpendChart spendTrend={spendTrend} months={6} />
              </div>
            )}

            {/* Row 3: Recent Activity (for registered suppliers) */}
            {supplier.supplier_type !== 'customer' && (
              <SupplierActivityFeed supplierId={supplierId} />
            )}

            {/* Consignment Summary Cards for Customer Suppliers */}
            {hasConsignments && (
              <div className="mt-6">
                <h3 className="font-luxury text-lg font-semibold mb-4">Consignment Overview</h3>
                <ConsignmentSummaryCards supplierId={supplierId} />
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card ref={inventoryRef}>
              <CardHeader>
                <CardTitle className="font-luxury">
                  {supplier.supplier_type === 'customer' ? 'Customer Inventory' : 'Linked Products'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplier.supplier_type === 'customer' ? (
                  <CustomerInventoryTabs supplierId={supplierId} />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Select value={productsFilter} onValueChange={setProductsFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="consignment">Consignment</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => navigate(`/products?supplier=${supplierId}`)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View in Products
                        </Button>
                      </div>
                    </div>
                    {productsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No products linked to this supplier</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Products will appear here when linked to this supplier
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Product Name</th>
                      <th className="text-left py-2">SKU</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-left py-2">Metal/Karat</th>
                      <th className="text-right py-2">Unit Cost</th>
                      <th className="text-center py-2">Type</th>
                      <th className="text-center py-2">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-medium">
                          <button
                            onClick={() => navigate(`/products?id=${product.id}`)}
                            className="hover:text-primary text-left"
                          >
                            {product.name}
                          </button>
                        </td>
                        <td className="py-2 font-mono text-xs">{product.internal_sku}</td>
                        <td className="py-2">{product.category || '-'}</td>
                        <td className="py-2">{product.metal ? `${product.metal}${product.karat ? ` ${product.karat}` : ''}` : '-'}</td>
                        <td className="py-2 text-right font-mono">£{(product.unit_cost || 0).toLocaleString()}</td>
                        <td className="py-2 text-center">
                          {product.is_consignment ? (
                            <Badge variant="outline">Consignment</Badge>
                          ) : product.is_trade_in ? (
                            <Badge variant="secondary">Trade-In</Badge>
                          ) : (
                            <Badge variant="default">Normal</Badge>
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="secondary">{getStockStatus(product)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials">
            {supplier.supplier_type === 'customer' ? (
              <CustomerFinancialsTab supplierId={supplierId} />
            ) : (
              <div>
              {supplierExpenses.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="font-luxury">Recent Expenses from this Supplier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {supplierExpenses.slice(0, 5).map((expense: any) => (
                        <div key={expense.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(expense.incurred_at).toLocaleDateString()}</p>
                          </div>
                          <p className="font-mono font-bold">£{Number(expense.amount).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={() => navigate(`/expenses?supplier=${supplierId}`)}>
                      View All Expenses
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="font-luxury">Financial Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enhanced KPI Cards */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Spend (Lifetime)</div>
                        <div className="font-luxury text-xl font-bold text-[#D4AF37]">
                          £{(businessKPIs?.totalSpendLifetime || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">All time</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Spend (YTD)</div>
                        <div className="font-luxury text-xl font-bold text-[#D4AF37]">
                          £{(businessKPIs?.totalSpendYTD || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">Jan - Dec</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Avg Unit Cost</div>
                        <div className="font-luxury text-xl font-bold">
                          £{(businessKPIs?.avgUnitCost || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">Per product</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">% of Total Spend</div>
                        <div className="font-luxury text-xl font-bold">
                          {(businessKPIs?.percentOfTotalSpend || 0).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Share of all suppliers</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Spend Trend Chart */}
                  <div>
                    <h3 className="font-luxury text-lg font-semibold mb-4">Monthly Spend Trend</h3>
                    {spendTrend && spendTrend.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={spendTrend}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              formatter={(value) => [`£${Number(value).toLocaleString()}`, '']} 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Bar dataKey="stockSpend" stackId="a" fill="hsl(var(--primary))" name="Stock Purchases" />
                            <Bar dataKey="expenseSpend" stackId="a" fill="hsl(var(--secondary))" name="Other Expenses" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg bg-muted/30">
                        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <p className="text-muted-foreground font-medium">No spend data available</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Spend trends will appear after transactions are recorded
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-luxury text-lg font-semibold">Recent Transactions</h3>
                      {transactions && transactions.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportSupplierFinancialCSV(supplier.name, transactions)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      )}
                    </div>
                    {transactions && transactions.length > 0 ? (
                      <div className="space-y-2">
                        {transactions.slice(0, 5).map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                transaction.type === 'stock_purchase' ? 'bg-primary/10' : 'bg-secondary/10'
                              }`}>
                                {transaction.type === 'stock_purchase' ? (
                                  <Package className="h-4 w-4" />
                                ) : (
                                  <TrendingUp className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#D4AF37]">
                                £{transaction.amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {transaction.type.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <p className="text-muted-foreground font-medium">No transactions yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Financial activity will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>
            )}
          </TabsContent>

          {/* Consignments Tab (Customer Suppliers Only) */}
          {hasConsignments && (
            <TabsContent value="consignments">
              <SupplierConsignmentTabs supplierId={supplierId} />
            </TabsContent>
          )}

          {/* PX History Tab (Customer Suppliers Only) */}
          {isCustomer && (
            <TabsContent value="px-history">
              <CustomerPXHistoryTab supplierId={supplierId} />
            </TabsContent>
          )}

          {/* Documents Tab */}
          <TabsContent value="documents">
            <SupplierDocumentsTab supplierId={supplierId} />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        {isOwner && supplier && (
          <EditSupplierDialog
            supplier={supplier}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}
      </div>
    </AppLayout>
  );
}
