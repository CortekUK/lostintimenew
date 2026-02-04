import { supabase } from '@/integrations/supabase/client';

export interface ProductSuggestions {
  category: string | null;
  material: string | null;
  size: string | null;
  color: string | null;
}

export async function getProductSuggestions(
  productName: string
): Promise<ProductSuggestions> {
  const { data, error } = await supabase.functions.invoke('product-ai-suggestions', {
    body: { productName }
  });

  if (error) {
    throw new Error(error.message || 'Failed to get AI suggestions');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as ProductSuggestions;
}
