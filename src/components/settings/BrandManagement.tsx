import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, Plus, Trash2, Search } from 'lucide-react';
import { useBrands, useAddBrand, BRAND_TIERS } from '@/hooks/useBrands';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandManagementProps {
  userRole: string | null;
}

export function BrandManagement({ userRole }: BrandManagementProps) {
  const queryClient = useQueryClient();
  const { data: brands, isLoading } = useBrands();
  const addBrand = useAddBrand();

  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandTier, setNewBrandTier] = useState<string>('luxury');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = brands?.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group brands by tier
  const groupedBrands = filteredBrands.reduce((acc, brand) => {
    const tier = brand.tier || 'other';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(brand);
    return acc;
  }, {} as Record<string, typeof brands>);

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;
    
    try {
      await addBrand.mutateAsync({
        name: newBrandName.trim(),
        tier: newBrandTier || null,
      });
      setNewBrandName('');
      toast({ title: 'Brand added', description: `${newBrandName} has been added.` });
    } catch (error: any) {
      toast({
        title: 'Error adding brand',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBrand = async (brandId: number, brandName: string) => {
    if (!confirm(`Delete "${brandName}"? This will remove it from all products and wishlists.`)) return;

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId);

    if (error) {
      toast({
        title: 'Error deleting brand',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand deleted' });
    }
  };

  const tierOrder = ['luxury', 'premium', 'contemporary', 'high_street', 'other'];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Brand Management
        </CardTitle>
        <CardDescription>
          Manage the brands/designers available for products and customer wishlists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Brand */}
        <div className="space-y-3">
          <Label>Add New Brand</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Brand name..."
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
              className="flex-1"
              disabled={userRole !== 'owner'}
            />
            <Select value={newBrandTier} onValueChange={setNewBrandTier} disabled={userRole !== 'owner'}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddBrand} 
              disabled={!newBrandName.trim() || addBrand.isPending || userRole !== 'owner'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Brand List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{searchQuery ? 'No brands match your search' : 'No brands added yet'}</p>
            <p className="text-sm mt-1">Add brands above to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tierOrder.map((tier) => {
              const tierBrands = groupedBrands[tier];
              if (!tierBrands || tierBrands.length === 0) return null;
              
              const tierLabel = BRAND_TIERS.find(t => t.value === tier)?.label || 'Other';
              
              return (
                <div key={tier} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{tierLabel}</h4>
                    <Badge variant="outline" className="text-xs">{tierBrands.length}</Badge>
                  </div>
                  <div className="grid gap-1">
                    {tierBrands.map((brand) => (
                      <div
                        key={brand.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{brand.name}</span>
                        </div>
                        {userRole === 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteBrand(brand.id, brand.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground pt-4 border-t">
          Total: {brands?.length || 0} brands
        </p>
      </CardContent>
    </Card>
  );
}
