import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertCircle, PoundSterling } from 'lucide-react';
import { useSupplierConsignments } from '@/hooks/useConsignments';

interface ConsignmentSummaryCardsProps {
  supplierId: number;
}

export function ConsignmentSummaryCards({ supplierId }: ConsignmentSummaryCardsProps) {
  const { data: consignments, isLoading } = useSupplierConsignments(supplierId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeStock = consignments?.filter(item => item.status === 'active') || [];
  const unsettledSales = consignments?.filter(item => item.status === 'sold') || [];
  const settledItems = consignments?.filter(item => item.status === 'settled') || [];
  
  const totalValue = activeStock.reduce((sum, item) => sum + item.agreed_payout, 0);
  const unsettledValue = unsettledSales.reduce((sum, item) => sum + item.agreed_payout, 0);
  const totalPaidOut = settledItems.reduce((sum, item) => sum + (item.agreed_payout || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Active Consignment Stock */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Stock</p>
              <p className="text-3xl font-luxury font-bold mt-1">{activeStock.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Items on consignment</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unsettled Sales */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unsettled Sales</p>
              <p className="text-3xl font-luxury font-bold mt-1">{unsettledSales.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting settlement</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amount Owed */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount Owed</p>
              <p className="text-3xl font-luxury font-bold mt-1 text-[#D4AF37]">
                £{unsettledValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pending payout</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <PoundSterling className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Paid Out */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Paid Out</p>
              <p className="text-3xl font-luxury font-bold mt-1 text-[#D4AF37]">
                £{totalPaidOut.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">All-time settlements</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <PoundSterling className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
