import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Sparkles, Plus, Minus } from 'lucide-react';

export interface CustomItemData {
  id: string;
  product_name: string;
  category?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  tax_rate: number;
  is_custom: true;
}

interface AddCustomItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: CustomItemData) => void;
}

const CATEGORIES = [
  'Ring',
  'Necklace',
  'Bracelet',
  'Earrings',
  'Watch',
  'Pendant',
  'Brooch',
  'Cufflinks',
  'Other',
];

export function AddCustomItemModal({ open, onOpenChange, onAdd }: AddCustomItemModalProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(unitPrice) || 0;
    const cost = parseFloat(unitCost) || 0;
    
    if (!productName.trim() || price <= 0) return;

    const customItem: CustomItemData = {
      id: crypto.randomUUID(),
      product_name: productName.trim(),
      category: category || undefined,
      description: description.trim() || undefined,
      quantity,
      unit_price: price,
      unit_cost: cost,
      tax_rate: 0, // Custom items typically don't have tax pre-configured
      is_custom: true,
    };

    onAdd(customItem);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setProductName('');
    setCategory('');
    setDescription('');
    setUnitPrice('');
    setUnitCost('');
    setQuantity(1);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const price = parseFloat(unitPrice) || 0;
  const isValid = productName.trim() && price > 0 && quantity > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Add Custom Item
          </DialogTitle>
          <DialogDescription>
            Add a bespoke or made-to-order piece that isn't in inventory yet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name *</Label>
            <Input
              id="item-name"
              placeholder="e.g., Custom 18K Gold Ring with Sapphire"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed specifications, materials, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Price and Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Selling Price *</Label>
              <CurrencyInput
                value={unitPrice}
                onValueChange={setUnitPrice}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Cost</Label>
              <CurrencyInput
                value={unitCost}
                onValueChange={setUnitCost}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-9 w-9 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                className="h-9 w-9 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Add Custom Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
