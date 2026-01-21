import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { generateEmbeddings } from "../_shared/openai.ts";
import {
  productToDocument,
  customerToDocument,
  saleToDocument,
  supplierToDocument,
  expenseToDocument,
} from "../_shared/document-loaders.ts";

const BATCH_SIZE = 50; // Process in batches to avoid memory issues

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

    // Verify auth - allow service role or owner user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No authorization header", 401);
    }

    // Check if it's a service role token (for admin/CLI calls)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return errorResponse("Unauthorized", 401);
      }

      // Check if user is owner
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.role !== "owner") {
        return errorResponse("Only owners can initialize RAG", 403);
      }
    }

    const results = {
      products: { processed: 0, errors: 0 },
      customers: { processed: 0, errors: 0 },
      sales: { processed: 0, errors: 0 },
      suppliers: { processed: 0, errors: 0 },
      expenses: { processed: 0, errors: 0 },
    };

    // Process Products
    console.log("Processing products...");
    const { data: products } = await supabase
      .from("products")
      .select(`
        *,
        supplier:suppliers!products_supplier_id_fkey(name),
        consignment_supplier:suppliers!products_consignment_supplier_id_fkey(name),
        location:locations(name)
      `);

    if (products && products.length > 0) {
      // Get stock quantities
      const { data: stockData } = await supabase
        .from("v_stock_on_hand")
        .select("product_id, qty_on_hand");

      const stockMap = new Map(stockData?.map(s => [s.product_id, s.qty_on_hand]) || []);

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const documents = batch.map(p => {
          const productWithStock = { ...p, stock_qty: stockMap.get(p.id) || 0 };
          return productToDocument(productWithStock);
        });

        try {
          const embeddings = await generateEmbeddings(documents.map(d => d.content));

          for (let j = 0; j < batch.length; j++) {
            await supabase.from("rag_documents").upsert({
              source_table: "products",
              source_id: batch[j].id.toString(),
              content: documents[j].content,
              embedding: embeddings[j],
              metadata: documents[j].metadata,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_table,source_id" });

            results.products.processed++;
          }
        } catch (err) {
          console.error("Error processing product batch:", err);
          results.products.errors += batch.length;
        }
      }
    }

    // Process Customers
    console.log("Processing customers...");
    const { data: customers } = await supabase
      .from("customers")
      .select("*");

    if (customers && customers.length > 0) {
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);
        const documents = batch.map(c => customerToDocument(c));

        try {
          const embeddings = await generateEmbeddings(documents.map(d => d.content));

          for (let j = 0; j < batch.length; j++) {
            await supabase.from("rag_documents").upsert({
              source_table: "customers",
              source_id: batch[j].id.toString(),
              content: documents[j].content,
              embedding: embeddings[j],
              metadata: documents[j].metadata,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_table,source_id" });

            results.customers.processed++;
          }
        } catch (err) {
          console.error("Error processing customer batch:", err);
          results.customers.errors += batch.length;
        }
      }
    }

    // Process Sales (last 90 days for relevance)
    console.log("Processing sales...");
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: sales } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items(
          quantity,
          unit_price,
          product:products(name, sku)
        )
      `)
      .gte("sold_at", ninetyDaysAgo.toISOString())
      .eq("is_voided", false);

    if (sales && sales.length > 0) {
      for (let i = 0; i < sales.length; i += BATCH_SIZE) {
        const batch = sales.slice(i, i + BATCH_SIZE);
        const documents = batch.map(s => saleToDocument(s));

        try {
          const embeddings = await generateEmbeddings(documents.map(d => d.content));

          for (let j = 0; j < batch.length; j++) {
            await supabase.from("rag_documents").upsert({
              source_table: "sales",
              source_id: batch[j].id.toString(),
              content: documents[j].content,
              embedding: embeddings[j],
              metadata: documents[j].metadata,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_table,source_id" });

            results.sales.processed++;
          }
        } catch (err) {
          console.error("Error processing sale batch:", err);
          results.sales.errors += batch.length;
        }
      }
    }

    // Process Suppliers
    console.log("Processing suppliers...");
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*");

    if (suppliers && suppliers.length > 0) {
      for (let i = 0; i < suppliers.length; i += BATCH_SIZE) {
        const batch = suppliers.slice(i, i + BATCH_SIZE);
        const documents = batch.map(s => supplierToDocument(s));

        try {
          const embeddings = await generateEmbeddings(documents.map(d => d.content));

          for (let j = 0; j < batch.length; j++) {
            await supabase.from("rag_documents").upsert({
              source_table: "suppliers",
              source_id: batch[j].id.toString(),
              content: documents[j].content,
              embedding: embeddings[j],
              metadata: documents[j].metadata,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_table,source_id" });

            results.suppliers.processed++;
          }
        } catch (err) {
          console.error("Error processing supplier batch:", err);
          results.suppliers.errors += batch.length;
        }
      }
    }

    // Process Expenses (last 90 days)
    console.log("Processing expenses...");
    const { data: expenses } = await supabase
      .from("expenses")
      .select(`
        *,
        supplier:suppliers(name),
        staff:profiles(full_name)
      `)
      .gte("incurred_at", ninetyDaysAgo.toISOString());

    if (expenses && expenses.length > 0) {
      for (let i = 0; i < expenses.length; i += BATCH_SIZE) {
        const batch = expenses.slice(i, i + BATCH_SIZE);
        const documents = batch.map(e => expenseToDocument(e));

        try {
          const embeddings = await generateEmbeddings(documents.map(d => d.content));

          for (let j = 0; j < batch.length; j++) {
            await supabase.from("rag_documents").upsert({
              source_table: "expenses",
              source_id: batch[j].id.toString(),
              content: documents[j].content,
              embedding: embeddings[j],
              metadata: documents[j].metadata,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_table,source_id" });

            results.expenses.processed++;
          }
        } catch (err) {
          console.error("Error processing expense batch:", err);
          results.expenses.errors += batch.length;
        }
      }
    }

    // Clear the sync queue since we've done a full init
    await supabase.from("rag_sync_queue").delete().lt("created_at", new Date().toISOString());

    return jsonResponse({
      success: true,
      message: "RAG initialization complete",
      results,
    });

  } catch (error) {
    console.error("RAG init error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
});
