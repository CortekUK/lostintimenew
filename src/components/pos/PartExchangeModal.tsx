import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PartExchangeFileUpload } from './PartExchangeFileUpload';
import { Repeat, Search, X, Check } from 'lucide-react';
import { PartExchangeItem } from '@/types';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { InlineSupplierAdd } from '@/components/forms/InlineSupplierAdd';
import { useSuppliers } from '@/hooks/useSuppliers';
// Removed ToggleGroup - PX source is always customer at POS
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PartExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (partExchange: PartExchangeItem) => void;
}

export const PartExchangeModal = ({ isOpen, onClose, onAdd }: PartExchangeModalProps) => {
  const { data: filterOptions } = useFilterOptions();
  const { data: suppliers, refetch: refetchSuppliers } = useSuppliers();
  
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    description: '',
    serial: '',
    allowance: '',
    notes: '',
  });

  // Trade-in source is always customer at POS (suppliers are added via Products/Suppliers section)
  const [selectedPerson, setSelectedPerson] = useState<{ id: number; name: string; email?: string; phone?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNewPersonModal, setShowNewPersonModal] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_name.trim()) {
      newErrors.product_name = "Product name is required";
    }

    if (!formData.allowance || parseInt(formData.allowance) <= 0) {
      newErrors.allowance = "Allowance must be greater than 0";
    }

    // Validate customer selection
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
      id: Date.now().toString(), // temporary ID for cart management
      product_name: formData.product_name,
      category: formData.category || undefined,
      description: formData.description || undefined,
      serial: formData.serial || undefined,
      allowance: parseInt(formData.allowance),
      notes: formData.notes || undefined,
      customer_name: selectedPerson?.name,
      customer_email: selectedPerson?.email,
      customer_phone: selectedPerson?.phone,
      supplier_id: selectedPerson?.id,
    };

    // Analytics tracking
    if (selectedPerson) {
      console.log('px_person_attached', {
        mode: 'record',
        person_type: 'customer',
      });
    }

    onAdd(partExchange);
    
    // Reset form
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
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-luxury text-2xl">
            <Repeat className="h-6 w-6 text-[#D4AF37]" />
            Add Part Exchange
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="product_name">Product Name *</Label>
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
              aria-describedby={errors.product_name ? "product-name-error" : undefined}
            />
            {errors.product_name && (
              <p id="product-name-error" className="text-sm text-destructive mt-1">
                {errors.product_name}
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
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
                autoFocus
              />
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Black dial, stainless steel, ref 116610LN"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="serial">Serial Number</Label>
            <Input
              id="serial"
              value={formData.serial}
              onChange={(e) => setFormData(prev => ({ ...prev, serial: e.target.value }))}
              placeholder="Optional - enter serial number if available"
            />
          </div>

          <div>
            <Label htmlFor="allowance">Trade-In Allowance (£) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] font-medium">
                £
              </span>
              <Input
                id="allowance"
                type="text"
                inputMode="numeric"
                value={formData.allowance}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, allowance: value }));
                  setErrors(prev => ({ ...prev, allowance: '' }));
                }}
                placeholder="0"
                className={cn(
                  "pl-8",
                  errors.allowance && "border-destructive focus-visible:ring-destructive"
                )}
                aria-required="true"
              />
            </div>
            {errors.allowance && (
              <p className="text-sm text-destructive mt-1">{errors.allowance}</p>
            )}
          </div>

          {/* Customer Selection */}
          <div className="space-y-3">
            <Label>Customer *</Label>

            {/* Contextual Person Selector */}
            <div className="space-y-3">
              {selectedPerson ? (
                // Show selected person as chip
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
                      setErrors(prev => ({ ...prev, source: '' }));
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                // Show search combobox
                <div className="flex gap-2">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start text-muted-foreground font-normal"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find customer by name, phone, or email…
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          <CommandGroup>
                            {suppliers
                              ?.filter(s => s.supplier_type === 'customer')
                              ?.map((person) => (
                                <CommandItem
                                  key={person.id}
                                  onSelect={() => {
                                    setSelectedPerson({
                                      id: person.id,
                                      name: person.name,
                                      email: person.email || undefined,
                                      phone: person.phone || undefined,
                                    });
                                    setSearchOpen(false);
                                    setErrors(prev => ({ ...prev, source: '' }));
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

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewPersonModal(true)}
                  >
                    + New Customer
                  </Button>
                </div>
              )}

              {errors.source && (
                <p className="text-sm text-destructive">{errors.source}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Valuation notes, defects, condition details..."
              rows={2}
            />
          </div>

          <div>
            <Label>Upload Photos / Documents (Optional)</Label>
            <PartExchangeFileUpload
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-[#D4AF37] hover:bg-[#B8942E] text-white font-semibold"
            >
              Add Trade-In
            </Button>
          </div>
        </form>

        {/* New Person Modal */}
        <InlineSupplierAdd
          open={showNewPersonModal}
          onOpenChange={setShowNewPersonModal}
          hideTrigger
          onSupplierCreated={async (supplierId) => {
            // Refetch suppliers to get the newly created one
            const { data: refreshedSuppliers } = await refetchSuppliers();
            const newPerson = refreshedSuppliers?.find(s => s.id === supplierId);
            if (newPerson) {
              setSelectedPerson({
                id: newPerson.id,
                name: newPerson.name,
                email: newPerson.email || undefined,
                phone: newPerson.phone || undefined,
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