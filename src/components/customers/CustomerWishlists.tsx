import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Star, Trash2, Bell, Check, ChevronsUpDown } from 'lucide-react';
import { useCustomerWishlists, useAddCustomerWishlist, useUpdateCustomerWishlist, useDeleteCustomerWishlist } from '@/hooks/useCustomerWishlists';
import { useBrands, useAddBrand, BRAND_TIERS } from '@/hooks/useBrands';
import { useAllProductCategories } from '@/hooks/useProductCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface CustomerWishlistsProps {
  customerId: number;
  customerName: string;
}

export function CustomerWishlists({ customerId, customerName }: CustomerWishlistsProps) {
  const { data: wishlists, isLoading } = useCustomerWishlists(customerId);
  const { data: brands } = useBrands();
  const { all: categories } = useAllProductCategories();
  const addWishlist = useAddCustomerWishlist();
  const updateWishlist = useUpdateCustomerWishlist();
  const deleteWishlist = useDeleteCustomerWishlist();
  const addBrand = useAddBrand();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [brandSearchOpen, setBrandSearchOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [formData, setFormData] = useState({
    brand_id: '',
    category: 'any',
    size: '',
    notes: '',
    notify_by: 'email' as 'email' | 'sms' | 'both',
  });

  // Filter brands based on search
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    if (!brandSearch) return brands;
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

  // Group brands by tier for display
  const groupedBrands = useMemo(() => {
    const groups: Record<string, typeof brands> = {
      luxury: [],
      premium: [],
      contemporary: [],
      high_street: [],
      other: [],
    };
    filteredBrands.forEach(brand => {
      const tier = brand.tier || 'other';
      if (groups[tier]) {
        groups[tier]!.push(brand);
      }
    });
    return groups;
  }, [filteredBrands]);

  const selectedBrand = brands?.find(b => b.id.toString() === formData.brand_id);

  // Check if search matches any existing brand exactly
  const exactMatchExists = brands?.some(
    b => b.name.toLowerCase() === brandSearch.toLowerCase()
  );

  const handleAdd = async () => {
    await addWishlist.mutateAsync({
      customer_id: customerId,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
      category: formData.category && formData.category !== 'any' ? formData.category : null,
      size: formData.size || null,
      notes: formData.notes || null,
      notify_by: formData.notify_by,
    });
    setIsAddDialogOpen(false);
    setFormData({ brand_id: '', category: 'any', size: '', notes: '', notify_by: 'email' });
  };

  const handleAddBrandInline = async () => {
    if (!brandSearch.trim() || exactMatchExists) return;
    
    setIsAddingBrand(true);
    try {
      const newBrand = await addBrand.mutateAsync({
        name: brandSearch.trim(),
        tier: 'luxury', // Default to luxury for quick add
      });
      // Select the newly added brand
      if (newBrand?.id) {
        setFormData({ ...formData, brand_id: newBrand.id.toString() });
      }
      setBrandSearch('');
      setBrandSearchOpen(false);
      // Toast is handled by the hook
    } catch {
      // Error toast is handled by the hook
    } finally {
      setIsAddingBrand(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await updateWishlist.mutateAsync({ id, is_active: !isActive });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Remove this wishlist item?')) {
      await deleteWishlist.mutateAsync({ id, customerId });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wishlists</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Wishlists
          </CardTitle>
          <CardDescription>
            Track desired items and preferences
          </CardDescription>
        </div>
        
        {/* Add Wishlist Button */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Wishlist Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Wishlist Item</DialogTitle>
              <DialogDescription>
                Track what {customerName} is looking for. You'll see alerts when adding matching items to inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Searchable Brand Selector with Inline Add */}
              <div className="space-y-2">
                <Label>Brand / Designer</Label>
                <Popover open={brandSearchOpen} onOpenChange={setBrandSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={brandSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedBrand ? (
                        <span className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" />
                          {selectedBrand.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search or select a brand...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search brands..." 
                        value={brandSearch}
                        onValueChange={setBrandSearch}
                      />
                      <CommandList>
                        {/* Show add option when search doesn't match exactly */}
                        {brandSearch.trim() && !exactMatchExists && (
                          <CommandGroup>
                            <CommandItem
                              value={`add-${brandSearch}`}
                              onSelect={handleAddBrandInline}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{brandSearch}" as new brand
                              {isAddingBrand && <span className="ml-2 text-muted-foreground">...</span>}
                            </CommandItem>
                          </CommandGroup>
                        )}

                        {filteredBrands.length === 0 && !brandSearch.trim() && (
                          <CommandEmpty>
                            <div className="p-2 text-center">
                              <p className="text-sm text-muted-foreground">No brands available</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Add brands in Settings → Customise
                              </p>
                            </div>
                          </CommandEmpty>
                        )}
                        
                        {/* Any Brand option */}
                        <CommandGroup>
                          <CommandItem
                            value="any-brand"
                            onSelect={() => {
                              setFormData({ ...formData, brand_id: '' });
                              setBrandSearchOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !formData.brand_id ? "opacity-100" : "opacity-0")} />
                            Any brand
                          </CommandItem>
                        </CommandGroup>
                        
                        {filteredBrands.length > 0 && <CommandSeparator />}

                        {/* Grouped brands */}
                        {Object.entries(groupedBrands).map(([tier, tierBrands]) => {
                          if (!tierBrands || tierBrands.length === 0) return null;
                          const tierLabel = BRAND_TIERS.find(t => t.value === tier)?.label || 'Other';
                          return (
                            <CommandGroup key={tier} heading={tierLabel}>
                              {tierBrands.map((brand) => (
                                <CommandItem
                                  key={brand.id}
                                  value={brand.name}
                                  onSelect={() => {
                                    setFormData({ ...formData, brand_id: brand.id.toString() });
                                    setBrandSearchOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", formData.brand_id === brand.id.toString() ? "opacity-100" : "opacity-0")} />
                                  <Star className="mr-2 h-4 w-4 text-amber-500" />
                                  {brand.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Type to search or add a new brand. Manage brands in Settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any category</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Size</Label>
                <Input
                  placeholder="e.g., M, 10, One Size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any specific details (e.g., 'Black color preferred', 'Budget under £500')"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addWishlist.isPending}>
                {addWishlist.isPending ? 'Adding...' : 'Add to Wishlist'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {wishlists && wishlists.length > 0 ? (
          <div className="space-y-3">
            {wishlists.map((wishlist) => (
              <div
                key={wishlist.id}
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  !wishlist.is_active && "opacity-50 bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {wishlist.brand?.name ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          {wishlist.brand.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Any Brand</Badge>
                      )}
                      {wishlist.category && (
                        <Badge variant="secondary">{wishlist.category}</Badge>
                      )}
                      {wishlist.size && (
                        <Badge variant="outline">Size: {wishlist.size}</Badge>
                      )}
                    </div>
                    {wishlist.notes && (
                      <p className="text-sm text-muted-foreground">{wishlist.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Added {new Date(wishlist.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${wishlist.id}`} className="text-xs">Active</Label>
                      <Switch
                        id={`active-${wishlist.id}`}
                        checked={wishlist.is_active}
                        onCheckedChange={() => handleToggleActive(wishlist.id, wishlist.is_active)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(wishlist.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No wishlist items yet</p>
            <p className="text-sm mt-1">Track items {customerName} is looking for - you'll be alerted when matching products are added</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
