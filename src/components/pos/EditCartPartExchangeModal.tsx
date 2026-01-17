import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { PartExchangeItem } from '@/types';

interface EditCartPartExchangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partExchange: PartExchangeItem | null;
  onSave: (updated: PartExchangeItem) => void;
}

export function EditCartPartExchangeModal({ 
  open, 
  onOpenChange, 
  partExchange,
  onSave 
}: EditCartPartExchangeModalProps) {
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    description: '',
    serial: '',
    allowance: 0,
    customer_name: '',
    customer_contact: '',
    notes: '',
  });

  useEffect(() => {
    if (partExchange) {
      setFormData({
        product_name: partExchange.product_name || '',
        category: partExchange.category || '',
        description: partExchange.description || '',
        serial: partExchange.serial || '',
        allowance: partExchange.allowance,
        customer_name: partExchange.customer_name || '',
        customer_contact: partExchange.customer_contact || '',
        notes: partExchange.notes || '',
      });
    }
  }, [partExchange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partExchange) return;

    onSave({
      ...partExchange,
      product_name: formData.product_name,
      category: formData.category || undefined,
      description: formData.description || undefined,
      serial: formData.serial || undefined,
      allowance: formData.allowance,
      customer_name: formData.customer_name || undefined,
      customer_contact: formData.customer_contact || undefined,
      notes: formData.notes || undefined,
    });

    onOpenChange(false);
  };

  if (!partExchange) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-luxury text-2xl">Edit Trade-In</DialogTitle>
          <DialogDescription>
            Update the details for this trade-in item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                required
                placeholder="e.g., Rolex Submariner"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rings">Rings</SelectItem>
                  <SelectItem value="Necklaces">Necklaces</SelectItem>
                  <SelectItem value="Earrings">Earrings</SelectItem>
                  <SelectItem value="Bracelets">Bracelets</SelectItem>
                  <SelectItem value="Watches">Watches</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                value={formData.serial}
                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Condition, notable features..."
                rows={3}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="allowance">Trade-In Allowance *</Label>
              <CurrencyInput
                id="allowance"
                value={formData.allowance}
                onValueChange={(value) => setFormData({ ...formData, allowance: parseFloat(value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_contact">Customer Contact</Label>
              <Input
                id="customer_contact"
                value={formData.customer_contact}
                onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                placeholder="Email or phone"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.product_name || formData.allowance <= 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
