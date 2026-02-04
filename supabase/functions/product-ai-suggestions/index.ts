import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/openai.ts";

const VALID_CATEGORIES = [
  'Tops',
  'T-Shirts',
  'Shirts',
  'Blouses',
  'Dresses',
  'Skirts',
  'Trousers',
  'Jeans',
  'Shorts',
  'Jackets',
  'Coats',
  'Knitwear',
  'Activewear',
  'Shoes',
  'Bags',
  'Accessories'
];

interface ProductSuggestions {
  category: string | null;
  material: string | null;
  size: string | null;
  color: string | null;
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

    const prompt = `Extract clothing product attributes from this product name: "${productName}"

Return a JSON object with these fields:
- category: One of these exact values: ${VALID_CATEGORIES.join(', ')}. Return null if not determinable.
- material: The fabric/material type (e.g., "Cotton", "Polyester", "Wool", "Silk", "Linen", "Denim", "Leather", "Nylon", "Cashmere"). Return null if not found.
- size: The size if mentioned (e.g., "XS", "S", "M", "L", "XL", "XXL", or numeric sizes like "10", "12"). Return null if not found.
- color: The primary color if mentioned (e.g., "Black", "White", "Navy", "Red", "Blue", "Grey", "Brown", "Green"). Return null if not found.

Category hints:
- "t-shirt", "tee" = T-Shirts
- "shirt", "oxford", "button-down" = Shirts
- "blouse" = Blouses
- "top", "cami", "tank" = Tops
- "dress", "gown", "maxi", "midi" = Dresses
- "skirt", "mini skirt" = Skirts
- "trousers", "pants", "chinos" = Trousers
- "jeans", "denim" = Jeans
- "shorts" = Shorts
- "jacket", "blazer" = Jackets
- "coat", "parka", "overcoat" = Coats
- "sweater", "jumper", "cardigan", "knit" = Knitwear
- "hoodie", "leggings", "sports" = Activewear
- "shoe", "boot", "sneaker", "trainer", "heel", "sandal" = Shoes
- "bag", "handbag", "tote", "backpack" = Bags
- "scarf", "hat", "belt", "gloves", "watch" = Accessories

Important rules:
- Only return values that are explicitly mentioned or clearly implied in the product name
- Be conservative - return null rather than guessing
- Return ONLY the JSON object, no other text`;

    const response = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a clothing product classification assistant. Extract attributes from product names and return JSON only.'
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
      material: typeof parsed.material === 'string' ? parsed.material : null,
      size: typeof parsed.size === 'string' ? parsed.size : null,
      color: typeof parsed.color === 'string' ? parsed.color : null
    };

    return jsonResponse(suggestions);

  } catch (error) {
    console.error('Product AI suggestions error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get AI suggestions';
    return errorResponse(message, 500);
  }
});
