import { useState, useEffect } from 'react';
import { useUpdateSupplier } from '@/hooks/useSuppliers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Supplier {
  id: number;
  name: string;
  supplier_type: 'registered' | 'customer';
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
}

interface EditSupplierDialogProps {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSupplierDialog({ supplier, open, onOpenChange }: EditSupplierDialogProps) {
  const [editForm, setEditForm] = useState({
    name: '',
    supplier_type: 'registered' as 'registered' | 'customer',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    tags: [] as string[],
    notes: '',
  });

  const updateMutation = useUpdateSupplier();

  // Update form when supplier changes or dialog opens
  useEffect(() => {
    if (supplier && open) {
      setEditForm({
        name: supplier.name,
        supplier_type: supplier.supplier_type,
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        status: supplier.status,
        tags: supplier.tags || [],
        notes: supplier.notes || '',
      });
    }
  }, [supplier, open]);

  const handleSave = () => {
    updateMutation.mutate(
      { id: supplier.id, ...editForm },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {supplier.supplier_type === 'customer' ? 'Individual' : 'Supplier'}</DialogTitle>
          <DialogDescription>
            Update the details for {supplier.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {supplier.supplier_type === 'customer' ? 'Individual' : 'Supplier'} Name *
              </Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_type">Type</Label>
              <Select
                value={editForm.supplier_type}
                onValueChange={(value: 'registered' | 'customer') =>
                  setEditForm({ ...editForm, supplier_type: value })
                }
              >
                <SelectTrigger id="supplier_type" className="h-auto py-3 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">Registered Supplier</SelectItem>
                  <SelectItem value="customer">Individual Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={editForm.contact_name}
                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                placeholder="Contact person"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+44 20 1234 5678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="Enter address"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label>Tags</Label>
              <p className="text-xs text-muted-foreground mt-1">Click to add or remove tags</p>
            </div>
            
            {/* Preset tag suggestions */}
            <div className="flex flex-wrap gap-2">
              {['Luxury Watches', 'Diamonds', 'Gold', 'Silver', 'Estate Jewellery', 'Vintage'].map(tag => (
                <Badge
                  key={tag}
                  variant={editForm.tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    setEditForm(prev => ({
                      ...prev,
                      tags: prev.tags.includes(tag) 
                        ? prev.tags.filter(t => t !== tag)
                        : [...prev.tags, tag]
                    }));
                  }}
                >
                  {tag}
                  {editForm.tags.includes(tag) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
            
            {/* Custom tag input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.currentTarget;
                    const tag = input.value.trim();
                    if (tag && !editForm.tags.includes(tag)) {
                      setEditForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                      input.value = '';
                    }
                  }
                }}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  const tag = input.value.trim();
                  if (tag && !editForm.tags.includes(tag)) {
                    setEditForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                    input.value = '';
                  }
                }}
              >
                Add
              </Button>
            </div>
            
            {/* Display custom tags (non-preset) */}
            {editForm.tags.filter(t => !['Luxury Watches', 'Diamonds', 'Gold', 'Silver', 'Estate Jewellery', 'Vintage'].includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">Custom:</span>
                {editForm.tags.filter(t => !['Luxury Watches', 'Diamonds', 'Gold', 'Silver', 'Estate Jewellery', 'Vintage'].includes(t)).map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive/10"
                    onClick={() => setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                  >
                    {tag} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Additional notes"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending || !editForm.name.trim()}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
