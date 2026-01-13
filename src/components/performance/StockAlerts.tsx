import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, FileText, Download, PoundSterling } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';

interface BusinessAlert {
  id: string;
  type: 'consignment' | 'aged_inventory' | 'missing_docs';
  product_id: number;
  product_name: string;
  internal_sku: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  value?: number;
  days?: number;
}

interface RestockAlertsProps {
  className?: string;
}

export function StockAlerts({ className }: RestockAlertsProps) {
  const [alertFilter, setAlertFilter] = useState<string>('all');

  const { data: alertData, isLoading } = useQuery({
    queryKey: ['business-alerts'],
    queryFn: async () => {
      const alerts: BusinessAlert[] = [];

      // 1. Unsettled Consignments (payment overdue > 30 days)
      const { data: unsettled, error: unsettledError } = await supabase
        .from('consignment_settlements')
        .select(`
          id,
          product_id,
          sale_price,
          payout_amount,
          products!inner(name, internal_sku),
          sales!inner(sold_at)
        `)
        .is('paid_at', null);

      if (!unsettledError && unsettled) {
        unsettled.forEach((item: any) => {
          const daysSinceSale = differenceInDays(new Date(), new Date(item.sales.sold_at));
          if (daysSinceSale > 30) {
            alerts.push({
              id: `consignment-${item.id}`,
              type: 'consignment',
              product_id: item.product_id,
              product_name: item.products.name,
              internal_sku: item.products.internal_sku,
              severity: daysSinceSale > 60 ? 'high' : 'medium',
              message: `Payment overdue ${daysSinceSale} days`,
              value: item.payout_amount,
              days: daysSinceSale
            });
          }
        });
      }

      // 2. Aged Inventory (items in stock > 90 days)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, internal_sku, created_at, unit_price')
        .eq('track_stock', true);

      if (!productsError && products) {
        for (const product of products) {
          // Check if product has stock
          const { data: stock } = await supabase
            .from('v_stock_on_hand')
            .select('qty_on_hand')
            .eq('product_id', product.id)
            .single();

          if (stock && stock.qty_on_hand > 0) {
            const daysInStock = differenceInDays(new Date(), new Date(product.created_at));
            if (daysInStock > 90) {
              alerts.push({
                id: `aged-${product.id}`,
                type: 'aged_inventory',
                product_id: product.id,
                product_name: product.name,
                internal_sku: product.internal_sku,
                severity: daysInStock > 180 ? 'high' : 'medium',
                message: `In stock for ${daysInStock} days`,
                value: product.unit_price,
                days: daysInStock
              });
            }
          }
        }
      }

      // 3. Missing Documentation
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, internal_sku, is_registered, unit_price');

      if (allProducts) {
        for (const product of allProducts) {
          if (product.is_registered) {
            const { data: docs } = await supabase
              .from('product_documents')
              .select('id')
              .eq('product_id', product.id)
              .eq('doc_type', 'registration');

            if (!docs || docs.length === 0) {
              alerts.push({
                id: `docs-${product.id}`,
                type: 'missing_docs',
                product_id: product.id,
                product_name: product.name,
                internal_sku: product.internal_sku,
                severity: 'medium',
                message: 'Missing registration document',
                value: product.unit_price
              });
            }
          }
        }
      }

      return alerts.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    }
  });

  const filteredAlerts = useMemo(() => {
    if (!alertData) return [];
    
    if (alertFilter === 'all') return alertData;
    return alertData.filter(alert => alert.type === alertFilter);
  }, [alertData, alertFilter]);

  const stats = useMemo(() => {
    if (!alertData) {
      return { 
        overduePayments: 0, 
        overdueValue: 0,
        agedInventory: 0, 
        agedValue: 0,
        missingDocs: 0 
      };
    }

    const consignmentAlerts = alertData.filter(a => a.type === 'consignment');
    const agedAlerts = alertData.filter(a => a.type === 'aged_inventory');
    const docAlerts = alertData.filter(a => a.type === 'missing_docs');

    return {
      overduePayments: consignmentAlerts.length,
      overdueValue: consignmentAlerts.reduce((sum, a) => sum + (a.value || 0), 0),
      agedInventory: agedAlerts.length,
      agedValue: agedAlerts.reduce((sum, a) => sum + (a.value || 0), 0),
      missingDocs: docAlerts.length
    };
  }, [alertData]);

  const handleExportCSV = () => {
    if (!filteredAlerts || filteredAlerts.length === 0) {
      toast({
        title: 'No Data',
        description: 'No alerts to export',
        variant: 'destructive'
      });
      return;
    }

    try {
      const csvContent = [
        ['Alert Type', 'Product', 'Internal SKU', 'Priority', 'Message', 'Value (£)', 'Days'],
        ...filteredAlerts.map(alert => [
          alert.type === 'consignment' ? 'Overdue Payment' : 
          alert.type === 'aged_inventory' ? 'Aged Inventory' : 'Missing Documentation',
          alert.product_name,
          alert.internal_sku,
          alert.severity.toUpperCase(),
          alert.message,
          alert.value?.toFixed(2) || '',
          alert.days || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-alerts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Business alerts exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export alerts',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alert Banner */}
      {stats.overduePayments > 0 && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            ⚠️ {stats.overduePayments} overdue consignment {stats.overduePayments === 1 ? 'payment' : 'payments'} (£{stats.overdueValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total)
          </AlertDescription>
        </Alert>
      )}

      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              Business Alerts
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="consignment">Overdue Payments</SelectItem>
                <SelectItem value="aged_inventory">Aged Inventory</SelectItem>
                <SelectItem value="missing_docs">Missing Documentation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PoundSterling className="h-4 w-4" />
                <span className="text-sm font-medium">Overdue Consignment Payments</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight text-destructive">
                {stats.overduePayments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                £{stats.overdueValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} owed
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Aged Inventory (90+ Days)</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight text-warning">
                {stats.agedInventory}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                £{stats.agedValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Missing Documentation</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">
                {stats.missingDocs}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered items without docs
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Business items requiring attention
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Priority</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Product</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Alert Type</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Details</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                          <p className="text-muted-foreground font-medium">No alerts</p>
                          <p className="text-sm text-muted-foreground">Everything looks good!</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAlerts.map((alert) => (
                        <tr key={alert.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Badge 
                              variant={alert.severity === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {alert.severity === 'high' ? '🔴 High' : '🟡 Medium'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{alert.product_name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {alert.internal_sku}
                            </div>
                          </td>
                          <td className="p-3">
                            {alert.type === 'consignment' && (
                              <div className="flex items-center gap-1 text-destructive">
                                <PoundSterling className="h-3 w-3" />
                                <span>Overdue Payment</span>
                              </div>
                            )}
                            {alert.type === 'aged_inventory' && (
                              <div className="flex items-center gap-1 text-warning">
                                <Clock className="h-3 w-3" />
                                <span>Aged Inventory</span>
                              </div>
                            )}
                            {alert.type === 'missing_docs' && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>Missing Docs</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {alert.message}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {alert.value ? `£${alert.value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}