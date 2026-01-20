import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateSupplier } from '@/hooks/useSuppliers';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { Plus, AlertCircle, Building2, Mail, FileText, X, Loader2 } from 'lucide-react';
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

const presetTags = ['Luxury Watches', 'Diamonds', 'Gold', 'Silver', 'Estate Jewellery', 'Vintage'];

interface InlineSupplierAddProps {
  onSupplierCreated?: (supplierId: number) => void;
  /** Callback when a customer is created (inserts into customers table) */
  onCustomerCreated?: (customerId: number) => void;
  triggerClassName?: string;
  defaultType?: 'registered' | 'customer';
  triggerLabel?: string;
  /** Controlled open state - when provided, component becomes controlled */
  open?: boolean;
  /** Callback when open state changes - required when using controlled mode */
  onOpenChange?: (open: boolean) => void;
  /** Hide the trigger button (useful when controlling externally) */
  hideTrigger?: boolean;
  /** Lock the supplier type - prevents changing between registered/customer */
  lockType?: boolean;
}

export function InlineSupplierAdd({ 
  onSupplierCreated,
  onCustomerCreated,
  triggerClassName,
  defaultType = 'registered',
  triggerLabel,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  lockType = false
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
  const createCustomer = useCreateCustomer();
  
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
      // When adding a customer from POS (lockType + customer), insert into customers table
      if (lockType && defaultType === 'customer') {
        const result = await createCustomer.mutateAsync({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          status: 'active'
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
        
        if (onCustomerCreated && result.id) {
          onCustomerCreated(result.id);
        }
      } else {
        // Standard supplier creation
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
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const isPending = createSupplier.isPending || createCustomer.isPending;
  const isCustomerMode = lockType && defaultType === 'customer';

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-luxury">
            {isCustomerMode ? 'Add Customer' : 'Add Supplier'}
          </DialogTitle>
          <DialogDescription>
            Add a new {isCustomerMode ? 'customer' : 'registered supplier'} with basic information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {isCustomerMode ? (
            // Simplified form for customer mode (no tabs)
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter customer's name"
                  className={cn(errors.name && "border-destructive")}
                  required
                />
                {errors.name && (
                  <div className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
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
                    placeholder="customer@example.com"
                    className={cn(errors.email && "border-destructive")}
                  />
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            // Tabbed form for supplier mode (matching Suppliers page)
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
                {!lockType && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier_type">Supplier Type *</Label>
                    <Select
                      value={formData.supplier_type}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        supplier_type: value as 'registered' | 'customer' 
                      })}
                    >
                      <SelectTrigger id="supplier_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Registered Supplier</span>
                            <span className="text-xs text-muted-foreground">Business vendor</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="customer">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Individual Supplier</span>
                            <span className="text-xs text-muted-foreground">Walk-in for trade-in</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {lockType && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier_type">Supplier Type *</Label>
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                      {formData.supplier_type === 'registered' ? 'Registered Supplier' : 'Individual Supplier'}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">
                    {formData.supplier_type === 'customer' ? 'Full Name *' : 'Company Name *'}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={cn(errors.name && "border-destructive")}
                    placeholder={formData.supplier_type === 'customer' ? 'John Smith' : 'Acme Watches Ltd'}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Person</Label>
                  <Input
                    id="contact"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Primary contact name"
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={cn(errors.email && "border-destructive")}
                    placeholder="supplier@example.com"
                  />
                  {errors.email && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={cn(errors.phone && "border-destructive")}
                    placeholder="+44 20 1234 5678"
                  />
                  {errors.phone && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{errors.phone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="extras" className="space-y-4 mt-0">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="status" className="text-sm font-medium">Active Supplier</Label>
                    <p className="text-xs text-muted-foreground">Appears in dropdowns</p>
                  </div>
                  <Switch
                    id="status"
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {presetTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={formData.tags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            tags: prev.tags.includes(tag) 
                              ? prev.tags.filter(t => t !== tag)
                              : [...prev.tags, tag]
                          }));
                        }}
                      >
                        {tag}
                        {formData.tags.includes(tag) && <X className="h-3 w-3 ml-1" />}
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
                          if (tag && !formData.tags.includes(tag)) {
                            setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
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
                        if (tag && !formData.tags.includes(tag)) {
                          setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {formData.tags.filter(t => !presetTags.includes(t)).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags.filter(t => !presetTags.includes(t)).map(tag => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="cursor-pointer text-xs"
                          onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
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
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                isCustomerMode ? 'Add Customer' : 'Add Supplier'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
