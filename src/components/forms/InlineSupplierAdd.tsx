import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSupplier } from '@/hooks/useSuppliers';
import { Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  supplier_type: z.enum(['registered', 'customer']),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, "Invalid phone format").optional().or(z.literal("")),
  contact_name: z.string().max(100, "Contact name must be less than 100 characters").optional(),
  address: z.string().max(500, "Address must be less than 500 characters").optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"])
});

interface InlineSupplierAddProps {
  onSupplierCreated?: (supplierId: number) => void;
  triggerClassName?: string;
  defaultType?: 'registered' | 'customer';
  triggerLabel?: string;
  /** Controlled open state - when provided, component becomes controlled */
  open?: boolean;
  /** Callback when open state changes - required when using controlled mode */
  onOpenChange?: (open: boolean) => void;
  /** Hide the trigger button (useful when controlling externally) */
  hideTrigger?: boolean;
}

export function InlineSupplierAdd({ 
  onSupplierCreated, 
  triggerClassName,
  defaultType = 'registered',
  triggerLabel,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false
}: InlineSupplierAddProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  
  const [formData, setFormData] = useState<{
    name: string;
    supplier_type: 'registered' | 'customer';
    email: string;
    phone: string;
    contact_name: string;
    address: string;
    notes: string;
    tags: string[];
    status: 'active' | 'inactive';
  }>({
    name: '',
    supplier_type: defaultType,
    email: '',
    phone: '',
    contact_name: '',
    address: '',
    notes: '',
    tags: [],
    status: 'active'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const createSupplier = useCreateSupplier();
  
  const validateForm = () => {
    try {
      supplierSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!validateForm()) return;
    
    try {
      const result = await createSupplier.mutateAsync({
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        contact_name: formData.contact_name || null,
        address: formData.address || null,
        notes: formData.notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null
      });
      
      setOpen(false);
      setFormData({
        name: '',
        supplier_type: defaultType,
        email: '',
        phone: '',
        contact_name: '',
        address: '',
        notes: '',
        tags: [],
        status: 'active'
      });
      setErrors({});
      
      if (onSupplierCreated && result.id) {
        onSupplierCreated(result.id);
      }
    } catch (error) {
      console.error('Failed to create supplier:', error);
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", triggerClassName)}>
            <Plus className="h-4 w-4" />
            {triggerLabel || (defaultType === 'customer' ? 'Add Customer' : 'Add Supplier')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-luxury text-lg">
            Quick Add {defaultType === 'customer' ? 'Customer' : 'Supplier'}
          </DialogTitle>
          <DialogDescription>
            Add a new {defaultType === 'customer' ? 'customer supplier (walk-in/trade-in)' : 'registered supplier'} with basic information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier_type">Supplier Type *</Label>
            <Select
              value={formData.supplier_type}
              onValueChange={(value) => setFormData({ ...formData, supplier_type: value as 'registered' | 'customer' })}
            >
              <SelectTrigger id="supplier_type">
                <SelectValue>
                  {formData.supplier_type === 'registered' ? 'Registered Supplier' : 'Customer Supplier'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registered">
                  <div>
                    <div className="font-medium">Registered Supplier</div>
                    <div className="text-xs text-muted-foreground">
                      Business vendor or wholesale supplier
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div>
                    <div className="font-medium">Customer Supplier</div>
                    <div className="text-xs text-muted-foreground">
                      Walk-in customer for trade-in or consignment
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {formData.supplier_type === 'customer' ? 'Customer Name *' : 'Company Name *'}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={formData.supplier_type === 'customer' ? 'Enter customer name' : 'Enter supplier name'}
              className={cn(errors.name && "border-destructive")}
              required
            />
            {errors.name && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.name}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="supplier@example.com"
                className={cn(errors.email && "border-destructive")}
              />
              {errors.email && (
                <div className="flex items-center space-x-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+44 20 7946 0958"
                className={cn(errors.phone && "border-destructive")}
              />
              {errors.phone && (
                <div className="flex items-center space-x-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          {formData.supplier_type === 'registered' && (
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Person</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                placeholder="Primary contact person"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'active' : 'inactive'})}
              />
              <span className={cn("text-sm", formData.status === 'active' ? "text-success" : "text-muted-foreground")}>
                {formData.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              placeholder="Enter tags separated by commas"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    setFormData(prev => ({
                      ...prev,
                      tags: [...new Set([...prev.tags, value])]
                    }));
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={createSupplier.isPending} size="sm">
              {createSupplier.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}