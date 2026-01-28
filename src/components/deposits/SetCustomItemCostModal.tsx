import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllProductCategories } from '@/hooks/useProductCategories';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DepositOrderItem {
  id: number;
  product_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  is_custom_order: boolean;
  category?: string | null;
  description?: string | null;
}

interface SetCustomItemCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DepositOrderItem | null;
  onSave: (data: {
    itemId: number;
    unit_cost: number;
    category?: string;
    description?: string;
  }) => void;
  isPending?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SetCustomItemCostModal({
  open,
  onOpenChange,
  item,
  onSave,
  isPending = false,
}: SetCustomItemCostModalProps) {
  const { user } = useAuth();
  const { all: categories } = useAllProductCategories();
  
  // Fetch staff name
  const { data: staffName } = useQuery({
    queryKey: ['staff-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'Staff';
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      return data?.full_name || 'Staff';
    },
    enabled: !!user?.id,
  });
  
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setCost(item.unit_cost > 0 ? String(item.unit_cost) : '');
      setCategory(item.category || '');
      setDescription(item.description || '');
    }
  }, [item]);

  if (!item) return null;

  const sellPrice = item.unit_price * item.quantity;
  const costValue = parseFloat(cost) || 0;
  const profit = sellPrice - costValue;
  const marginPercent = sellPrice > 0 ? Math.round((profit / sellPrice) * 100) : 0;

  const handleSubmit = () => {
    if (!costValue || costValue <= 0) return;
    
    onSave({
      itemId: item.id,
      unit_cost: costValue,
      category: category || undefined,
      description: description || undefined,
    });
  };

  const isValid = costValue > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-luxury">Set Item Cost</DialogTitle>
        </DialogHeader>
        
        <Separator />
        
        <div className="space-y-4">
          {/* Item Info */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Item</p>
            <p className="font-medium">{item.product_name}</p>
            <p className="text-sm text-muted-foreground">
              Sell Price: <span className="text-[#D4AF37] font-medium">{formatCurrency(sellPrice)}</span>
            </p>
          </div>

          <Separator />
          
          {/* Cost Details Section */}
          <div className="space-y-4 bg-muted/30 rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="cost">
                Actual Cost <span className="text-destructive">*</span>
              </Label>
              <CurrencyInput
                id="cost"
                value={cost}
                onValueChange={setCost}
                placeholder="0"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for the product..."
                rows={2}
              />
            </div>
          </div>

          {/* Margin Preview */}
          {costValue > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Margin Preview</p>
              <p className="text-lg font-semibold">
                {formatCurrency(profit)}{' '}
                <span className={`text-sm ${marginPercent >= 30 ? 'text-green-600' : marginPercent >= 15 ? 'text-amber-600' : 'text-destructive'}`}>
                  ({marginPercent}%)
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Recording as: {staffName || 'Staff'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
