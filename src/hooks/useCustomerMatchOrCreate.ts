import { supabase } from '@/integrations/supabase/client';

interface MatchOrCreateResult {
  customerId: number;
  isNew: boolean;
  customerName: string;
}

/**
 * Find an existing customer by email or name, or create a new one.
 * 
 * Matching priority:
 * 1. If email provided, exact match on email (case-insensitive)
 * 2. If no email match, try exact match on name (case-insensitive)
 * 3. If no match found, create new customer
 * 
 * @param name Customer name
 * @param email Customer email (optional)
 * @returns Customer ID and whether it was newly created
 */
export async function matchOrCreateCustomer(
  name: string,
  email: string | null
): Promise<MatchOrCreateResult> {
  // Step 1: Try to find by email if provided
  if (email && email.trim()) {
    const { data: emailMatch, error: emailError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('status', 'active')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();

    if (emailError) throw emailError;

    if (emailMatch) {
      return {
        customerId: emailMatch.id,
        isNew: false,
        customerName: emailMatch.name,
      };
    }
  }

  // Step 2: Try to find by exact name match
  if (name && name.trim()) {
    const { data: nameMatch, error: nameError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('status', 'active')
      .ilike('name', name.trim())
      .limit(1)
      .maybeSingle();

    if (nameError) throw nameError;

    if (nameMatch) {
      return {
        customerId: nameMatch.id,
        isNew: false,
        customerName: nameMatch.name,
      };
    }
  }

  // Step 3: Create new customer
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      status: 'active',
      vip_tier: 'standard',
      lifetime_spend: 0,
      total_purchases: 0,
    })
    .select('id, name')
    .single();

  if (createError) throw createError;

  return {
    customerId: newCustomer.id,
    isNew: true,
    customerName: newCustomer.name,
  };
}
