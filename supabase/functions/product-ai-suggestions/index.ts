import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/openai.ts";

const VALID_CATEGORIES = [
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Watches',
  'Pendants',
  'Brooches',
  'Chains',
  'Charms',
  'Cufflinks'
];

interface ProductSuggestions {
  category: string | null;
  metal: string | null;
  karat: string | null;
  gemstone: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { productName } = await req.json();

    if (!productName || typeof productName !== 'string') {
      return errorResponse('productName is required', 400);
    }

    if (productName.trim().length < 3) {
      return errorResponse('productName must be at least 3 characters', 400);
    }

    const prompt = `Extract jewellery product attributes from this product name: "${productName}"

Return a JSON object with these fields:
- category: One of these exact values: ${VALID_CATEGORIES.join(', ')}. Return null if not determinable.
- metal: The metal type (e.g., "Gold", "White Gold", "Yellow Gold", "Rose Gold", "Silver", "Platinum", "Sterling Silver"). Return null if not found.
- karat: The karat value if mentioned (e.g., "9ct", "14ct", "18ct", "22ct", "24ct"). Return null if not found.
- gemstone: The primary gemstone if mentioned (e.g., "Diamond", "Ruby", "Sapphire", "Emerald", "Pearl", "Opal"). Return null if not found.

Category hints:
- "chain", "rope chain", "curb chain", "figaro" = Chains
- "ring", "engagement", "wedding band", "signet" = Rings
- "necklace", "choker", "collar" = Necklaces
- "bracelet", "bangle", "tennis bracelet" = Bracelets
- "earring", "studs", "hoops", "drops" = Earrings
- "pendant", "locket" = Pendants
- "watch", "timepiece" = Watches
- "brooch", "pin" = Brooches
- "charm" = Charms
- "cufflink" = Cufflinks

Important rules:
- Only return values that are explicitly mentioned or clearly implied in the product name
- Be conservative - return null rather than guessing
- Return ONLY the JSON object, no other text`;

    const response = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a jewellery product classification assistant. Extract attributes from product names and return JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 150
      }
    );

    // Parse the JSON response
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the response
    const suggestions: ProductSuggestions = {
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : null,
      metal: typeof parsed.metal === 'string' ? parsed.metal : null,
      karat: typeof parsed.karat === 'string' ? parsed.karat : null,
      gemstone: typeof parsed.gemstone === 'string' ? parsed.gemstone : null
    };

    return jsonResponse(suggestions);

  } catch (error) {
    console.error('Product AI suggestions error:', error);
    return errorResponse(error.message || 'Failed to get AI suggestions', 500);
  }
});
