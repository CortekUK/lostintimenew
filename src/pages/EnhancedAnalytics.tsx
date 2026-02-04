import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { StockAlerts } from '@/components/performance/StockAlerts';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { ProductMixReport } from '@/components/reports/ProductMixReport';
import { SupplierSpendReport } from '@/components/reports/SupplierSpendReport';
import { BrandAnalyticsReport } from '@/components/reports/BrandAnalyticsReport';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  Building2, 
  Database, 
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock,
  ChevronRight,
  Star
} from 'lucide-react';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { useAnalyticsOverview } from '@/hooks/useAnalyticsOverview';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function EnhancedAnalytics() {
  const isOwner = useOwnerGuard();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: overviewData, isLoading: isLoadingOverview } = useAnalyticsOverview();

  if (!isOwner) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Access Restricted</h3>
            <p className="text-muted-foreground">
              Advanced analytics are only available to business owners.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Analytics</h1>
          <p className="text-muted-foreground">
            Advanced business intelligence and performance monitoring
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-[80px] text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-[80px] text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Product Mix</span>
              <span className="sm:hidden">Products</span>
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-[80px] text-xs sm:text-sm">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Brand Analytics</span>
              <span className="sm:hidden">Brands</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-[80px] text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-[80px] text-xs sm:text-sm">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Trail</span>
              <span className="sm:hidden">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-[80px] text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Performance Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Product Performance</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('products')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverview ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {overviewData?.topProduct ? (
                        <div className="border rounded-lg p-4 bg-success/5 border-success/20">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Best Performer</div>
                            <Badge variant="default" className="bg-success text-success-foreground">
                              Top Revenue
                            </Badge>
                          </div>
                          <div className="font-semibold text-lg">{overviewData.topProduct.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Revenue: £{Number(overviewData.topProduct.revenue || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {overviewData.topProduct.units_sold} units sold
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No product data available
                        </div>
                      )}

                      {overviewData?.bottomProduct && overviewData.bottomProduct.revenue > 0 ? (
                        <div className="border rounded-lg p-4 bg-destructive/5 border-destructive/20">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Lowest Performer</div>
                            <Badge variant="outline" className="border-destructive/50 text-destructive">
                              Low Revenue
                            </Badge>
                          </div>
                          <div className="font-semibold">{overviewData.bottomProduct.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Revenue: £{Number(overviewData.bottomProduct.revenue || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {overviewData.bottomProduct.units_sold} units sold
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supplier Analysis Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Supplier Analysis</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('suppliers')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverview ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {overviewData?.topSupplier ? (
                        <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Top Supplier by Spend</div>
                            <Badge variant="default">
                              Highest Spend
                            </Badge>
                          </div>
                          <div className="font-semibold text-lg">{overviewData.topSupplier.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Total Spend: £{Number(overviewData.topSupplier.total_spend || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <Button
                            variant="link"
                            className="h-auto p-0 mt-2 text-primary"
                            onClick={() => navigate(`/suppliers/${overviewData.topSupplier.supplier_id}`)}
                          >
                            View supplier details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No supplier data available
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Activity Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>System Activity</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('audit')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverview ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {overviewData?.recentAudit && overviewData.recentAudit.length > 0 ? (
                        overviewData.recentAudit.map((entry: any) => (
                          <div key={entry.id} className="border border-border rounded p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  entry.action === 'insert' ? 'default' :
                                  entry.action === 'update' ? 'secondary' :
                                  'destructive'
                                }>
                                  {entry.action.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {entry.table_name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(entry.occurred_at), 'HH:mm:ss')}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No recent activity
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Business Health Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Business Health</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('alerts')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOverview ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {overviewData && overviewData.stockAlertsCount > 0 ? (
                        <div className={`border rounded-lg p-4 ${
                          overviewData.outOfStockCount > 0 
                            ? 'bg-destructive/5 border-destructive/20' 
                            : 'bg-warning/5 border-warning/20'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-sm font-medium text-muted-foreground">Stock Alerts</div>
                            <Badge variant={overviewData.outOfStockCount > 0 ? "destructive" : "secondary"}>
                              {overviewData.stockAlertsCount} Items
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {overviewData.outOfStockCount > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-destructive" />
                                <span className="text-sm">
                                  <span className="font-semibold">{overviewData.outOfStockCount}</span> out of stock
                                </span>
                              </div>
                            )}
                            {overviewData.stockAlertsCount - overviewData.outOfStockCount > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-warning" />
                                <span className="text-sm">
                                  <span className="font-semibold">{overviewData.stockAlertsCount - overviewData.outOfStockCount}</span> at reorder threshold
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-6 bg-success/5 border-success/20 text-center">
                          <div className="text-success text-sm font-medium">
                            ✓ All products have adequate stock levels
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <ProductMixReport />
          </TabsContent>

          <TabsContent value="brands">
            <BrandAnalyticsReport />
          </TabsContent>

          <TabsContent value="suppliers">
            <SupplierSpendReport />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="alerts">
            <StockAlerts />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}