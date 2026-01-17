import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Repeat, Search, Check } from 'lucide-react';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useSuppliers } from '@/hooks/useSuppliers';
import { InlineSupplierAdd } from '@/components/forms/InlineSupplierAdd';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddPartExchangeToSale } from '@/hooks/useAddPartExchangeToSale';

interface AddPartExchangeToSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
}

export const AddPartExchangeToSaleModal = ({ isOpen, onClose, saleId }: AddPartExchangeToSaleModalProps) => {
  const { data: filterOptions } = useFilterOptions();
  const { data: suppliers, refetch: refetchSuppliers } = useSuppliers();
  const addPartExchangeMutation = useAddPartExchangeToSale();

  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    description: '',
    serial: '',
    allowance: '',
    notes: '',
    lateAdditionReason: '',
  });

  const [tradeInSource, setTradeInSource] = useState<'customer' | 'supplier'>('customer');
  const [selectedPerson, setSelectedPerson] = useState<{ id: number; name: string; type: string } | null>(null);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickContact, setQuickContact] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNewPersonModal, setShowNewPersonModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    }

    if (!formData.allowance || parseInt(formData.allowance) <= 0) {
      newErrors.allowance = 'Allowance must be greater than 0';
    }

    if (tradeInSource === 'customer') {
      if (!selectedPerson && !quickName.trim()) {
        newErrors.source = 'Please select a customer or enter a quick name';
      }
    } else {
      if (!selectedPerson) {
        newErrors.source = 'Please select a supplier';
      }
    }

    if (!formData.lateAdditionReason.trim()) {
      newErrors.lateAdditionReason = 'Please provide a reason for adding this late';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      category: '',
      description: '',
      serial: '',
      allowance: '',
      notes: '',
      lateAdditionReason: '',
    });
    setTradeInSource('customer');
    setSelectedPerson(null);
    setQuickAddMode(false);
    setQuickName('');
    setQuickContact('');
    setErrors({});
    setShowCustomCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    addPartExchangeMutation.mutate(
      {
        saleId,
        title: formData.product_name,
        category: formData.category || undefined,
        description: formData.description || undefined,
        serial: formData.serial || undefined,
        allowance: parseInt(formData.allowance),
        notes: formData.notes || undefined,
        customerName: selectedPerson ? selectedPerson.name : quickName || undefined,
        customerContact: quickContact || undefined,
        customerSupplierId: selectedPerson?.id,
        lateAdditionReason: formData.lateAdditionReason,
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-luxury text-2xl">
            <Repeat className="h-6 w-6 text-primary" />
            Add Part Exchange to Sale #{saleId}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Late Addition Reason - Required */}
          <div className="p-4 border border-amber-500/50 rounded-lg bg-amber-500/10">
            <Label htmlFor="lateAdditionReason" className="text-amber-700 dark:text-amber-400">
              Reason for Late Addition *
            </Label>
            <Textarea
              id="lateAdditionReason"
              value={formData.lateAdditionReason}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, lateAdditionReason: e.target.value }));
                setErrors((prev) => ({ ...prev, lateAdditionReason: '' }));
              }}
              placeholder="e.g., Customer forgot to mention trade-in during checkout..."
              rows={2}
              className={cn(errors.lateAdditionReason && 'border-destructive')}
            />
            {errors.lateAdditionReason && (
              <p className="text-sm text-destructive mt-1">{errors.lateAdditionReason}</p>
            )}
          </div>

          <div>
            <Label htmlFor="product_name">Product Name *</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, product_name: e.target.value }));
                setErrors((prev) => ({ ...prev, product_name: '' }));
              }}
              placeholder="e.g., Rolex Submariner, Diamond Ring..."
              autoFocus
            />
            {errors.product_name && (
              <p className="text-sm text-destructive mt-1">{errors.product_name}</p>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={showCustomCategory ? '__other__' : formData.category}
              onValueChange={(value) => {
                if (value === '__other__') {
                  setFormData((prev) => ({ ...prev, category: '' }));
                  setShowCustomCategory(true);
                } else {
                  setFormData((prev) => ({ ...prev, category: value }));
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
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              />
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Black dial, stainless steel, ref 116610LN"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="serial">Serial Number</Label>
            <Input
              id="serial"
              value={formData.serial}
              onChange={(e) => setFormData((prev) => ({ ...prev, serial: e.target.value }))}
              placeholder="Optional - enter serial number if available"
            />
          </div>

          <div>
            <Label htmlFor="allowance">Trade-In Allowance (£) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-medium">
                £
              </span>
              <Input
                id="allowance"
                type="text"
                inputMode="numeric"
                value={formData.allowance}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData((prev) => ({ ...prev, allowance: value }));
                  setErrors((prev) => ({ ...prev, allowance: '' }));
                }}
                placeholder="0"
                className={cn('pl-8', errors.allowance && 'border-destructive')}
              />
            </div>
            {errors.allowance && <p className="text-sm text-destructive mt-1">{errors.allowance}</p>}
          </div>

          {/* Trade-in Source Selection */}
          <div className="space-y-3">
            <Label>Trade-in Source *</Label>

            <ToggleGroup
              type="single"
              value={tradeInSource}
              onValueChange={(value) => {
                if (value) {
                  setTradeInSource(value as 'customer' | 'supplier');
                  setSelectedPerson(null);
                  setQuickAddMode(false);
                  setQuickName('');
                  setQuickContact('');
                  setErrors((prev) => ({ ...prev, source: '' }));
                }
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="customer" className="px-6">
                Customer
              </ToggleGroupItem>
              <ToggleGroupItem value="supplier" className="px-6">
                Supplier
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="space-y-3">
              {selectedPerson ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    {selectedPerson.name}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setSelectedPerson(null);
                      setErrors((prev) => ({ ...prev, source: '' }));
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
                        className="flex-1 justify-start text-muted-foreground font-normal"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        {tradeInSource === 'customer'
                          ? 'Find customer by name, phone, or email…'
                          : 'Find supplier by name…'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={
                            tradeInSource === 'customer' ? 'Search customers...' : 'Search suppliers...'
                          }
                        />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          <CommandGroup>
                            {suppliers
                              ?.filter((s) =>
                                tradeInSource === 'customer'
                                  ? s.supplier_type === 'customer'
                                  : s.supplier_type === 'registered'
                              )
                              ?.map((person) => (
                                <CommandItem
                                  key={person.id}
                                  onSelect={() => {
                                    setSelectedPerson({
                                      id: person.id,
                                      name: person.name,
                                      type: tradeInSource,
                                    });
                                    setSearchOpen(false);
                                    setErrors((prev) => ({ ...prev, source: '' }));
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{person.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {person.email || person.phone || 'No contact'}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button type="button" variant="outline" onClick={() => setShowNewPersonModal(true)}>
                    + New {tradeInSource === 'customer' ? 'Customer' : 'Supplier'}
                  </Button>
                </div>
              )}

              {tradeInSource === 'customer' && !selectedPerson && (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    onClick={() => setQuickAddMode(!quickAddMode)}
                  >
                    {quickAddMode ? 'Hide quick add' : 'Or quick add (no record created)'}
                  </button>

                  {quickAddMode && (
                    <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                      <div>
                        <Label htmlFor="quick_name" className="text-sm">
                          Quick Name *
                        </Label>
                        <Input
                          id="quick_name"
                          value={quickName}
                          onChange={(e) => {
                            setQuickName(e.target.value);
                            setErrors((prev) => ({ ...prev, source: '' }));
                          }}
                          placeholder="Customer name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quick_contact" className="text-sm">
                          Quick Contact
                        </Label>
                        <Input
                          id="quick_contact"
                          value={quickContact}
                          onChange={(e) => setQuickContact(e.target.value)}
                          placeholder="Phone or email (optional)"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errors.source && <p className="text-sm text-destructive">{errors.source}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Valuation notes, defects, condition details..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={addPartExchangeMutation.isPending}
            >
              {addPartExchangeMutation.isPending ? 'Adding...' : 'Add Trade-In'}
            </Button>
          </div>
        </form>

        {/* New Person Modal */}
        <InlineSupplierAdd
          open={showNewPersonModal}
          onOpenChange={setShowNewPersonModal}
          defaultType={tradeInSource === 'customer' ? 'customer' : 'registered'}
          lockType
          hideTrigger
          onSupplierCreated={(newSupplierId) => {
            refetchSuppliers().then(({ data }) => {
              const newSupplier = data?.find(s => s.id === newSupplierId);
              if (newSupplier) {
                setSelectedPerson({
                  id: newSupplier.id,
                  name: newSupplier.name,
                  type: tradeInSource,
                });
              }
              setShowNewPersonModal(false);
              setErrors((prev) => ({ ...prev, source: '' }));
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
