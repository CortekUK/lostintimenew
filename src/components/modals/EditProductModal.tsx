import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateProduct, useUpdateProduct, useDeleteProduct, useSuppliers, useStockAdjustment } from '@/hooks/useDatabase';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { useLocations } from '@/hooks/useLocations';
import { useBrands } from '@/hooks/useBrands';
import { useAllProductCategories, useAddCustomProductCategory } from '@/hooks/useProductCategories';
import { useDocumentUpload } from '@/hooks/useProductDocuments';
import { useToast } from '@/hooks/use-toast';
import { Product, DocumentType } from '@/types';
import {
  Loader2,
  Save,
  Plus,
  Package,
  Users,
  Settings,
  PoundSterling,
  Archive,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  User,
  Building2,
  Trash2,
  MapPin,
  Search,
  Check,
  UserPlus,
  Tag,
  Star,
  Shield,
  X
} from 'lucide-react';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { DocumentUpload } from '@/components/ui/document-upload';
import { AddProductForm } from '@/components/forms/AddProductForm';
import { InlineSupplierAdd } from '@/components/forms/InlineSupplierAdd';
import { getCleanedDescription, extractIndividualSeller, cn, formatCurrency } from '@/lib/utils';

interface DocumentUploadItem {
  id: string;
  file: File;
  doc_type: DocumentType;
  title: string;
  note?: string;
  expires_at?: Date;
}

interface EditProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductModal({ product, open, onOpenChange }: EditProductModalProps) {
  const { data: suppliers } = useSuppliers();
  const { data: locations } = useLocations();
  const { data: brands } = useBrands();
  const { all: allCategories } = useAllProductCategories();
  const addCategoryMutation = useAddCustomProductCategory();
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const stockAdjustment = useStockAdjustment();
  const documentUpload = useDocumentUpload();
  const { toast } = useToast();
  const { canDelete } = usePermissions();
  const canDeleteProducts = canDelete(CRM_MODULES.PRODUCTS);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Supplier search state
  const [selectedRegisteredSupplier, setSelectedRegisteredSupplier] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [registeredSearchOpen, setRegisteredSearchOpen] = useState(false);
  const [selectedIndividualSupplier, setSelectedIndividualSupplier] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [individualSearchOpen, setIndividualSearchOpen] = useState(false);
  const [showNewIndividualModal, setShowNewIndividualModal] = useState(false);
  
  // Filter suppliers by type
  const registeredSuppliers = suppliers?.filter(s => s.supplier_type === 'registered') || [];
  const individualSuppliers = suppliers?.filter(s => s.supplier_type === 'customer') || [];
  
