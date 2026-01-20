-- Update products policies to allow all authenticated staff to insert/update
-- This enables staff members to add and edit products while maintaining audit trail

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Products: Owner and manager can insert" ON public.products;
DROP POLICY IF EXISTS "Products: Owner and manager can update" ON public.products;

-- Create new policies allowing all staff (owner, manager, staff)
CREATE POLICY "Products: All staff can insert"
ON public.products FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Products: All staff can update"
ON public.products FOR UPDATE
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Note: DELETE policy remains owner/manager only for safety