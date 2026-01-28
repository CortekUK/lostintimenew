import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddProductForm } from '@/components/forms/AddProductForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PartExchange {
  id: number;
  sale_id: number;
  title: string;
  category: string | null;
  description: string | null;
  serial: string | null;
  allowance: number;
  customer_name: string | null;
  customer_contact: string | null;
  customer_supplier_id: number | null;
  notes: string | null;
  created_at: string;
  status: string;
}

interface ConvertPartExchangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partExchange: PartExchange | null;
}

export function ConvertPartExchangeDialog({ open, onOpenChange, partExchange }: ConvertPartExchangeDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const convertMutation = useMutation({
    mutationFn: async ({ formData, documents, images }: any) => {
      if (!partExchange) throw new Error('No part exchange selected');

      // Create product with formData from AddProductForm
      const productData: any = {
        name: formData.name,
        description: formData.description || null,
        barcode: formData.barcode || null,
        category: formData.category || 'Trade-In',
        metal: formData.metal || null,
        karat: formData.karat || null,
        gemstone: formData.gemstone || null,
        supplier_id: formData.supplier_type === 'registered' && formData.supplier_id 
          ? parseInt(formData.supplier_id) 
          : null,
        unit_cost: parseFloat(formData.unit_cost) || partExchange.allowance,
        unit_price: parseFloat(formData.unit_price) || partExchange.allowance,
        tax_rate: 0,
        track_stock: true,
        reorder_threshold: parseInt(formData.reorder_threshold) || 0,
        is_trade_in: true,
        is_registered: formData.is_registered || false,
        registration_doc: null,
        is_consignment: formData.is_consignment || false,
        consignment_supplier_id: formData.is_consignment ? formData.consignment_supplier_id : null,
        consignment_terms: formData.is_consignment ? formData.consignment_terms : null,
        consignment_start_date: formData.is_consignment ? formData.consignment_start_date : null,
        consignment_end_date: formData.is_consignment ? formData.consignment_end_date : null,
        purchase_date: formData.purchase_date || null,
        location_id: formData.location_id ? parseInt(formData.location_id) : null,
      };

      // Debug logging to see exactly what's being sent
      console.log('🔍 Converting Part Exchange - Form Data:', formData);
      console.log('🔍 Converting Part Exchange - Product Data:', productData);

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (productError) throw productError;

      // Create stock movement
      const quantity = parseInt(formData.quantity) || 1;
      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: product.id,
          movement_type: 'purchase',
          quantity,
          unit_cost: parseFloat(formData.unit_cost) || partExchange.allowance,
          supplier_id: productData.supplier_id,
          note: `Part Exchange from Sale #${partExchange.sale_id}${partExchange.notes ? ` - ${partExchange.notes}` : ''}`,
        }]);

      if (stockError) throw stockError;

      // Handle images
      if (images.length > 0) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            image_url: images[0],
            images: images
          })
          .eq('id', product.id);

        if (updateError) throw updateError;
      }

      // Handle documents
      for (const doc of documents) {
        const fileName = `${product.id}/${Date.now()}-${doc.file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-docs')
          .upload(fileName, doc.file);

        if (uploadError) throw uploadError;

        const { error: docError } = await supabase
          .from('product_documents')
          .insert({
            product_id: product.id,
            doc_type: doc.doc_type,
            title: doc.title,
            note: doc.note,
            path: fileName,
            file_ext: doc.file.name.split('.').pop() || null,
            file_size: doc.file.size,
            expires_at: doc.expires_at || null,
          });

        if (docError) throw docError;
      }

      // Update part exchange record
      const { error: updateError } = await supabase
        .from('part_exchanges')
        .update({
          status: 'linked',
          product_id: product.id,
        })
        .eq('id', partExchange.id);

      if (updateError) throw updateError;

      return { product, partExchange };
    },
    onSuccess: ({ product }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      
      toast({
        title: "Trade-in converted to inventory",
        description: `Product "${product.name}" (${product.internal_sku}) has been created successfully.`,
      });
      
      onOpenChange(false);
      
      // Navigate to products page where new product will be visible at the top
      setTimeout(() => {
        navigate('/products');
      }, 500);
    },
    onError: (error: any) => {
      // Debug logging to see the full error
      console.error('❌ Part Exchange Conversion Error:', error);
      console.error('❌ Error Details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        statusCode: error?.statusCode,
      });

      let errorMessage = "Failed to convert trade-in to inventory";
      
      // Parse specific Postgres error codes
      if (error?.code === '23502') {
        // NOT NULL violation
        const field = error.message?.match(/column "(\w+)"/)?.[1];
        errorMessage = field 
          ? `Database error: Required field "${field.replace(/_/g, ' ')}" is missing or null`
          : "Database error: A required field is missing";
      } else if (error?.code === '23505') {
        // Unique constraint violation
        const constraint = error.message?.match(/constraint "(\w+)"/)?.[1];
        errorMessage = constraint
          ? `Database error: Duplicate value for ${constraint.replace(/_/g, ' ')}`
          : "A product with this barcode or serial number already exists";
      } else if (error?.code === '23503') {
        // Foreign key violation
        errorMessage = "Database error: Invalid supplier or consignment supplier selected";
      } else if (error?.code === '42501') {
        // Insufficient privilege
        errorMessage = "Permission denied. Please ensure you have the correct access rights.";
      } else if (error instanceof Error) {
        // Fallback parsing for error messages
        if (error.message.includes("violates row-level security")) {
          errorMessage = "Permission denied. Please ensure you have the correct access rights.";
        } else if (error.message.includes("not-null")) {
          const field = error.message.match(/column "(\w+)"/)?.[1];
          errorMessage = field 
            ? `Missing required field: ${field.replace(/_/g, ' ')}`
            : "A required field is missing";
        } else if (error.message.includes("unique")) {
          errorMessage = "A product with this barcode or serial number already exists";
        } else if (error.message.includes("foreign key")) {
          errorMessage = "Invalid supplier or consignment supplier selected";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = `Error: ${error}`;
      }

      toast({
        title: "Conversion failed",
        description: errorMessage,
        duration: 6000,
      });
    },
  });

  const handleSubmit = async (formData: any, documents: any[], images: string[]) => {
    // Client-side validation
    const errors: string[] = [];

    if (!formData.name?.trim()) {
      errors.push("Product name is required");
    }

    if (!formData.unit_cost || isNaN(parseFloat(formData.unit_cost)) || parseFloat(formData.unit_cost) <= 0) {
      errors.push("Cost price must be a valid number greater than £0");
    }

    if (!formData.unit_price || isNaN(parseFloat(formData.unit_price)) || parseFloat(formData.unit_price) <= 0) {
      errors.push("Sell price must be a valid number greater than £0");
    }

    if (formData.unit_price && formData.unit_cost && parseFloat(formData.unit_price) < parseFloat(formData.unit_cost)) {
      errors.push(`Sell price (£${parseFloat(formData.unit_price).toFixed(2)}) cannot be less than cost price (£${parseFloat(formData.unit_cost).toFixed(2)})`);
    }

    if (!formData.purchase_date) {
      errors.push("Purchase date is required");
    }

    // Validate numeric fields
    if (formData.reorder_threshold && (isNaN(parseInt(formData.reorder_threshold)) || parseInt(formData.reorder_threshold) < 0)) {
      errors.push("Reorder threshold must be a valid number");
    }

    // Validate consignment fields if consignment is enabled
    if (formData.is_consignment && !formData.consignment_supplier_id) {
      errors.push("Consignment supplier is required when consignment is enabled");
    }

    if (errors.length > 0) {
      toast({
        title: "Cannot convert trade-in",
        description: (
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        ),
        duration: 6000,
      });
      return;
    }

    setIsLoading(true);
    try {
      await convertMutation.mutateAsync({ formData, documents, images });
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill form data based on part exchange
  const getInitialFormData = () => {
    if (!partExchange) return {};
    
    return {
      name: partExchange.title || '',
      barcode: partExchange.serial || '',
      description: partExchange.description || `Part Exchange from Sale #${partExchange.sale_id}${partExchange.notes ? `\n\nNotes: ${partExchange.notes}` : ''}`,
      category: partExchange.category || '',
      metal: '',
      karat: '',
      gemstone: '',
      supplier_type: partExchange.customer_supplier_id ? 'registered' as const : 'individual' as const,
      supplier_id: partExchange.customer_supplier_id?.toString() || '',
      individual_name: partExchange.customer_name || '',
      unit_cost: partExchange.allowance.toString(),
      unit_price: (partExchange.allowance * 1.5).toFixed(2), // Suggested 50% markup
      reorder_threshold: '0',
      quantity: '1',
      is_registered: false,
      is_consignment: false,
      consignment_supplier_id: null,
      consignment_terms: '',
      consignment_start_date: '',
      consignment_end_date: '',
      purchased_today: true,
      purchase_date: new Date().toISOString().split('T')[0]
    };
  };

  if (!partExchange) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-luxury text-2xl">Convert Trade-In to Product</DialogTitle>
          <DialogDescription>
            Review and enhance the details before adding "{partExchange.title}" to your inventory.
            Suggested sell price is pre-filled with a 50% markup.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <AddProductForm 
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            initialData={getInitialFormData()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
