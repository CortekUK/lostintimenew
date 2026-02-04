import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSupplierConsignments } from '@/hooks/useConsignments';
import { useSupplierProducts } from '@/hooks/useSupplierDetails';
import { CalendarIcon, Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface CustomerInventoryTabsProps {
  supplierId: number;
}

export function CustomerInventoryTabs({ supplierId }: CustomerInventoryTabsProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data: consignments, isLoading: consignmentsLoading } = useSupplierConsignments(supplierId);

  const { data: allProducts, isLoading: productsLoading } = useSupplierProducts(supplierId);
  
  // Filter for regular products (not consignments)
  const regularProducts = allProducts?.filter(
    product => !product.is_consignment
  ) || [];

  return (
    <Tabs defaultValue="consignments" className="w-full">
      <TabsList>
        <TabsTrigger value="consignments">
          Consignments ({consignments?.length || 0})
        </TabsTrigger>
        {regularProducts.length > 0 && (
          <TabsTrigger value="products">
            Products ({regularProducts.length})
          </TabsTrigger>
        )}
      </TabsList>

      {/* Filters (shared) */}
      <div className="flex items-center gap-2 my-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-[200px] justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'PPP') : 'Start date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-[200px] justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'PPP') : 'End date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {(startDate || endDate || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Consignments Tab */}
      <TabsContent value="consignments">
        {consignmentsLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : !consignments || consignments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No consignment items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">Internal SKU</th>
                  <th className="text-right py-2">Agreed Payout</th>
                  <th className="text-center py-2">Status</th>
                  <th className="text-right py-2">Sold Price</th>
                  <th className="text-right py-2">Gross Profit</th>
                  <th className="text-center py-2">Settlement</th>
                </tr>
              </thead>
              <tbody>
                {consignments.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{item.product_name}</td>
                    <td className="py-2 font-mono text-xs">{item.internal_sku}</td>
                    <td className="py-2 text-right font-mono">
                      £{item.agreed_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-center">
                      <Badge
                        variant={
                          item.status === 'settled'
                            ? 'default'
                            : item.status === 'sold'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {item.status === 'settled' ? 'Settled' : item.status === 'sold' ? 'Sold' : 'Active'}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-mono">
                      {item.sold_price ? (
                        `£${item.sold_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {item.gross_profit !== undefined ? (
                        <span className={item.gross_profit >= 0 ? 'text-[#D4AF37]' : 'text-destructive'}>
                          £{item.gross_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {item.paid_at ? (
                        <Badge variant="default">Paid</Badge>
                      ) : item.status === 'sold' ? (
                        <Badge variant="outline">Unpaid</Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/* Regular Products Tab */}
      <TabsContent value="products">
        {productsLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : regularProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No regular products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Internal SKU</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-right py-2">Unit Cost</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-center py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regularProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{product.name}</td>
                    <td className="py-2 font-mono text-xs">{product.sku || '—'}</td>
                    <td className="py-2 font-mono text-xs">{product.internal_sku}</td>
                    <td className="py-2">{product.category || '—'}</td>
                    <td className="py-2 text-right font-mono">
                      £{product.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right font-mono">
                      £{product.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-center">
                      <Link to={`/products?id=${product.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
