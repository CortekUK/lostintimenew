import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Package, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomerPurchaseHistory } from '@/hooks/useCustomers';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerPurchaseHistoryProps {
  customerId: number;
}

export function CustomerPurchaseHistory({ customerId }: CustomerPurchaseHistoryProps) {
  const { data: purchases, isLoading } = useCustomerPurchaseHistory(customerId);
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">No purchases yet</p>
        <p className="text-sm text-muted-foreground">
          Purchases will appear here when linked to this customer
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((sale) => (
            <TableRow key={sale.id} className="group">
              <TableCell>
                <div>
                  <p className="font-medium">{format(new Date(sale.sold_at), 'dd MMM yyyy')}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.sold_at), 'HH:mm')}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {sale.sale_items?.slice(0, 2).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-1.5 text-sm">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
                        {item.product?.name || 'Unknown Product'}
                      </span>
                      {item.quantity > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          ×{item.quantity}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {sale.sale_items && sale.sale_items.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{sale.sale_items.length - 2} more item(s)
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {sale.payment}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(sale.total)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
