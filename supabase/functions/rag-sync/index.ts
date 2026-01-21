import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { generateEmbedding } from "../_shared/openai.ts";
import {
  productToDocument,
  customerToDocument,
  saleToDocument,
  supplierToDocument,
  expenseToDocument,
} from "../_shared/document-loaders.ts";

const MAX_ITEMS_PER_RUN = 100;

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify auth (optional - could also be called via cron)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return errorResponse("Unauthorized", 401);
      }
    }

    // Get unprocessed queue items
    const { data: queueItems, error: queueError } = await supabase
      .from("rag_sync_queue")
      .select("*")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(MAX_ITEMS_PER_RUN);

    if (queueError) {
      throw new Error(`Failed to fetch queue: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return jsonResponse({
        success: true,
        message: "No items to process",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      deleted: 0,
      errors: 0,
    };

    for (const item of queueItems) {
      try {
        if (item.action === "DELETE") {
          // Remove from rag_documents
          await supabase
            .from("rag_documents")
            .delete()
            .eq("source_table", item.source_table)
            .eq("source_id", item.source_id);

          results.deleted++;
        } else {
          // Fetch the record and generate embedding
          const documentData = await fetchAndConvertDocument(supabase, item.source_table, item.source_id);

          if (documentData) {
            const embedding = await generateEmbedding(documentData.content);

            await supabase.from("rag_documents").upsert({
              source_table: item.source_table,
              source_id: item.source_id,
              content: documentData.content,
              embedding,
              metadata: documentData.metadata,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_table,source_id" });

            results.processed++;
          }
        }

        // Mark as processed
        await supabase
          .from("rag_sync_queue")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", item.id);

      } catch (err) {
        console.error(`Error processing queue item ${item.id}:`, err);
        results.errors++;

        // Update queue item with error
        await supabase
          .from("rag_sync_queue")
          .update({
            processed_at: new Date().toISOString(),
            error_message: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", item.id);
      }
    }

    // Clean up old processed items (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabase
      .from("rag_sync_queue")
      .delete()
      .not("processed_at", "is", null)
      .lt("processed_at", sevenDaysAgo.toISOString());

    return jsonResponse({
      success: true,
      message: `Processed ${results.processed + results.deleted} items`,
      results,
    });

  } catch (error) {
    console.error("RAG sync error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function fetchAndConvertDocument(
  supabase: any,
  sourceTable: string,
  sourceId: string
): Promise<{ content: string; metadata: Record<string, unknown> } | null> {
  switch (sourceTable) {
    case "products": {
      const { data: product } = await supabase
        .from("products")
        .select(`
          *,
          supplier:suppliers!products_supplier_id_fkey(name),
          consignment_supplier:suppliers!products_consignment_supplier_id_fkey(name),
          location:locations(name)
        `)
        .eq("id", sourceId)
        .single();

      if (!product) return null;

      // Get stock
      const { data: stock } = await supabase
        .from("v_stock_on_hand")
        .select("qty_on_hand")
        .eq("product_id", sourceId)
        .single();

      const stockData = stock as { qty_on_hand: number } | null;
      const productWithStock = { ...product, stock_qty: stockData?.qty_on_hand || 0 };
      return productToDocument(productWithStock as Parameters<typeof productToDocument>[0]);
    }

    case "customers": {
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (!customer) return null;
      return customerToDocument(customer);
    }

    case "sales": {
      const { data: sale } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items(
            quantity,
            unit_price,
            product:products(name, sku)
          )
        `)
        .eq("id", sourceId)
        .single();

      if (!sale) return null;
      return saleToDocument(sale);
    }

    case "suppliers": {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (!supplier) return null;
      return supplierToDocument(supplier);
    }

    case "expenses": {
      const { data: expense } = await supabase
        .from("expenses")
        .select(`
          *,
          supplier:suppliers(name),
          staff:profiles(full_name)
        `)
        .eq("id", sourceId)
        .single();

      if (!expense) return null;
      return expenseToDocument(expense);
    }

    default:
      console.warn(`Unknown source table: ${sourceTable}`);
      return null;
  }
}
