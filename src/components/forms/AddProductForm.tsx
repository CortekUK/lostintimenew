import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { RegisteredWatchSection } from '@/components/forms/RegisteredWatchSection';
import { ProductCreationDocuments } from '@/components/documents/ProductCreationDocuments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useLocations } from '@/hooks/useLocations';
import { useAllProductCategories, useAddCustomProductCategory } from '@/hooks/useProductCategories';
import { InlineSupplierAdd } from '@/components/forms/InlineSupplierAdd';
import { DocumentType } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Users,
  Settings,
  PoundSterling,
  Archive,
  Image as ImageIcon,
  FileText,
  Loader2,
  TrendingUp,
  Calendar as CalendarIcon,
  MapPin,
  Plus,
  X,
  Search,
  Check,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploadItem {
  id: string;
  file: File;
  doc_type: DocumentType;
  title: string;
  note?: string;
  expires_at?: Date;
}

interface FormData {
  name: string;
  barcode: string;
  description: string;
  category: string;
  metal: string;
  karat: string;
  gemstone: string;
  supplier_type: 'registered' | 'individual';
  supplier_id: string;
  individual_name: string;
  location_id: string;
  unit_cost: string;
  unit_price: string;
  reorder_threshold: string;
  quantity: string;
  is_registered: boolean;
  is_consignment: boolean;
  consignment_supplier_id: number | null;
  consignment_terms: string;
  consignment_start_date: string;
  consignment_end_date: string;
  purchase_date: string;
  purchased_today: boolean;
}

interface AddProductFormProps {
  onSubmit: (formData: any, documents: DocumentUploadItem[], images: string[]) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<FormData>;
}

