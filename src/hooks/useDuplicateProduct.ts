import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DuplicateProductOptions {
  sourceProductId: number;
  newData: {
    name: string;
    unit_price: number;
    unit_cost: number;
    supplier_id?: number;
    quantity: number;
    barcode?: string;
    purchase_date?: string;
    auto_generate_sku: boolean;
    internal_sku?: string;
  };
  copyOptions: {
    images: boolean;
    description: boolean;
    documents: boolean;
    registration_docs: boolean;
    consignment: boolean;
  };
  afterAction?: 'stay' | 'open';
}

export const useDuplicateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: DuplicateProductOptions) => {
      // Fetch source product with all details
      const { data: sourceProduct, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers!supplier_id(name),
          consignment_supplier:suppliers!consignment_supplier_id(name)
        `)
        .eq('id', options.sourceProductId)
        .single();

      if (fetchError) throw fetchError;
      if (!sourceProduct) throw new Error('Source product not found');

      // Check if manual SKU already exists
      if (!options.newData.auto_generate_sku && options.newData.internal_sku) {
        const { data: existingSku } = await supabase
          .from('products')
          .select('id')
          .eq('internal_sku', options.newData.internal_sku)
          .maybeSingle();
        
        if (existingSku) {
          throw new Error('SKU already exists');
        }
      }

      // Check if barcode/serial already exists
      if (options.newData.barcode) {
        const { data: existingSerial } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', options.newData.barcode)
          .maybeSingle();
        
        if (existingSerial) {
          throw new Error('Serial number already exists in your inventory');
        }
      }

      // Prepare new product data
      const newProductData: any = {
        name: options.newData.name,
        unit_price: options.newData.unit_price,
        unit_cost: options.newData.unit_cost,
        supplier_id: options.newData.supplier_id || sourceProduct.supplier_id,
        barcode: options.newData.barcode || null,
        purchase_date: options.newData.purchase_date || new Date().toISOString().split('T')[0],
        
        // Copy specification fields
        category: sourceProduct.category,
        material: sourceProduct.material,
        size: sourceProduct.size,
        color: sourceProduct.color,
        
        // Copy optional fields based on options
        description: options.copyOptions.description ? sourceProduct.description : null,
        
        // Copy images if selected
        image_url: options.copyOptions.images ? sourceProduct.image_url : null,
        
        // Copy location
        location_id: sourceProduct.location_id,

        // Default tracking settings
        track_stock: sourceProduct.track_stock,
        reorder_threshold: sourceProduct.reorder_threshold,
        tax_rate: sourceProduct.tax_rate,
        
        // Registration - only if explicitly enabled
        is_registered: options.copyOptions.registration_docs ? sourceProduct.is_registered : false,
        registration_doc: options.copyOptions.registration_docs ? sourceProduct.registration_doc : null,
        
        // Consignment - reset dates and clear if enabled
        is_consignment: options.copyOptions.consignment ? sourceProduct.is_consignment : false,
        consignment_supplier_id: options.copyOptions.consignment ? sourceProduct.consignment_supplier_id : null,
        consignment_terms: options.copyOptions.consignment ? sourceProduct.consignment_terms : null,
        consignment_start_date: null, // Always reset dates
        consignment_end_date: null,
        
        is_trade_in: false,
      };

      // Handle SKU generation
      if (!options.newData.auto_generate_sku && options.newData.internal_sku) {
        newProductData.internal_sku = options.newData.internal_sku;
      }
      // If auto_generate_sku is true, don't set internal_sku - let DB trigger handle it

      // Insert new product
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert(newProductData)
        .select(`
          *,
          supplier:suppliers!supplier_id(name),
          consignment_supplier:suppliers!consignment_supplier_id(name)
        `)
        .single();

      if (insertError) throw insertError;

      // Create initial stock movement if quantity > 0
      if (options.newData.quantity > 0) {
        const { error: stockError } = await supabase
          .from('stock_movements')
          .insert({
            product_id: newProduct.id,
            movement_type: 'purchase',
            quantity: options.newData.quantity,
            unit_cost: options.newData.unit_cost,
            supplier_id: options.newData.supplier_id || sourceProduct.supplier_id,
            note: `Initial stock from product duplication (source: ${sourceProduct.internal_sku})`
          });

        if (stockError) throw stockError;
      }

      // Copy documents if selected
      if (options.copyOptions.documents) {
        const { data: sourceDocs } = await supabase
          .from('product_documents')
          .select('*')
          .eq('product_id', options.sourceProductId);

        if (sourceDocs && sourceDocs.length > 0) {
          const newDocs = sourceDocs
            .filter(doc => {
              // Only copy registration docs if explicitly enabled
              if (doc.doc_type === 'registration' && !options.copyOptions.registration_docs) {
                return false;
              }
              return true;
            })
            .map(doc => ({
              product_id: newProduct.id,
              doc_type: doc.doc_type,
              path: doc.path,
              title: doc.title,
              note: doc.note ? `${doc.note} (copied from ${sourceProduct.internal_sku})` : `Copied from ${sourceProduct.internal_sku}`,
              file_ext: doc.file_ext,
              file_size: doc.file_size,
              expires_at: doc.expires_at
            }));

          if (newDocs.length > 0) {
            await supabase.from('product_documents').insert(newDocs);
          }
        }
      }

      // Audit log entry
      await supabase
        .from('audit_log')
        .insert({
          table_name: 'products',
          row_pk: newProduct.id.toString(),
          action: 'duplicate',
          old_data: { source_product_id: options.sourceProductId, source_sku: sourceProduct.internal_sku },
          new_data: newProduct
        });

      return newProduct;
    },
    onSuccess: (newProduct) => {
      // Invalidate all product-related queries
      queryClient.invalidateQueries({ queryKey: ['products-base'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-data'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-values'] });
      queryClient.invalidateQueries({ queryKey: ['stock-status'] });
      
      toast({
        title: "Product duplicated",
        description: `Product duplicated successfully — ${newProduct.internal_sku}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to duplicate",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
