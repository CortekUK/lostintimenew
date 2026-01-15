-- Allow all authenticated users to insert consignment settlements
-- This is needed because any staff member can sell a consignment item
-- and the settlement record must be created as part of the sale

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Consignment Settlements: Owner and manager can insert" ON public.consignment_settlements;
DROP POLICY IF EXISTS "consignment_settlements_insert_owner" ON public.consignment_settlements;

-- Create new permissive INSERT policy for all authenticated users
CREATE POLICY "Consignment Settlements: All authenticated users can create"
ON public.consignment_settlements FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);