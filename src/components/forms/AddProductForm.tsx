import React, { useState, useEffect, useRef } from 'react';
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
import { ProductCreationDocuments } from '@/components/documents/ProductCreationDocuments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useLocations } from '@/hooks/useLocations';
import { useAllProductCategories, useAddCustomProductCategory } from '@/hooks/useProductCategories';
import { useProductAISuggestions } from '@/hooks/useProductAISuggestions';
import { useBrands, CONDITION_GRADES, AUTHENTICATION_STATUSES } from '@/hooks/useBrands';
import { useWishlistMatches } from '@/hooks/useCustomerWishlists';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InlineSupplierAdd } from '@/components/forms/InlineSupplierAdd';
import { DocumentType } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
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
  UserPlus,
  Sparkles,
  Tag,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Star,
  Bell,
  User
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
  material: string;
  size: string;
  color: string;
  brand_id: string;
  condition_grade: string;
  condition_notes: string;
  authentication_status: string;
  authentication_provider: string;
  authentication_date: string;
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
  style_tags: string[];
  rrp: string;
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
  const { data: brands } = useBrands();
  const { all: allCategories, isLoading: categoriesLoading } = useAllProductCategories();
  const addCategoryMutation = useAddCustomProductCategory();

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    barcode: initialData?.barcode || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    material: initialData?.material || '',
    size: initialData?.size || '',
    color: initialData?.color || '',
    brand_id: initialData?.brand_id || '',
    condition_grade: initialData?.condition_grade || '',
    condition_notes: initialData?.condition_notes || '',
    authentication_status: initialData?.authentication_status || 'not_required',
    authentication_provider: initialData?.authentication_provider || '',
    authentication_date: initialData?.authentication_date || '',
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
    purchase_date: new Date().toISOString().split('T')[0],
    style_tags: initialData?.style_tags || [],
    rrp: initialData?.rrp || ''
  });

  // Check for customers looking for this brand/category/size combination
  const brandIdNumber = formData.brand_id ? parseInt(formData.brand_id) : null;
  const { data: wishlistMatches } = useWishlistMatches(
    brandIdNumber,
    formData.category || null,
    formData.size || null
  );
  
  // Debug wishlist matching
  useEffect(() => {
    if (brandIdNumber || formData.category || formData.size) {
      console.log('Wishlist match criteria:', {
        brand_id: brandIdNumber,
        category: formData.category,
        size: formData.size,
        matches: wishlistMatches?.length || 0
      });
    }
  }, [brandIdNumber, formData.category, formData.size, wishlistMatches]);
  
  const [documents, setDocuments] = useState<DocumentUploadItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // AI suggestions state - track which fields user has manually edited
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  const { suggestions, isLoading: aiLoading, hasSuggested } = useProductAISuggestions(formData.name);
  const lastAppliedSuggestions = useRef<string | null>(null);

  // Apply AI suggestions when they arrive - update AI-filled or empty fields, but not user-edited ones
  useEffect(() => {
    if (!suggestions) return;

    // Create a key to track if we've already applied these exact suggestions
    const suggestionsKey = JSON.stringify(suggestions);
    if (lastAppliedSuggestions.current === suggestionsKey) return;

    const updates: Partial<typeof formData> = {};
    const newAiFields = new Set<string>();

    // Update field if: it's empty OR it was AI-filled (not manually edited by user)
    const canUpdateField = (field: string, currentValue: string) => {
      return !currentValue || aiFilledFields.has(field) || !userEditedFields.has(field);
    };

    if (suggestions.category && canUpdateField('category', formData.category)) {
      updates.category = suggestions.category;
      newAiFields.add('category');
    }
    if (suggestions.material && canUpdateField('material', formData.material)) {
      updates.material = suggestions.material;
      newAiFields.add('material');
    }
    if (suggestions.size && canUpdateField('size', formData.size)) {
      updates.size = suggestions.size;
      newAiFields.add('size');
    }
    if (suggestions.color && canUpdateField('color', formData.color)) {
      updates.color = suggestions.color;
      newAiFields.add('color');
    }

    if (Object.keys(updates).length > 0) {
      lastAppliedSuggestions.current = suggestionsKey;
      setFormData(prev => ({ ...prev, ...updates }));
      setAiFilledFields(prev => new Set([...prev, ...newAiFields]));
      toast({
        title: 'AI suggested product details',
        description: 'Fields auto-filled based on product name. You can edit them if needed.',
      });
    }
  }, [suggestions]);

  // Individual supplier search state (walk-in sellers, not customers)
  const [selectedIndividualSupplier, setSelectedIndividualSupplier] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [individualSearchOpen, setIndividualSearchOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [showNewIndividualModal, setShowNewIndividualModal] = useState(false);
  
  // Registered supplier search state
  const [selectedRegisteredSupplier, setSelectedRegisteredSupplier] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [registeredSearchOpen, setRegisteredSearchOpen] = useState(false);
  
  // Filter suppliers by type
  const individualSuppliers = suppliers?.filter(s => s.supplier_type === 'customer') || [];
  const registeredSuppliers = suppliers?.filter(s => s.supplier_type === 'registered') || [];
  
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
                <Label htmlFor="name" className="text-primary font-medium flex items-center gap-2">
                  Product Name *
                  <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    AI-assisted
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    placeholder="Chanel Classic Flap Bag..."
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      // Reset tracking when product name changes - allow AI to re-suggest
                      lastAppliedSuggestions.current = null;
                      setUserEditedFields(new Set());
                      setAiFilledFields(new Set());
                    }}
                    required
                    className="focus:border-primary"
                  />
                  {aiLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
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
                  {selectedRegisteredSupplier || formData.supplier_id ? (
                    // Show selected registered supplier as chip
                    <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
                      <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                        <Check className="h-3 w-3 text-primary" />
                        {selectedRegisteredSupplier?.name || 
                          registeredSuppliers.find(s => s.id.toString() === formData.supplier_id)?.name || 
                          'Selected Supplier'}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRegisteredSupplier(null);
                          setFormData({...formData, supplier_id: ''});
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    // Show search combobox for registered suppliers
                    <div className="flex gap-2">
                      <Popover open={registeredSearchOpen} onOpenChange={setRegisteredSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1 justify-start text-muted-foreground hover:text-foreground"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Find registered supplier...
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0 border border-border bg-popover shadow-lg" align="start">
                          <Command className="rounded-lg bg-popover">
                            <CommandInput placeholder="Search by name, phone, or email..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                  No registered suppliers found.
                                </div>
                              </CommandEmpty>
                              <CommandGroup heading="Registered Suppliers">
                                {registeredSuppliers.map((supplier) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={`${supplier.name} ${supplier.email || ''} ${supplier.phone || ''}`}
                                    onSelect={() => {
                                      setSelectedRegisteredSupplier({ id: supplier.id, name: supplier.name });
                                      setFormData({...formData, supplier_id: supplier.id.toString()});
                                      setRegisteredSearchOpen(false);
                                    }}
                                    className="flex flex-col items-start py-3 cursor-pointer"
                                  >
                                    <span className="font-medium">{supplier.name}</span>
                                    {(supplier.email || supplier.phone) && (
                                      <span className="text-xs text-muted-foreground mt-0.5">
                                        {[supplier.email, supplier.phone].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <div className="flex justify-center">
                    <InlineSupplierAdd 
                      onSupplierCreated={(supplierId) => {
                        const newSupplier = registeredSuppliers.find(s => s.id === supplierId);
                        if (newSupplier) {
                          setSelectedRegisteredSupplier({ id: newSupplier.id, name: newSupplier.name });
                        }
                        setFormData({...formData, supplier_id: supplierId.toString()});
                      }}
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
              {aiLoading && (
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI analyzing...
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Category
                  {aiFilledFields.has('category') && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      AI
                    </Badge>
                  )}
                </Label>
                {!showNewCategoryInput ? (
                  <div className="space-y-2">
                    <Select value={formData.category} onValueChange={(value) => {
                      if (value === '__add_new__') {
                        setShowNewCategoryInput(true);
                      } else {
                        setFormData({...formData, category: value});
                        setAiFilledFields(prev => {
                          const next = new Set(prev);
                          next.delete('category');
                          return next;
                        });
                        setUserEditedFields(prev => new Set([...prev, 'category']));
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
                <Label className="flex items-center gap-2">
                  Material
                  {aiFilledFields.has('material') && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      AI
                    </Badge>
                  )}
                </Label>
                <Input
                  placeholder="Cotton, Polyester, Wool..."
                  value={formData.material}
                  onChange={(e) => {
                    setFormData({...formData, material: e.target.value});
                    setAiFilledFields(prev => {
                      const next = new Set(prev);
                      next.delete('material');
                      return next;
                    });
                    setUserEditedFields(prev => new Set([...prev, 'material']));
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Size
                  {aiFilledFields.has('size') && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      AI
                    </Badge>
                  )}
                </Label>
                <Input
                  placeholder="XS, S, M, L, XL..."
                  value={formData.size}
                  onChange={(e) => {
                    setFormData({...formData, size: e.target.value});
                    setAiFilledFields(prev => {
                      const next = new Set(prev);
                      next.delete('size');
                      return next;
                    });
                    setUserEditedFields(prev => new Set([...prev, 'size']));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Color
                  {aiFilledFields.has('color') && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      AI
                    </Badge>
                  )}
                </Label>
                <Input
                  placeholder="Black, Navy, Red..."
                  value={formData.color}
                  onChange={(e) => {
                    setFormData({...formData, color: e.target.value});
                    setAiFilledFields(prev => {
                      const next = new Set(prev);
                      next.delete('color');
                      return next;
                    });
                    setUserEditedFields(prev => new Set([...prev, 'color']));
                  }}
                />
              </div>
            </div>

            {/* Style Tags */}
            <div className="space-y-2">
              <Label>Style Tags</Label>
              <div className="flex flex-wrap gap-2">
                {['Casual', 'Formal', 'Vintage', 'Streetwear', 'Boho', 'Minimalist', 'Classic', 'Avant-garde', 'Athleisure', 'Evening'].map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={formData.style_tags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    className={formData.style_tags.includes(tag) ? "bg-primary" : ""}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        style_tags: prev.style_tags.includes(tag)
                          ? prev.style_tags.filter(t => t !== tag)
                          : [...prev.style_tags, tag]
                      }));
                    }}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select style tags that describe this item
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brand & Condition */}
        <AccordionItem value="brand-condition" className="border border-border rounded-lg px-3 sm:px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center space-x-3">
              <Tag className="h-5 w-5 text-primary" />
              <span className="font-luxury text-lg">Brand & Condition</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
            {/* Brand Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Brand / Designer
              </Label>
              <Select 
                value={formData.brand_id} 
                onValueChange={(value) => setFormData({...formData, brand_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {/* Group brands by tier */}
                  {brands && brands.filter(b => b.tier === 'luxury').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Luxury</div>
                      {brands.filter(b => b.tier === 'luxury').map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {brands && brands.filter(b => b.tier === 'premium').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Premium</div>
                      {brands.filter(b => b.tier === 'premium').map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {brands && brands.filter(b => b.tier === 'contemporary').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Contemporary</div>
                      {brands.filter(b => b.tier === 'contemporary').map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {brands && brands.filter(b => b.tier === 'high_street').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">High Street</div>
                      {brands.filter(b => b.tier === 'high_street').map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {brands && brands.filter(b => !b.tier).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Other</div>
                      {brands.filter(b => !b.tier).map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The designer or brand name of this item
              </p>
              
              {/* Wishlist Matches Alert */}
              {wishlistMatches && wishlistMatches.length > 0 && (
                <Alert className="mt-3 border-amber-300 bg-amber-50 dark:bg-amber-950">
                  <Bell className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    {wishlistMatches.length} customer{wishlistMatches.length > 1 ? 's' : ''} looking for this!
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <div className="mt-2 space-y-1">
                      {wishlistMatches.slice(0, 3).map((match) => (
                        <div key={match.wishlist_id} className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{match.customer_name}</span>
                          {match.brand_name && <Badge variant="outline" className="text-xs">{match.brand_name}</Badge>}
                          {match.category && <Badge variant="secondary" className="text-xs">{match.category}</Badge>}
                        </div>
                      ))}
                      {wishlistMatches.length > 3 && (
                        <p className="text-xs">...and {wishlistMatches.length - 3} more</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Condition Grading */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Condition Grade</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'new_with_tags', label: 'New with Tags', color: 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' },
                    { value: 'excellent', label: 'Excellent', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
                    { value: 'very_good', label: 'Very Good', color: 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400' },
                    { value: 'good', label: 'Good', color: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
                    { value: 'fair', label: 'Fair', color: 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400' }
                  ].map((grade) => (
                    <button
                      key={grade.value}
                      type="button"
                      onClick={() => setFormData({...formData, condition_grade: grade.value})}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border-2 transition-all",
                        formData.condition_grade === grade.value
                          ? grade.color
                          : "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/50"
                      )}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Condition Notes</Label>
                <Textarea
                  placeholder="Note any flaws, wear, alterations..."
                  value={formData.condition_notes}
                  onChange={(e) => setFormData({...formData, condition_notes: e.target.value})}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Authentication Tracking */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">Authentication</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Authentication Status</Label>
                  <Select 
                    value={formData.authentication_status} 
                    onValueChange={(value) => setFormData({...formData, authentication_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTHENTICATION_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            {status.value === 'authenticated' && <ShieldCheck className="h-4 w-4 text-green-600" />}
                            {status.value === 'pending' && <Clock className="h-4 w-4 text-amber-600" />}
                            {status.value === 'failed' && <ShieldAlert className="h-4 w-4 text-red-600" />}
                            {status.value === 'not_required' && <Shield className="h-4 w-4 text-muted-foreground" />}
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.authentication_status !== 'not_required' && (
                  <div className="space-y-2">
                    <Label>Authentication Provider</Label>
                    <Input
                      placeholder="e.g., Entrupy, Real Authentication..."
                      value={formData.authentication_provider}
                      onChange={(e) => setFormData({...formData, authentication_provider: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {formData.authentication_status === 'authenticated' && (
                <div className="space-y-2">
                  <Label>Authentication Date</Label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.authentication_date}
                      onChange={(e) => setFormData({...formData, authentication_date: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              )}
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
                  step="1" min="0"
                  placeholder="0" 
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
                  step="1" min="0"
                  placeholder="0" 
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  required
                  className="focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rrp" className="text-muted-foreground">Original RRP (Optional)</Label>
              <Input 
                id="rrp"
                type="number"
                step="1" min="0"
                placeholder="Original retail price" 
                value={formData.rrp}
                onChange={(e) => setFormData({...formData, rrp: e.target.value})}
                className="focus:border-primary"
              />
            </div>
            
            {/* Profit Display */}
            {(formData.unit_cost || formData.unit_price) && (
              <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border">
                <span className="text-sm text-muted-foreground">Profit</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "font-medium",
                    profit >= 0 ? "text-green-600" : "text-red-500"
                  )}>
                    £{profit.toFixed(2)}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    profit >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                  )}>
                    {markup.toFixed(1)}% markup
                  </span>
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