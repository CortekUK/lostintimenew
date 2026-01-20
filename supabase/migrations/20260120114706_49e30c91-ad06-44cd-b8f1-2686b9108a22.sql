-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Owner and manager can update customers" ON customers;
DROP POLICY IF EXISTS "Owner can delete customers" ON customers;

-- Create new policies that include staff
CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  USING (is_owner_or_manager(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  USING (is_owner_or_manager(auth.uid()) OR is_staff(auth.uid()));