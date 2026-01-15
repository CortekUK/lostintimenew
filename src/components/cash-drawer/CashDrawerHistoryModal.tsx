import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashDrawerHistory, CashMovementType } from '@/hooks/useCashDrawer';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  Banknote,
  Receipt,
  Download
} from 'lucide-react';
import { exportCashDrawerHistory } from '@/utils/cashDrawerExport';

interface CashDrawerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: number | null;
  locationName: string;
}

const movementTypeConfig: Record<CashMovementType, { label: string; icon: typeof ArrowUpCircle; color: string }> = {
  sale_cash_in: { label: 'Cash Sale', icon: Banknote, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  deposit: { label: 'Deposit', icon: ArrowUpCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  withdrawal: { label: 'Withdrawal', icon: ArrowDownCircle, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  float_set: { label: 'Float Set', icon: RefreshCw, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  adjustment: { label: 'Adjustment', icon: RefreshCw, color: 'bg-muted text-muted-foreground border-border' },
  sale_void_refund: { label: 'Void Refund', icon: Receipt, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function CashDrawerHistoryModal({
  isOpen,
  onClose,
  locationId,
  locationName,
}: CashDrawerHistoryModalProps) {
  const { data: movements, isLoading } = useCashDrawerHistory(locationId || undefined);

  const handleExport = () => {
    if (movements && movements.length > 0) {
      exportCashDrawerHistory(movements, locationName);
    }
  };

  // Calculate running balance (from oldest to newest, then reverse for display)
  const movementsWithBalance = movements ? [...movements].reverse().reduce((acc, movement, index) => {
    const previousBalance = index === 0 ? 0 : acc[index - 1].runningBalance;
    const runningBalance = previousBalance + movement.amount;
    acc.push({ ...movement, runningBalance });
    return acc;
  }, [] as Array<typeof movements[0] & { runningBalance: number }>).reverse() : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-semibold">{locationName} - Cash History</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!movements || movements.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4 -mr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : !movementsWithBalance || movementsWithBalance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cash movements recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movementsWithBalance.map((movement) => {
                const config = movementTypeConfig[movement.movement_type];
                const Icon = config.icon;
                const isPositive = movement.amount >= 0;
                
                return (
                  <div
                    key={movement.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                  >
                    {/* Icon */}
                    <div className={`p-2.5 rounded-full shrink-0 ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <Icon className={`h-4 w-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs border ${config.color}`}>
                          {config.label}
                        </Badge>
                        {movement.reference_sale_id && (
                          <span className="text-xs text-muted-foreground">
                            Sale #{movement.reference_sale_id}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium truncate">
                        {movement.profile?.full_name || 'System'}
                      </p>
                      
                      {movement.notes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {movement.notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Amount and balance */}
                    <div className="text-right shrink-0">
                      <p className={`text-base font-semibold tabular-nums ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(movement.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Balance: {formatCurrency(movement.runningBalance)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(movement.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
