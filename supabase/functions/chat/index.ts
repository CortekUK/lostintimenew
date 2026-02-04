import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { generateEmbedding, chatCompletion, ChatMessage } from "../_shared/openai.ts";

function getSystemPrompt(userName: string): string {
  const greeting = userName ? `The user's name is ${userName}. Use their name occasionally to be friendly and personal.` : '';

  return `You are a friendly and helpful AI assistant for a clothing business management system called "Sourced Clothing". You help staff and owners with questions about their inventory, customers, sales, suppliers, and expenses.

${greeting}

Your personality:
- Be warm, friendly, and conversational (but not overly casual)
- Use the user's name naturally in responses when appropriate
- Add encouraging remarks when sharing good news (e.g., "Great news!" or "That's impressive!")
- Be empathetic when discussing challenges
- Use occasional light touches like "Let me check that for you" or "Here's what I found"

When answering questions:
1. Be helpful and provide clear, actionable information
2. Use specific numbers and details from the provided context
3. Format currency as £X.XX
4. If you're unsure, be honest and offer to help with what you can
5. Keep responses concise but complete

IMPORTANT - Chart Generation:
When the user asks about data that would benefit from visualization (sales trends, expense breakdowns, category distributions, comparisons), you MUST include a JSON chart block in your response.

Format chart data like this (on a new line after your text response):
---CHART_DATA---
{"type":"bar","title":"Chart Title","data":[{"name":"Label1","value":100},{"name":"Label2","value":200}]}
---END_CHART---

Chart types available: "bar", "pie", "line"
- Use "bar" for comparisons (sales by day, expenses by category)
- Use "pie" for proportions/percentages (category breakdowns)
- Use "line" for trends over time

Always include chart data when discussing:
- Sales breakdowns or trends
- Expense categories
- Inventory by category
- Customer tiers
- Any numeric comparisons

You can help with:
- Inventory questions (stock levels, product details, consignments)
- Customer information (preferences, purchase history, VIP status)
- Sales data (recent transactions, totals, trends)
- Supplier information (contact details, products supplied)
- Expense tracking (categories, amounts)`;
}

interface ChartData {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: Array<{ name: string; value: number }>;
}

