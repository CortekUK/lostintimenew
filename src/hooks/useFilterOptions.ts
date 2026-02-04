import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PREDEFINED_PRODUCT_CATEGORIES } from '@/hooks/useProductCategories';

export interface Brand {
  id: number;
  name: string;
  tier: string | null;
}

export interface FilterOptions {
  categories: string[];
  materials: string[];
  sizes: string[];
  colors: string[];
  brands: Brand[];
  priceRange: { min: number; max: number };
}

export const useFilterOptions = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['filter-options'],
    queryFn: async (): Promise<FilterOptions> => {
      // Get distinct values for each filter field and custom categories from settings
      const [productsResult, settingsResult, brandsResult] = await Promise.all([
        supabase
          .from('products')
          .select('category, material, size, color, unit_price')
          .not('unit_price', 'is', null),
        supabase
          .from('app_settings')
          .select('values')
          .single(),
        supabase
          .from('brands')
          .select('id, name, tier')
          .order('tier')
          .order('name')
      ]);

      if (productsResult.error) throw productsResult.error;
      const products = productsResult.data;
      const brands = brandsResult.data || [];
      
      // Get custom categories from settings
      const customCategories = (settingsResult.data?.values as any)?.product_categories || [];

      // Extract unique values and filter out nulls/empty strings
      const categoriesFromProducts = [...new Set(products.map(p => p.category).filter(Boolean))];
      const materials = [...new Set(products.map(p => p.material).filter(Boolean))].sort();
      const sizes = [...new Set(products.map(p => p.size).filter(Boolean))].sort();
      const colors = [...new Set(products.map(p => p.color).filter(Boolean))].sort();
      
      // Combine predefined + custom + from products
      const allCategories = [...new Set([
        ...PREDEFINED_PRODUCT_CATEGORIES,
        ...customCategories,
        ...categoriesFromProducts
      ])].sort();

      const allMaterials = [...new Set([
        ...materials,
        'Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather', 'Nylon'
      ])].sort();

      const allSizes = [...new Set([
        ...sizes,
        'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'
      ])].sort();

      const allColors = [...new Set([
        ...colors,
        'Black', 'White', 'Navy', 'Grey', 'Red', 'Blue', 'Green', 'Brown', 'Beige', 'None'
      ])].sort();

      // Calculate price range
      const prices = products.map(p => Number(p.unit_price)).filter(p => p > 0);
      const minPrice = Math.floor(Math.min(...prices) / 100) * 100; // Round down to nearest 100
      const maxPrice = Math.ceil(Math.max(...prices) / 100) * 100;  // Round up to nearest 100

      return {
        categories: allCategories,
        materials: allMaterials,
        sizes: allSizes,
        colors: allColors,
        brands: brands as Brand[],
        priceRange: { 
          min: minPrice || 0, 
          max: maxPrice || 5000 
        }
      };
    },
    enabled: !!user && !!session,
  });
};