export function AddProductForm({ onSubmit, onCancel, isLoading = false, initialData }: AddProductFormProps) {
  const { data: suppliers } = useSuppliers();
  const { data: locations } = useLocations();
  const { all: allCategories, isLoading: categoriesLoading } = useAllProductCategories();
  const addCategoryMutation = useAddCustomProductCategory();

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    barcode: initialData?.barcode || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    metal: initialData?.metal || '',
    karat: initialData?.karat || '',
    gemstone: initialData?.gemstone || '',
    supplier_type: (initialData?.supplier_type || 'registered') as 'registered' | 'individual',
    supplier_id: initialData?.supplier_id || '',
    individual_name: initialData?.individual_name || '',
    location_id: initialData?.location_id || '',
    unit_cost: initialData?.unit_cost || '',
    unit_price: initialData?.unit_price || '',
    reorder_threshold: initialData?.reorder_threshold || '0',
    quantity: initialData?.quantity || '1',
    is_registered: initialData?.is_registered || false,
    is_consignment: initialData?.is_consignment || false,
    consignment_supplier_id: initialData?.consignment_supplier_id || null,
    consignment_terms: initialData?.consignment_terms || '',
    consignment_start_date: initialData?.consignment_start_date || '',
    consignment_end_date: initialData?.consignment_end_date || '',
    purchased_today: true,
    purchase_date: new Date().toISOString().split('T')[0]
  });
  
  const [documents, setDocuments] = useState<DocumentUploadItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Individual supplier search state (walk-in sellers, not customers)
  const [selectedIndividualSupplier, setSelectedIndividualSupplier] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [individualSearchOpen, setIndividualSearchOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [showNewIndividualModal, setShowNewIndividualModal] = useState(false);
  
  // Filter individual suppliers for the search (type 'customer' in DB = individual sellers)
  const individualSuppliers = suppliers?.filter(s => s.supplier_type === 'customer') || [];
  
  // Generate SKU preview
  const generateSkuPreview = () => {
    return '00XXX (auto-generated)';
  };

  // Calculate profit and markup
  const profit = (Number(formData.unit_price) - Number(formData.unit_cost)) || 0;
  const markup = Number(formData.unit_cost) > 0
    ? (((Number(formData.unit_price) - Number(formData.unit_cost)) / Number(formData.unit_cost)) * 100)
    : 0;

  // Validate consignment dates
  const hasInvalidConsignmentDates = formData.is_consignment &&
    formData.consignment_start_date &&
    formData.consignment_end_date &&
    formData.consignment_end_date < formData.consignment_start_date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInvalidConsignmentDates) {
      return;
    }
    await onSubmit(formData, documents, images);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 overflow-x-hidden">
      <Accordion type="multiple" defaultValue={["basic-details", "pricing", "media"]} className="w-full space-y-4">
        
        {/* Basic Details */}
        <AccordionItem value="basic-details" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Basic Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-primary font-medium">Product Name *</Label>
                <Input 
                  id="name" 
                  placeholder="Diamond Solitaire Ring..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                  className="focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="barcode">Serial Number</Label>
                <Input 
                  id="barcode" 
                  placeholder="External serial number (optional)"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Optional but recommended for tracking
                </p>
              </div>
            </div>
            
            {/* SKU Preview */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Internal SKU will be: </span>
                <span className="font-luxury text-primary font-medium">{generateSkuPreview()}</span>
              </p>
            </div>
            
            {/* Purchase Date Section */}
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Purchase Date</Label>
                  <p className="text-sm text-muted-foreground">Track when this item was acquired</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="purchased-today"
                    checked={formData.purchased_today}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData, 
                        purchased_today: checked,
                        purchase_date: checked ? new Date().toISOString().split('T')[0] : formData.purchase_date
                      });
                    }}
                  />
                  <Label htmlFor="purchased-today" className="font-normal cursor-pointer">
                    Purchased today
                  </Label>
                </div>
              </div>
              
              {!formData.purchased_today && (
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">Purchase Date *</Label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="purchase-date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                      required={!formData.purchased_today}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the date this item was purchased or acquired
                  </p>
                </div>
              )}
            </div>

            {/* Location */}
            {locations && locations.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div className="flex items-center gap-2 pt-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label>Location</Label>
                </div>
                <Select value={formData.location_id} onValueChange={(value) => setFormData({...formData, location_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(loc => loc.status === 'active').map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Supplier & Ownership */}
        <AccordionItem value="supplier" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Supplier & Ownership</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Supplier Type</Label>
                <RadioGroup 
                  value={formData.supplier_type} 
                  onValueChange={(value: 'registered' | 'individual') => 
                    setFormData({...formData, supplier_type: value, supplier_id: '', individual_name: ''})}
                  className="flex gap-8 mt-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="registered" id="registered" />
                    <Label htmlFor="registered" className="font-normal">Registered Supplier</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual" className="font-normal">Individual</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {formData.supplier_type === 'registered' ? (
                <div className="space-y-3">
                  <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.filter(s => s.supplier_type === 'registered').map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-center">
                    <InlineSupplierAdd 
                      onSupplierCreated={(supplierId) => setFormData({...formData, supplier_id: supplierId.toString()})}
                      triggerClassName="text-xs"
                      lockType
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedIndividualSupplier ? (
                    // Show selected individual as chip
                    <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
                      <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                        <Check className="h-3 w-3 text-primary" />
                        {selectedIndividualSupplier.name}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedIndividualSupplier(null);
                          setFormData({...formData, supplier_id: ''});
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    // Show search combobox and options
                    <>
                      <div className="flex gap-2">
                        <Popover open={individualSearchOpen} onOpenChange={setIndividualSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="flex-1 justify-start text-muted-foreground hover:text-foreground"
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Find existing individual...
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[350px] p-0 border border-border bg-popover shadow-lg" align="start">
                            <Command className="rounded-lg bg-popover">
                              <CommandInput placeholder="Search by name, phone, or email..." />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="py-4 text-center text-sm text-muted-foreground">
                                    No individuals found.
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      className="block mx-auto mt-2"
                                      onClick={() => {
                                        setIndividualSearchOpen(false);
                                        setShowNewIndividualModal(true);
                                      }}
                                    >
                                      <UserPlus className="h-3 w-3 mr-1" />
                                      Add new individual
                                    </Button>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup heading="Individuals">
                                  {individualSuppliers.map((individual) => (
                                    <CommandItem
                                      key={individual.id}
                                      value={`${individual.name} ${individual.email || ''} ${individual.phone || ''}`}
                                      onSelect={() => {
                                        setSelectedIndividualSupplier({ id: individual.id, name: individual.name });
                                        setFormData({...formData, supplier_id: individual.id.toString()});
                                        setIndividualSearchOpen(false);
                                        setQuickAddMode(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{individual.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {[individual.email, individual.phone].filter(Boolean).join(' · ') || 'No contact info'}
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
                          onClick={() => setShowNewIndividualModal(true)}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          New
                        </Button>
                      </div>
                      
                      {/* Quick Add option */}
                      <div className="space-y-2">
                        <button 
                          type="button" 
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                          onClick={() => setQuickAddMode(!quickAddMode)}
                        >
                          {quickAddMode ? 'Hide quick add' : 'Or quick add name only'}
                        </button>
                        {quickAddMode && (
                          <div className="p-3 border border-dashed border-border rounded-lg bg-muted/30 space-y-3">
                            <Input 
                              placeholder="Name only" 
                              value={formData.individual_name}
                              onChange={(e) => setFormData({...formData, individual_name: e.target.value})}
                            />
                            <p className="text-xs text-muted-foreground">
                              This saves the name with the product but won't create an individual seller record for future reference.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* New Individual Modal */}
                  <InlineSupplierAdd
                    defaultType="customer"
                    hideTrigger
                    lockType
                    open={showNewIndividualModal}
                    onOpenChange={setShowNewIndividualModal}
                    onSupplierCreated={(supplierId) => {
                      // Refetch suppliers to get the new individual
                      const newIndividual = suppliers?.find(s => s.id === supplierId);
                      if (newIndividual) {
                        setSelectedIndividualSupplier({ id: newIndividual.id, name: newIndividual.name });
                      } else {
                        // Fallback - just set the ID, the name will be fetched on next render
                        setSelectedIndividualSupplier({ id: supplierId, name: 'Individual' });
                      }
                      setFormData({...formData, supplier_id: supplierId.toString()});
                      setShowNewIndividualModal(false);
                      setQuickAddMode(false);
                    }}
                  />
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Consignment Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Consignment Product</Label>
                  <p className="text-sm text-muted-foreground">Enable if this product is on consignment</p>
                </div>
                <Switch
                  checked={formData.is_consignment}
                  onCheckedChange={(checked) => {
                    const updates: Partial<typeof formData> = { is_consignment: checked };
                    
                    // Auto-fill consignment supplier if enabling and a supplier is selected
                    if (checked && !formData.consignment_supplier_id) {
                      if (formData.supplier_type === 'registered' && formData.supplier_id) {
                        updates.consignment_supplier_id = parseInt(formData.supplier_id);
                      } else if (formData.supplier_type === 'individual' && selectedIndividualSupplier) {
                        updates.consignment_supplier_id = selectedIndividualSupplier.id;
                      }
                    }
                    
                    // Auto-fill start date to today if not already set
                    if (checked && !formData.consignment_start_date) {
                      updates.consignment_start_date = new Date().toISOString().split('T')[0];
                    }
                    
                    setFormData({...formData, ...updates});
                  }}
                />
              </div>
              
              {formData.is_consignment && (
                <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consignment Supplier *</Label>
                      <div className="space-y-2">
                        <Select 
                          value={formData.consignment_supplier_id?.toString()} 
                          onValueChange={(value) => setFormData({...formData, consignment_supplier_id: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select consignment supplier" />
                          </SelectTrigger>
                <SelectContent>
                  {suppliers
                    ?.sort((a, b) => {
                      // Prioritize customer suppliers for consignment products
                      if (formData.is_consignment) {
                        if (a.supplier_type === 'customer' && b.supplier_type !== 'customer') return -1;
                        if (a.supplier_type !== 'customer' && b.supplier_type === 'customer') return 1;
                      }
                      return 0;
                    })
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        <div className="flex items-center gap-2">
                          {supplier.name}
                          {supplier.supplier_type === 'customer' && (
                            <span className="text-xs text-blue-600">(Individual)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
                        </Select>
                        <div className="flex justify-center">
                          <InlineSupplierAdd 
                            onSupplierCreated={(supplierId) => setFormData({...formData, consignment_supplier_id: supplierId})}
                            triggerClassName="text-xs"
                            lockType
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date" 
                        value={formData.consignment_start_date}
                        onChange={(e) => setFormData({...formData, consignment_start_date: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={formData.consignment_end_date}
                        onChange={(e) => setFormData({...formData, consignment_end_date: e.target.value})}
                        min={formData.consignment_start_date || undefined}
                        className={hasInvalidConsignmentDates ? 'border-red-500' : ''}
                      />
                      {hasInvalidConsignmentDates && (
                        <p className="text-xs text-red-500">End date must be after start date</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Terms</Label>
                      <Input
                        placeholder="Commission %, return policy..."
                        value={formData.consignment_terms}
                        onChange={(e) => setFormData({...formData, consignment_terms: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Specifications */}
        <AccordionItem value="specifications" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Specifications</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label>Category</Label>
                {!showNewCategoryInput ? (
                  <div className="space-y-2">
                    <Select value={formData.category} onValueChange={(value) => {
                      if (value === '__add_new__') {
                        setShowNewCategoryInput(true);
                      } else {
                        setFormData({...formData, category: value});
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-primary font-medium">
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" />
                            Add new category...
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter new category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCategoryName.trim()) {
                            addCategoryMutation.mutate(newCategoryName, {
                              onSuccess: (category) => {
                                setFormData({...formData, category});
                                setNewCategoryName('');
                                setShowNewCategoryInput(false);
                              }
                            });
                          }
                        } else if (e.key === 'Escape') {
                          setNewCategoryName('');
                          setShowNewCategoryInput(false);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          addCategoryMutation.mutate(newCategoryName, {
                            onSuccess: (category) => {
                              setFormData({...formData, category});
                              setNewCategoryName('');
                              setShowNewCategoryInput(false);
                            }
                          });
                        }
                      }}
                    >
                      {addCategoryMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNewCategoryName('');
                        setShowNewCategoryInput(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Metal</Label>
                <Input 
                  placeholder="Gold, Silver, Platinum..." 
                  value={formData.metal}
                  onChange={(e) => setFormData({...formData, metal: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label>Karat</Label>
                <Input 
                  placeholder="9ct, 18ct, 24ct..." 
                  value={formData.karat}
                  onChange={(e) => setFormData({...formData, karat: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Gemstone</Label>
                <Input 
                  placeholder="Diamond, Ruby, Sapphire..." 
                  value={formData.gemstone}
                  onChange={(e) => setFormData({...formData, gemstone: e.target.value})}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pricing */}
        <AccordionItem value="pricing" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <PoundSterling className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Pricing</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="cost" className="text-primary font-medium">Cost Price *</Label>
                <Input 
                  id="cost"
                  type="number"
                  step="0.01" min="0"
                  placeholder="0.00" 
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                  required
                  className="focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price" className="text-primary font-medium">Sell Price *</Label>
                <Input 
                  id="price"
                  type="number"
                  step="0.01" min="0"
                  placeholder="0.00" 
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  required
                  className="focus:border-primary"
                />
              </div>
            </div>
            
            {/* Dynamic Profit Display */}
            {(formData.unit_cost || formData.unit_price) && (
              <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TrendingUp className={cn(
                    "h-6 w-6",
                    profit >= 0 ? "text-green-600" : "text-red-500"
                  )} />
                  <div>
                    <p className="text-sm text-muted-foreground">Calculated Profit</p>
                    <p className={cn(
                      "font-luxury text-2xl font-semibold",
                      profit >= 0 ? "text-green-600" : "text-red-500"
                    )}>
                      £{profit.toFixed(2)} ({markup.toFixed(1)}% markup)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Stock */}
        <AccordionItem value="stock" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <Archive className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Stock Management</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Starting inventory count
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reorder">Reorder Threshold</Label>
                <Input
                  id="reorder"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.reorder_threshold}
                  onChange={(e) => setFormData({...formData, reorder_threshold: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Media & Documents */}
        <AccordionItem value="media" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <ImageIcon className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Media & Documents</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-8 pt-4 pb-6 px-1.5">
            {/* Product Images */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Product Images</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload high-quality images of your product. The first image will be used as the primary photo.
                </p>
              </div>
              
              <MultiImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={5}
              />
            </div>
            
            <Separator />
            
            {/* Registered Watch Section */}
            <RegisteredWatchSection
              isRegistered={formData.is_registered}
              onRegisteredChange={(checked) => setFormData({...formData, is_registered: checked})}
              documents={documents}
              onDocumentsChange={setDocuments}
            />
            
            <Separator />
            
            {/* Additional Documents */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Additional Documents</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload invoices, appraisals, or other product-related documents.
              </p>
              
              <ProductCreationDocuments
                documents={documents}
                onDocumentsChange={setDocuments}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Description */}
        <AccordionItem value="description" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Description</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4 pb-6 px-1.5">
            <div className="space-y-2">
              <Label htmlFor="description">Product Description</Label>
              <Textarea 
                id="description"
                placeholder="Detailed description of the product, including unique features, condition, history..."
                className="min-h-[120px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Optional but recommended for better product identification
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button 
          type="button" 
          variant="outline" 
          disabled={isLoading}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="premium"
          disabled={isLoading || !formData.name || !formData.unit_cost || !formData.unit_price || hasInvalidConsignmentDates}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Product...
            </>
          ) : (
            'Create Product'
          )}
        </Button>
      </div>
    </form>
  );
}