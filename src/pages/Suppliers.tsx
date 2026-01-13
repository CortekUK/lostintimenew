import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import { useSupplierMetricsSummary } from '@/hooks/useSupplierMetrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Mail, Phone, User, Edit, Trash2, Eye, MapPin, Truck, Package, TrendingUp, Tag, Loader2, Search, AlertCircle, Building2 } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// Validation schema
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

interface Supplier {
  id: number;
  name: string;
  supplier_type: 'registered' | 'customer';
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  notes: string | null;
  address: string | null;
  status: string;
  tags: string[] | null;
  created_at: string;
  product_count?: number;
  orders_this_month?: number;
  total_spend_this_year?: number;
}

interface SupplierCardProps {
  supplier: Supplier;
  onView: (id: number) => void;
}

function SupplierCard({ supplier, onView }: SupplierCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: supplier.name,
    contact_name: supplier.contact_name || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    status: supplier.status,
    tags: supplier.tags || [],
    notes: supplier.notes || '',
  });

  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: supplier.id, ...editForm }, {
      onSuccess: () => setIsEditOpen(false)
    });
  };

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              {supplier.supplier_type === 'customer' ? (
                <User className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="font-luxury text-lg">{supplier.name}</CardTitle>
              {supplier.supplier_type === 'customer' && (
                <Badge variant="customer">Customer</Badge>
              )}
              <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'} className="h-5">
                {supplier.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {supplier.contact_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {supplier.contact_name}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        <div className="space-y-3 flex-grow">
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <a href={`mailto:${supplier.email}`} className="hover:text-primary truncate">
                {supplier.email}
              </a>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <a href={`tel:${supplier.phone}`} className="hover:text-primary">
                {supplier.phone}
              </a>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{supplier.address}</span>
            </div>
          )}
          
          {supplier.tags && supplier.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {supplier.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {supplier.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{supplier.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              <span>{supplier.product_count || 0} products</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>£{(supplier.total_spend_this_year || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onView(supplier.id)}
              className="flex-1"
            >
              View Detail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-luxury">Edit Supplier</DialogTitle>
            <DialogDescription>Update supplier information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Company Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Contact Person</Label>
                  <Input
                    id="edit-contact"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <p className="text-xs text-muted-foreground">Active suppliers appear in search</p>
                  </div>
                  <Switch
                    id="edit-status"
                    checked={editForm.status === 'active'}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, status: checked ? 'active' : 'inactive' })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editForm.tags?.join(', ') || ''}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                })}
                placeholder="e.g. Luxury Watches, Diamonds, Gold"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Supplier'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{supplier.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(supplier.id, {
                  onSuccess: () => setIsDeleteOpen(false)
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddSupplierDialog({ open, onOpenChange }: AddSupplierDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    supplier_type: 'registered' as 'registered' | 'customer',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
    tags: [] as string[],
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateSupplier();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    createMutation.mutate({
      ...formData,
      email: formData.email || null,
      phone: formData.phone || null,
      contact_name: formData.contact_name || null,
      address: formData.address || null,
      notes: formData.notes || null,
      tags: formData.tags.length > 0 ? formData.tags : null
    }, {
      onSuccess: () => {
        setFormData({
          name: '',
          supplier_type: 'registered',
          contact_name: '',
          email: '',
          phone: '',
          address: '',
          status: 'active',
          tags: [],
          notes: '',
        });
        setErrors({});
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-luxury">Add New Supplier</DialogTitle>
          <DialogDescription>Enter supplier information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
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

              <div>
                <Label htmlFor="name">
                  {formData.supplier_type === 'customer' ? 'Full Name *' : 'Company Name *'}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={cn(errors.name && "border-destructive")}
                  required
                />
                {errors.name && (
                  <div className="flex items-center space-x-1 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="contact">Contact Person</Label>
                <Input
                  id="contact"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className={cn(errors.contact_name && "border-destructive")}
                />
                {errors.contact_name && (
                  <div className="flex items-center space-x-1 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.contact_name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <p className="text-xs text-muted-foreground">Start as active supplier</p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && (
                  <div className="flex items-center space-x-1 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={cn(errors.phone && "border-destructive")}
                />
                {errors.phone && (
                  <div className="flex items-center space-x-1 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.phone}</span>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={cn(errors.address && "border-destructive")}
                />
                {errors.address && (
                  <div className="flex items-center space-x-1 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
              })}
              placeholder="e.g. Luxury Watches, Diamonds, Gold"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={cn(errors.notes && "border-destructive")}
              rows={3}
            />
            {errors.notes && (
              <div className="flex items-center space-x-1 text-sm text-destructive mt-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.notes}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Supplier'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Suppliers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const { data: suppliers, isLoading } = useSuppliers();
  const { data: summary } = useSupplierMetricsSummary();

  const filteredAndSortedSuppliers = useMemo(() => {
    if (!suppliers) return [];
    
    let filtered = suppliers
      .filter(supplier => supplier.name !== 'Customer Trade-In') // Exclude internal trade-in supplier
      .filter(supplier => {
        const matchesSearch = 
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
        const matchesType = filterType === 'all' || supplier.supplier_type === filterType;
        
        return matchesSearch && matchesStatus && matchesType;
      });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'spend':
          return (b.total_spend_this_year || 0) - (a.total_spend_this_year || 0);
        case 'products':
          return (b.product_count || 0) - (a.product_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [suppliers, searchTerm, filterStatus, filterType, sortBy]);

  const handleViewSupplier = (id: number) => {
    navigate(`/suppliers/${id}`);
  };

  return (
    <AppLayout 
      title="Suppliers" 
      subtitle="Manage your supplier relationships and track spending"
    >
      <div className="space-y-6">
        {/* Search, Filters and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name, contact, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="spend">Highest Spend</SelectItem>
              <SelectItem value="products">Most Products</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Supplier Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Supplier Types</SelectItem>
              <SelectItem value="registered">Registered Suppliers</SelectItem>
              <SelectItem value="customer">Customer Suppliers</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsAddDialogOpen(true)} variant="premium" className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-luxury text-2xl font-bold text-foreground">
                {summary?.activeSuppliers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {suppliers?.filter(s => s.supplier_type === 'registered' && s.status === 'active').length || 0} Registered, {' '}
                {suppliers?.filter(s => s.supplier_type === 'customer' && s.status === 'active').length || 0} Customer
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-luxury text-2xl font-bold text-foreground">
                {summary?.ordersThisMonth || 0}
              </div>
              <p className="text-xs text-muted-foreground">Purchase orders placed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend This Year</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-luxury text-2xl font-bold text-foreground">
                £{(summary?.totalSpendThisYear || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Inventory + expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Suppliers Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading suppliers...</p>
          </div>
        ) : filteredAndSortedSuppliers.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Truck className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-luxury text-xl font-semibold">
                  {searchTerm || filterStatus !== 'all' ? 'No suppliers found' : 'Add your first supplier'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your filters or search term' 
                    : 'Suppliers help you manage inventory sourcing and consignment relationships'}
                </p>
              </div>
              {!searchTerm && filterStatus === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {filteredAndSortedSuppliers.length} supplier{filteredAndSortedSuppliers.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onView={handleViewSupplier}
                />
              ))}
            </div>
          </>
        )}

        <AddSupplierDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