  const isEditMode = !!product;
  
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    description: '',
    category: '',
    material: '',
    size: '',
    color: '',
    brand_id: '',
    condition_grade: '',
    condition_notes: '',
    authentication_status: 'not_required' as 'not_required' | 'pending' | 'authenticated' | 'failed',
    authentication_provider: '',
    authentication_date: '',
    supplier_type: 'registered' as 'registered' | 'individual',
    supplier_id: '',
    individual_name: '',
    location_id: '',
    unit_cost: '',
    unit_price: '',
    reorder_threshold: '0',
    quantity: '',
    image_url: '',
    is_registered: false,
    registration_doc: '',
    is_consignment: false,
    consignment_supplier_id: null as number | null,
    consignment_terms: '',
    consignment_start_date: '',
    consignment_end_date: '',
    purchase_date: '',
    style_tags: [] as string[],
    rrp: ''
  });
  
  const [documents, setDocuments] = useState<DocumentUploadItem[]>([]);
  const [images, setImages] = useState<string[]>([]);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      const isIndividual = !product.supplier_id && product.description?.includes('Individual:');
      const individualName = extractIndividualSeller(product.description);
      const cleanedDescription = getCleanedDescription(product.description);
      
      setFormData({
        name: product.name || '',
        barcode: (product as any).barcode || '',
        description: cleanedDescription || '',
        category: product.category || '',
        material: product.material || '',
        size: product.size || '',
        color: product.color || '',
        brand_id: (product as any).brand_id?.toString() || '',
        condition_grade: (product as any).condition_grade || '',
        condition_notes: (product as any).condition_notes || '',
        authentication_status: (product as any).authentication_status || 'not_required',
        authentication_provider: (product as any).authentication_provider || '',
        authentication_date: (product as any).authentication_date || '',
        supplier_type: isIndividual ? 'individual' : 'registered',
        supplier_id: product.supplier_id?.toString() || '',
        individual_name: individualName || '',
        location_id: (product as any).location_id?.toString() || '',
        unit_cost: product.unit_cost?.toString() || '',
        unit_price: product.unit_price?.toString() || '',
        reorder_threshold: (product as any).reorder_threshold?.toString() || '0',
        quantity: '',
        image_url: (product as any).image_url || '',
        is_registered: (product as any).is_registered || false,
        registration_doc: (product as any).registration_doc || '',
        is_consignment: (product as any).is_consignment || false,
        consignment_supplier_id: (product as any).consignment_supplier_id || null,
        consignment_terms: (product as any).consignment_terms || '',
        consignment_start_date: (product as any).consignment_start_date || '',
        consignment_end_date: (product as any).consignment_end_date || '',
        purchase_date: (product as any).purchase_date || '',
        style_tags: (product as any).style_tags || [],
        rrp: (product as any).rrp?.toString() || ''
      });
      
      // Load images array, falling back to single image_url for backwards compatibility
      const productImages = (product as any).images;
      if (productImages && Array.isArray(productImages) && productImages.length > 0) {
        setImages(productImages);
      } else if ((product as any).image_url) {
        setImages([(product as any).image_url]);
      } else {
        setImages([]);
      }
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        barcode: '',
        description: '',
        category: '',
        material: '',
        size: '',
        color: '',
        brand_id: '',
        condition_grade: '',
        condition_notes: '',
        authentication_status: 'not_required',
        authentication_provider: '',
        authentication_date: '',
        supplier_type: 'registered',
        supplier_id: '',
        individual_name: '',
        location_id: '',
        unit_cost: '',
        unit_price: '',
        reorder_threshold: '0',
        quantity: '1',
        image_url: '',
        is_registered: false,
        registration_doc: '',
        is_consignment: false,
        consignment_supplier_id: null,
        consignment_terms: '',
        consignment_start_date: '',
        consignment_end_date: '',
        purchase_date: '',
        style_tags: [],
        rrp: ''
      });
      setDocuments([]);
      setImages([]);
    }
  }, [product, open]);

  const handleAddProductFormSubmit = async (formData: any, documents: any[], images: string[]) => {
    // Validate consignment fields if is_consignment is true
    if (formData.is_consignment && !formData.consignment_supplier_id) {
      toast({
        title: "Validation Error",
        description: "Please select a consignment supplier when marking a product as consignment.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create new product
      const hasRegistrationDoc = documents.some(doc => doc.doc_type === 'registration');
      
      const newProduct = await createProduct.mutateAsync({
        name: formData.name.trim(),
        barcode: formData.barcode.trim() || null,
        description: formData.supplier_type === 'individual' && formData.individual_name ?
          `Individual: ${formData.individual_name}${formData.description ? `\n${formData.description.trim()}` : ''}` :
          formData.description.trim() || null,
        category: formData.category || null,
        material: formData.material.trim() || null,
        size: formData.size.trim() || null,
        color: formData.color.trim() || null,
        brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
        condition_grade: formData.condition_grade && formData.condition_grade.trim() ? formData.condition_grade.trim() : null,
        condition_notes: formData.condition_notes?.trim() || null,
        authentication_status: formData.authentication_status || 'not_required',
        authentication_provider: formData.authentication_provider?.trim() || null,
        authentication_date: formData.authentication_date || null,
        supplier_id: formData.supplier_type === 'registered' && formData.supplier_id ? parseInt(formData.supplier_id) : null,
        location_id: formData.location_id ? parseInt(formData.location_id) : null,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        unit_price: parseFloat(formData.unit_price) || 0,
        reorder_threshold: parseInt(formData.reorder_threshold) || 0,
        image_url: images[0] || null, // Use first image as primary thumbnail
        images: images.length > 0 ? images : null, // Store all images/videos
        is_registered: hasRegistrationDoc || formData.is_registered,
        internal_sku: null, // This will be auto-generated by the database trigger
        is_consignment: formData.is_consignment,
        consignment_supplier_id: formData.is_consignment ? formData.consignment_supplier_id : null,
        consignment_start_date: formData.is_consignment ? formData.consignment_start_date || null : null,
        consignment_end_date: formData.is_consignment ? formData.consignment_end_date || null : null,
        consignment_terms: formData.is_consignment ? formData.consignment_terms || null : null,
        purchase_date: formData.purchase_date || null,
        style_tags: formData.style_tags.length > 0 ? formData.style_tags : null,
        rrp: formData.rrp ? parseFloat(formData.rrp) : null
      });

      // Upload documents if any
      if (documents.length > 0) {
        for (const doc of documents) {
          await documentUpload.mutateAsync({
            productId: newProduct.id,
            file: doc.file,
            metadata: {
              doc_type: doc.doc_type,
              title: doc.title,
              note: doc.note,
              expires_at: doc.expires_at?.toISOString(),
            },
          });
        }
      }

      // Create initial stock if quantity is specified
      const quantity = parseInt(formData.quantity);
      if (quantity > 0) {
        await stockAdjustment.mutateAsync({
          product_id: newProduct.id,
          quantity: quantity,
          note: 'Initial stock from product creation'
        });
      }
      
      toast({
        title: "Success",
        description: "Product created successfully"
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating product:', error);
      let errorMessage = "Failed to create product. Please try again.";
      
      // Check for duplicate constraint errors
      if (error?.code === '23505') {
        if (error?.message?.includes('barcode_key')) {
          errorMessage = "This barcode already exists in your inventory. Please use a different barcode or leave it empty.";
        } else if (error?.message?.includes('sku_key')) {
          errorMessage = "This SKU already exists. Please use a different SKU.";
        }
      }
      
      // Show actual error in development
      if (error?.message) {
        errorMessage = `${errorMessage}\n\nDetails: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    
    try {
      await deleteProduct.mutateAsync(product.id);
      
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
      
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product. It may be associated with sales or other records.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate consignment dates
    if (formData.is_consignment && formData.consignment_start_date && formData.consignment_end_date &&
        formData.consignment_end_date < formData.consignment_start_date) {
      toast({
        title: "Validation Error",
        description: "Consignment end date must be after the start date.",
        variant: "destructive"
      });
      return;
    }

    // Validate consignment fields if is_consignment is true
    if (formData.is_consignment && !formData.consignment_supplier_id) {
      toast({
        title: "Validation Error",
        description: "Please select a consignment supplier when marking a product as consignment.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (isEditMode && product) {
        // Update existing product
        await updateProduct.mutateAsync({
          id: product.id,
          updates: {
            name: formData.name.trim(),
            barcode: formData.barcode.trim() || null,
            description: formData.supplier_type === 'individual' && formData.individual_name ?
              `Individual: ${formData.individual_name}${formData.description ? `\n${formData.description.trim()}` : ''}` :
              formData.description.trim() || null,
            category: formData.category || null,
            material: formData.material.trim() || null,
            size: formData.size.trim() || null,
            color: formData.color.trim() || null,
            brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
            condition_grade: formData.condition_grade && formData.condition_grade.trim() ? formData.condition_grade.trim() : null,
            condition_notes: formData.condition_notes?.trim() || null,
            authentication_status: formData.authentication_status || 'not_required',
            authentication_provider: formData.authentication_provider?.trim() || null,
            authentication_date: formData.authentication_date || null,
            supplier_id: formData.supplier_type === 'registered' && formData.supplier_id ? parseInt(formData.supplier_id) : null,
            location_id: formData.location_id ? parseInt(formData.location_id) : null,
            unit_cost: parseFloat(formData.unit_cost) || 0,
            unit_price: parseFloat(formData.unit_price) || 0,
            reorder_threshold: parseInt(formData.reorder_threshold) || 0,
            image_url: formData.image_url || null,
            is_registered: formData.is_registered,
            registration_doc: formData.registration_doc || null,
            is_consignment: formData.is_consignment,
            consignment_supplier_id: formData.is_consignment ? formData.consignment_supplier_id : null,
            consignment_start_date: formData.is_consignment ? formData.consignment_start_date || null : null,
            consignment_end_date: formData.is_consignment ? formData.consignment_end_date || null : null,
            consignment_terms: formData.is_consignment ? formData.consignment_terms || null : null,
            purchase_date: formData.purchase_date || null,
            style_tags: formData.style_tags.length > 0 ? formData.style_tags : null,
            rrp: formData.rrp ? parseFloat(formData.rrp) : null
          }
        });
        
        // Create stock adjustment if quantity is specified
        const quantity = parseInt(formData.quantity);
        if (quantity > 0) {
          await stockAdjustment.mutateAsync({
            product_id: product.id,
            quantity: quantity,
            note: 'Stock adjustment from product edit'
          });
        }
      }
      
      toast({
        title: "Success",
        description: "Product updated successfully"
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Use AddProductForm for new products
  if (!isEditMode) {
    const isLoading = createProduct.isPending || updateProduct.isPending || stockAdjustment.isPending || documentUpload.isPending;
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 md:p-6 focus-within:ring-inset">
          <DialogHeader>
            <DialogTitle className="font-luxury text-xl">Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product with complete details, images and documentation
            </DialogDescription>
          </DialogHeader>
          
          <AddProductForm 
            onSubmit={handleAddProductFormSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    );
  }

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

  const isLoading = createProduct.isPending || updateProduct.isPending || stockAdjustment.isPending || documentUpload.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 md:p-6 focus-within:ring-inset">
        <DialogHeader className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <DialogTitle className="font-luxury text-2xl">{product.name}</DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-muted-foreground">
                  SKU: {(product as any).internal_sku}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {(product as any).is_registered && (
                <Badge className="bg-primary text-primary-foreground">
                  Registered
                </Badge>
              )}
              {(product as any).is_consignment && (
                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                  Consignment
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Accordion type="multiple" defaultValue={["basics", "brand-condition", "financials", "media"]} className="w-full space-y-4">
            
            {/* Basic Details Section */}
            <AccordionItem value="basics" className="border border-border rounded-lg px-3 sm:px-6">
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
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Chanel Classic Flap Bag..."
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
                
                {/* SKU Display */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Internal SKU: </span>
                    <span className="font-luxury text-primary font-medium">{(product as any)?.internal_sku || 'Auto-generated'}</span>
                  </p>
                </div>
                
                {/* Purchase Date */}
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Date this item was purchased or acquired
                  </p>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Ownership Source Section */}
            <AccordionItem value="ownership" className="border border-border rounded-lg px-3 sm:px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-luxury text-lg">Ownership Source</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
                {(product as any).is_consignment ? (
                  // Consignment Supplier Details
                  <div className="p-6 bg-warning/5 border border-warning/20 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="h-5 w-5 text-warning" />
                      <h4 className="font-luxury text-lg text-warning-foreground">Consignment Supplier</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Consignment Supplier *</Label>
                        <Select 
                          value={formData.consignment_supplier_id?.toString()} 
                          onValueChange={(value) => setFormData({...formData, consignment_supplier_id: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select consignment supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers?.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input 
                            type="date" 
                            value={formData.consignment_start_date}
                            onChange={(e) => setFormData({...formData, consignment_start_date: e.target.value})}
                          />
                        </div>
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
                ) : (
                  // Normal Product Supplier
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Supplier Type</Label>
                      <RadioGroup 
                        value={formData.supplier_type} 
                        onValueChange={(value: 'registered' | 'individual') => {
                          setFormData({...formData, supplier_type: value, supplier_id: '', individual_name: ''});
                          setSelectedRegisteredSupplier(null);
                          setSelectedIndividualSupplier(null);
                        }}
                        className="flex gap-8 mt-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="registered" id="registered" />
                          <Label htmlFor="registered" className="font-normal">Registered Supplier</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="individual" id="individual" />
                          <Label htmlFor="individual" className="font-normal">Walk-in Customer</Label>
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
                        {selectedIndividualSupplier || formData.individual_name ? (
                          // Show selected individual as chip
                          <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/50">
                            <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                              <Check className="h-3 w-3 text-primary" />
                              {selectedIndividualSupplier?.name || formData.individual_name}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedIndividualSupplier(null);
                                setFormData({...formData, supplier_id: '', individual_name: ''});
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          // Show search combobox for individual suppliers
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
                                            setFormData({...formData, supplier_id: individual.id.toString(), individual_name: individual.name});
                                            setIndividualSearchOpen(false);
                                          }}
                                          className="flex flex-col items-start py-3 cursor-pointer"
                                        >
                                          <span className="font-medium">{individual.name}</span>
                                          {(individual.email || individual.phone) && (
                                            <span className="text-xs text-muted-foreground mt-0.5">
                                              {[individual.email, individual.phone].filter(Boolean).join(' · ')}
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
                        <div className="flex justify-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewIndividualModal(true)}
                            className="text-xs text-muted-foreground"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Add new individual
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                    <Label>Material</Label>
                    <Input 
                      placeholder="Cotton, Polyester, Wool..." 
                      value={formData.material}
                      onChange={(e) => setFormData({...formData, material: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Input 
                      placeholder="XS, S, M, L, XL..." 
                      value={formData.size}
                      onChange={(e) => setFormData({...formData, size: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input 
                      placeholder="Black, Navy, Red..." 
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
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

                {locations && locations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
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
                </div>

                {/* Condition Grade */}
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

                {/* Condition Notes */}
                <div className="space-y-2">
                  <Label>Condition Notes</Label>
                  <Textarea
                    placeholder="Note any flaws, wear, alterations..."
                    value={formData.condition_notes}
                    onChange={(e) => setFormData({...formData, condition_notes: e.target.value})}
                    rows={2}
                  />
                </div>

                {/* Authentication */}
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label className="text-base font-medium">Authentication</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Authentication Status</Label>
                    <Select 
                      value={formData.authentication_status} 
                      onValueChange={(value: 'not_required' | 'pending' | 'authenticated' | 'failed') => 
                        setFormData({...formData, authentication_status: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_required">Not Required</SelectItem>
                        <SelectItem value="pending">Pending Verification</SelectItem>
                        <SelectItem value="authenticated">Authenticated</SelectItem>
                        <SelectItem value="failed">Failed Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.authentication_status !== 'not_required' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Authentication Provider</Label>
                        <Input
                          placeholder="Entrupy, Real Authentication..."
                          value={formData.authentication_provider}
                          onChange={(e) => setFormData({...formData, authentication_provider: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Authentication Date</Label>
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

            {/* Financials */}
            <AccordionItem value="financials" className="border border-border rounded-lg px-3 sm:px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center space-x-3">
                  <PoundSterling className="h-5 w-5 text-primary" />
                  <span className="font-luxury text-lg">Financials</span>
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

            {/* Stock Management */}
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
                    <Label htmlFor="quantity">Add Stock</Label>
                    <Input 
                      id="quantity"
                      type="number"
                      placeholder="0" 
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Adjust current inventory (+ to add, leave blank for no change)
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

            {/* Documents & Media */}
            <AccordionItem value="media" className="border border-border rounded-lg px-3 sm:px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="font-luxury text-lg">Documents & Media</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4 pb-6 px-1.5">
                {/* Product Images & Videos */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Product Media</Label>
                  <p className="text-sm text-muted-foreground">Upload images and videos for this product</p>
                  <MultiImageUpload
                    images={images}
                    onImagesChange={setImages}
                    maxImages={5}
                  />
                </div>

                <Separator />

                {/* Authentication Certificate */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Authentication Certificate</Label>
                      <p className="text-sm text-muted-foreground">Enable for items with authentication documents</p>
                    </div>
                    <Switch
                      checked={formData.is_registered}
                      onCheckedChange={(checked) => setFormData({...formData, is_registered: checked})}
                    />
                  </div>
                  
                  {formData.is_registered && (
                    <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                      <Label className="text-sm font-medium">Registration Document</Label>
                      <DocumentUpload 
                        onChange={(url) => setFormData({...formData, registration_doc: url})}
                        onRemove={() => setFormData({...formData, registration_doc: ''})}
                      />
                      {formData.registration_doc && (
                        <p className="text-xs text-green-600 mt-1">Document uploaded successfully</p>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-between items-center gap-3 pt-6">
            {canDeleteProducts && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading || deleteProduct.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </Button>
            )}
            {!canDeleteProducts && <div />}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || deleteProduct.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || deleteProduct.isPending || hasInvalidConsignmentDates}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </form>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{product.name}</strong> (SKU: {(product as any).internal_sku})?
                <br /><br />
                This action cannot be undone. The product will be completely removed from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteProduct.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteProduct.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Individual Supplier Add Modal */}
        {showNewIndividualModal && (
          <InlineSupplierAdd 
            onSupplierCreated={(supplierId) => {
              const newIndividual = individualSuppliers.find(s => s.id === supplierId);
              if (newIndividual) {
                setSelectedIndividualSupplier({ id: newIndividual.id, name: newIndividual.name });
                setFormData({...formData, supplier_id: supplierId.toString(), individual_name: newIndividual.name});
              }
              setShowNewIndividualModal(false);
            }}
            triggerClassName="hidden"
            lockType
            defaultType="customer"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}