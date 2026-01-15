import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { useUpdateSaleItem } from '@/hooks/useSaleActions';
import { useTransactionDetails } from '@/hooks/useDatabase';
import { formatCurrency } from '@/lib/utils';

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  products?: {
    id: number;
    name: string;
    internal_sku?: string;
  };
}

interface EditSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: number;
  onSuccess?: () => void;
}

interface EditedItem {
  id: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  originalQuantity: number;
  productId: number;
  unitCost: number;
  hasChanges: boolean;
}

export function EditSaleModal({
  open,
  onOpenChange,
  saleId,
  onSuccess
}: EditSaleModalProps) {
  // Fetch complete sale details when modal opens
  const { data: details, isLoading } = useTransactionDetails(open ? saleId : undefined);
  const items: SaleItem[] = details?.items || [];
  const [editedItems, setEditedItems] = useState<EditedItem[]>([]);
  const [reason, setReason] = useState('');
  const updateSaleItem = useUpdateSaleItem();

  // Initialize edited items when modal opens
  useEffect(() => {
    if (open && items.length > 0) {
      setEditedItems(items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discount: item.discount,
        originalQuantity: item.quantity,
        productId: item.product_id,
        unitCost: item.unit_cost,
        hasChanges: false
      })));
    }
  }, [open, items]);

  const updateItem = (itemId: number, field: 'quantity' | 'unitPrice' | 'discount', value: number) => {
    setEditedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      const original = items.find(i => i.id === itemId);
      if (!original) return item;

      const updated = { ...item, [field]: value };

      // Check if there are any changes from original
      updated.hasChanges =
        updated.quantity !== original.quantity ||
        updated.unitPrice !== original.unit_price ||
        updated.discount !== original.discount;

      return updated;
    }));
  };

  const hasAnyChanges = editedItems.some(item => item.hasChanges);

  const calculateNewTotal = () => {
    if (editedItems.length === 0) return 0;
    return editedItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      return sum + (qty * price) - discount;
    }, 0);
  };

  const calculateOriginalTotal = () => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const discount = Number(item.discount) || 0;
      return sum + (qty * price) - discount;
    }, 0);
  };

  const handleSave = async () => {
    const changedItems = editedItems.filter(item => item.hasChanges);

    if (changedItems.length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      // Update each changed item
      for (const item of changedItems) {
        await updateSaleItem.mutateAsync({
          saleId,
          itemId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          originalQuantity: item.originalQuantity,
          productId: item.productId,
          unitCost: item.unitCost,
          reason: reason.trim() || 'Sale edited'
        });
      }

      onOpenChange(false);
      setReason('');
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const originalTotal = calculateOriginalTotal();
  const newTotal = calculateNewTotal();
  const difference = newTotal - originalTotal;

  // Loading state
  if (open && isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sale details...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Empty state - sale has no items
  if (open && !isLoading && items.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cannot Edit Sale #{saleId}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              This sale has no items to edit. This may be an incomplete or orphaned transaction.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Consider voiding this sale instead.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if not in the middle of saving
      if (!updateSaleItem.isPending) {
        onOpenChange(isOpen);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Sale #{saleId}
          </DialogTitle>
          <DialogDescription>
            Modify the quantities, prices, or discounts for items in this sale.
            Stock will be automatically adjusted if quantities change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {items.map((item, index) => {
            const editedItem = editedItems.find(e => e.id === item.id);
            if (!editedItem) return null;

            const lineTotal = (editedItem.quantity * editedItem.unitPrice) - editedItem.discount;
            const originalLineTotal = (item.quantity * item.unit_price) - item.discount;
            const lineDiff = lineTotal - originalLineTotal;

            return (
              <div key={item.id} className="space-y-3">
                {index > 0 && <Separator />}

                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{item.products?.name || 'Unknown Product'}</h4>
                    {item.products?.internal_sku && (
                      <p className="text-sm text-muted-foreground">SKU: {item.products.internal_sku}</p>
                    )}
                  </div>
                  {editedItem.hasChanges && (
                    <Badge variant="secondary" className="text-xs">Modified</Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`qty-${item.id}`}>Quantity</Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      min="1"
                      value={editedItem.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    {editedItem.quantity !== item.quantity && (
                      <p className="text-xs text-muted-foreground">
                        Was: {item.quantity}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`price-${item.id}`}>Unit Price</Label>
                    <Input
                      id={`price-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedItem.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                    {editedItem.unitPrice !== item.unit_price && (
                      <p className="text-xs text-muted-foreground">
                        Was: {formatCurrency(item.unit_price)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`discount-${item.id}`}>Discount</Label>
                    <Input
                      id={`discount-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedItem.discount}
                      onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                    />
                    {editedItem.discount !== item.discount && (
                      <p className="text-xs text-muted-foreground">
                        Was: {formatCurrency(item.discount)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Line Total:</span>
                  <span className={lineDiff !== 0 ? (lineDiff > 0 ? 'text-success' : 'text-destructive') : ''}>
                    {formatCurrency(lineTotal)}
                    {lineDiff !== 0 && (
                      <span className="ml-2">
                        ({lineDiff > 0 ? '+' : ''}{formatCurrency(lineDiff)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          <Separator />

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Original Total:</span>
              <span>{formatCurrency(originalTotal)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>New Total:</span>
              <span className={difference !== 0 ? (difference > 0 ? 'text-success' : 'text-destructive') : ''}>
                {formatCurrency(newTotal)}
              </span>
            </div>
            {difference !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Difference:</span>
                <span className={difference > 0 ? 'text-success' : 'text-destructive'}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              </div>
            )}
          </div>

          {/* Quantity change warning */}
          {editedItems.some(item => item.quantity !== item.originalQuantity) && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">Stock will be adjusted</p>
                <p className="text-muted-foreground">
                  Changing quantities will automatically update your inventory levels.
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="edit-reason">Reason for edit (optional)</Label>
            <Textarea
              id="edit-reason"
              placeholder="e.g., Price correction, Wrong quantity entered..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateSaleItem.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasAnyChanges || updateSaleItem.isPending}
          >
            {updateSaleItem.isPending ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
