import { useState, useEffect } from 'react';
import { useUpdateSupplier } from '@/hooks/useSuppliers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X, Building2, Mail, FileText } from 'lucide-react';
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

const presetTags = ['Luxury Watches', 'Diamonds', 'Gold', 'Silver', 'Estate Jewellery', 'Vintage'];

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {supplier.supplier_type === 'customer' ? 'Individual' : 'Supplier'}</DialogTitle>
          <DialogDescription>
            Update details for {supplier.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="details" className="text-xs gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="extras" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Extras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label htmlFor="supplier_type">Type</Label>
              <Select
                value={editForm.supplier_type}
                onValueChange={(value: 'registered' | 'customer') =>
                  setEditForm({ ...editForm, supplier_type: value })
                }
              >
                <SelectTrigger id="supplier_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">Registered Supplier</SelectItem>
                  <SelectItem value="customer">Individual Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                {editForm.supplier_type === 'customer' ? 'Full Name *' : 'Company Name *'}
              </Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Person</Label>
              <Input
                id="contact_name"
                value={editForm.contact_name}
                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                placeholder="Primary contact"
              />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-0">
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

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Full address"
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="extras" className="space-y-4 mt-0">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="status" className="text-sm font-medium">Active Supplier</Label>
                <p className="text-xs text-muted-foreground">
                  Appears in dropdowns
                </p>
              </div>
              <Switch
                id="status"
                checked={editForm.status === 'active'}
                onCheckedChange={(checked) => setEditForm({ ...editForm, status: checked ? 'active' : 'inactive' })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {presetTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={editForm.tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
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
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Custom tag..."
                  className="text-sm"
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
              {editForm.tags.filter(t => !presetTags.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {editForm.tags.filter(t => !presetTags.includes(t)).map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer text-xs"
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
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
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