function parseChartFromResponse(response: string): { text: string; chart?: ChartData } {
  const chartMatch = response.match(/---CHART_DATA---\s*([\s\S]*?)\s*---END_CHART---/);

  if (chartMatch) {
    try {
      const chartJson = chartMatch[1].trim();
      const chart = JSON.parse(chartJson) as ChartData;
      const text = response.replace(/---CHART_DATA---[\s\S]*?---END_CHART---/, '').trim();
      return { text, chart };
    } catch (e) {
      console.error("Failed to parse chart data:", e);
      return { text: response.replace(/---CHART_DATA---[\s\S]*?---END_CHART---/, '').trim() };
    }
  }

  return { text: response };
}

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

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No authorization header", 401);
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Parse request body
    const body = await req.json();
    const { message, conversationId, userName } = body;

    if (!message || typeof message !== "string") {
      return errorResponse("Message is required", 400);
    }

    // Generate embedding for the user query
    const queryEmbedding = await generateEmbedding(message);

    // Search for relevant documents
    const { data: matches, error: matchError } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 10,
      filter_tables: null, // Search all tables
    });

    if (matchError) {
      console.error("Match error:", matchError);
    }

    // Build context from matched documents
    let context = "";
    const sources: Array<{ table: string; id: string; similarity: number }> = [];

    if (matches && matches.length > 0) {
      context = "Here is relevant information from the database:\n\n";
      matches.forEach((match: { source_table: string; source_id: string; content: string; similarity: number }, i: number) => {
        context += `[${i + 1}] ${match.content}\n\n`;
        sources.push({
          table: match.source_table,
          id: match.source_id,
          similarity: match.similarity,
        });
      });
    }

    // Also fetch some aggregate data for common questions
    const aggregateContext = await fetchAggregateData(supabase);
    if (aggregateContext) {
      context += "\nCurrent business metrics:\n" + aggregateContext;
    }

    // Build messages for chat completion
    const messages: ChatMessage[] = [
      { role: "system", content: getSystemPrompt(userName || "") },
    ];

    // Add context if we have it
    if (context) {
      messages.push({
        role: "system",
        content: `Context from the business database:\n${context}`,
      });
    }

    // Get recent conversation history if conversationId provided
    if (conversationId) {
      const { data: history } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(10);

      if (history && history.length > 0) {
        history.forEach((msg: { role: string; content: string }) => {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        });
      }
    }

    // Add the current user message
    messages.push({ role: "user", content: message });

    // Get response from GPT
    const rawResponse = await chatCompletion(messages, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Parse chart data from response
    const { text: response, chart } = parseChartFromResponse(rawResponse);

    // Save messages to chat_messages table
    const actualConversationId = conversationId || crypto.randomUUID();

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      conversation_id: actualConversationId,
      role: "user",
      content: message,
    });

    // Save assistant response
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      conversation_id: actualConversationId,
      role: "assistant",
      content: response,
      sources: sources,
    });

    return jsonResponse({
      success: true,
      response,
      conversationId: actualConversationId,
      sources: sources.slice(0, 5),
      chart,
    });

  } catch (error) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function fetchAggregateData(supabase: any): Promise<string> {
  const parts: string[] = [];

  try {
    // Today's date for queries
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    // Today's sales
    const { data: todaySales } = await supabase
      .from("sales")
      .select("total")
      .gte("sold_at", startOfDay)
      .lte("sold_at", endOfDay)
      .eq("is_voided", false);

    if (todaySales) {
      const todayTotal = (todaySales as Array<{ total: number }>).reduce((sum, s) => sum + (s.total || 0), 0);
      parts.push(`Today's sales: £${todayTotal.toFixed(2)} from ${todaySales.length} transactions`);
    }

    // Total inventory value
    const { data: inventoryValue } = await supabase
      .from("v_inventory_value")
      .select("inventory_value");

    if (inventoryValue) {
      const totalValue = (inventoryValue as Array<{ inventory_value: number }>).reduce((sum, i) => sum + (i.inventory_value || 0), 0);
      parts.push(`Total inventory value: £${totalValue.toFixed(2)}`);
    }

    // Low stock count
    const { data: stockStatus } = await supabase
      .from("v_stock_status")
      .select("product_id")
      .eq("is_at_risk", true);

    if (stockStatus) {
      parts.push(`Products with low stock: ${stockStatus.length}`);
    }

    // Product count
    const { count: productCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (productCount !== null) {
      parts.push(`Total products: ${productCount}`);
    }

    // Customer count
    const { count: customerCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    if (customerCount !== null) {
      parts.push(`Total customers: ${customerCount}`);
    }

    // VIP customers
    const { count: vipCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .neq("vip_tier", "standard");

    if (vipCount !== null) {
      parts.push(`VIP customers: ${vipCount}`);
    }

    // Sales by category for the week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weeklySales } = await supabase
      .from("sales")
      .select("total, sold_at")
      .gte("sold_at", weekAgo.toISOString())
      .eq("is_voided", false);

    if (weeklySales) {
      const weeklyTotal = (weeklySales as Array<{ total: number }>).reduce((sum, s) => sum + (s.total || 0), 0);
      parts.push(`This week's sales: £${weeklyTotal.toFixed(2)} from ${weeklySales.length} transactions`);
    }

    // Expenses this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyExpenses } = await supabase
      .from("expenses")
      .select("amount, category")
      .gte("incurred_at", startOfMonth.toISOString());

    if (monthlyExpenses && monthlyExpenses.length > 0) {
      const expenses = monthlyExpenses as Array<{ amount: number; category: string }>;
      const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const byCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      parts.push(`This month's expenses: £${expenseTotal.toFixed(2)}`);
      parts.push(`Expenses by category: ${Object.entries(byCategory).map(([k, v]) => `${k}: £${v.toFixed(2)}`).join(', ')}`);
    }

  } catch (err) {
    console.error("Error fetching aggregate data:", err);
  }

  return parts.join("\n");
}
