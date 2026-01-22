import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PartExchangeFileUpload } from './PartExchangeFileUpload';
import { Search, Check } from 'lucide-react';
import { PartExchangeItem } from '@/types';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { InlineSupplierAdd } from '@/components/forms/InlineSupplierAdd';
import { useCustomers } from '@/hooks/useCustomers';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';

interface PartExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (partExchange: PartExchangeItem) => void;
}

export const PartExchangeModal = ({ isOpen, onClose, onAdd }: PartExchangeModalProps) => {
  const { data: filterOptions } = useFilterOptions();
  const { data: customers, refetch: refetchCustomers } = useCustomers();
  
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    description: '',
    serial: '',
    allowance: '',
    notes: '',
  });

  const [selectedPerson, setSelectedPerson] = useState<{ id: number; name: string; email?: string; phone?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNewPersonModal, setShowNewPersonModal] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_name.trim()) {
      newErrors.product_name = "Product name is required";
    }

    if (!formData.allowance || parseInt(formData.allowance) <= 0) {
      newErrors.allowance = "Allowance must be greater than 0";
    }

    if (!selectedPerson) {
      newErrors.source = "Please select or create a customer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const partExchange: PartExchangeItem = {
      id: Date.now().toString(),
      product_name: formData.product_name,
      category: formData.category || undefined,
      description: formData.description || undefined,
      serial: formData.serial || undefined,
      allowance: parseInt(formData.allowance),
      notes: formData.notes || undefined,
      customer_name: selectedPerson?.name,
      customer_email: selectedPerson?.email,
      customer_phone: selectedPerson?.phone,
      customer_id: selectedPerson?.id,
    };

    onAdd(partExchange);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      category: '',
      description: '',
      serial: '',
      allowance: '',
      notes: '',
    });
    setSelectedPerson(null);
    setUploadedFiles([]);
    setErrors({});
    setShowCustomCategory(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid = formData.product_name.trim() && parseInt(formData.allowance) > 0 && selectedPerson;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="font-luxury text-xl">
            Add Trade-In
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Item Details Section */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Item Details
            </h4>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="product_name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, product_name: e.target.value }));
                  setErrors(prev => ({ ...prev, product_name: '' }));
                }}
                placeholder="e.g., Rolex Submariner, Diamond Ring..."
                autoFocus
                aria-invalid={!!errors.product_name}
              />
              {errors.product_name && (
                <p className="text-sm text-destructive">{errors.product_name}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-1">
                Category
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Select
                value={showCustomCategory ? '__other__' : formData.category}
                onValueChange={(value) => {
                  if (value === '__other__') {
                    setFormData(prev => ({ ...prev, category: '' }));
                    setShowCustomCategory(true);
                  } else {
                    setFormData(prev => ({ ...prev, category: value }));
                    setShowCustomCategory(false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions?.categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">Other...</SelectItem>
                </SelectContent>
              </Select>
              
              {showCustomCategory && (
                <Input
                  placeholder="Enter custom category..."
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-1">
                Description
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Black dial, stainless steel, ref 116610LN"
                rows={2}
              />
            </div>

            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serial" className="flex items-center gap-1">
                Serial Number
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="serial"
                value={formData.serial}
                onChange={(e) => setFormData(prev => ({ ...prev, serial: e.target.value }))}
                placeholder="Enter serial number if available"
              />
            </div>
          </div>

          {/* Valuation Section */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Valuation
            </h4>

            {/* Trade-In Allowance */}
            <div className="space-y-2">
              <Label>
                Trade-In Allowance <span className="text-destructive">*</span>
              </Label>
              <CurrencyInput
                value={formData.allowance}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, allowance: value }));
                  setErrors(prev => ({ ...prev, allowance: '' }));
                }}
                placeholder="0.00"
                className={cn(errors.allowance && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.allowance && (
                <p className="text-sm text-destructive">{errors.allowance}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-1">
                Valuation Notes
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Condition, defects, valuation rationale..."
                rows={2}
              />
            </div>
          </div>

          {/* Customer Section */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Customer
            </h4>

            <div className="space-y-3">
              {selectedPerson ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    {selectedPerson.name}
                  </Badge>
                  {selectedPerson.email && (
                    <span className="text-xs text-muted-foreground">{selectedPerson.email}</span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs ml-auto"
                    onClick={() => {
                      setSelectedPerson(null);
                      setErrors(prev => ({ ...prev, source: '' }));
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-muted-foreground font-normal",
                          errors.source && "border-destructive"
                        )}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find customer...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by name, phone, email..." />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            {customers?.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                onSelect={() => {
                                  setSelectedPerson({
                                    id: customer.id,
                                    name: customer.name,
                                    email: customer.email || undefined,
                                    phone: customer.phone || undefined,
                                  });
                                  setSearchOpen(false);
                                  setErrors(prev => ({ ...prev, source: '' }));
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {customer.email || customer.phone || 'No contact info'}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewPersonModal(true)}
                  >
                    + New
                  </Button>
                </div>
              )}

              {errors.source && (
                <p className="text-sm text-destructive">{errors.source}</p>
              )}
            </div>
          </div>

          {/* Photos Section */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              Photos / Documents
              <span className="text-xs font-normal">(Optional)</span>
            </h4>
            <PartExchangeFileUpload
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Add Trade-In
            </Button>
          </DialogFooter>
        </form>

        {/* New Customer Modal */}
        <InlineSupplierAdd
          open={showNewPersonModal}
          onOpenChange={setShowNewPersonModal}
          hideTrigger
          onCustomerCreated={async (customerId) => {
            const { data: refreshedCustomers } = await refetchCustomers();
            const newCustomer = refreshedCustomers?.find(c => c.id === customerId);
            if (newCustomer) {
              setSelectedPerson({
                id: newCustomer.id,
                name: newCustomer.name,
                email: newCustomer.email || undefined,
                phone: newCustomer.phone || undefined,
              });
              setErrors(prev => ({ ...prev, source: '' }));
            }
            setShowNewPersonModal(false);
          }}
          defaultType="customer"
          lockType
        />
      </DialogContent>
    </Dialog>
  );
};
