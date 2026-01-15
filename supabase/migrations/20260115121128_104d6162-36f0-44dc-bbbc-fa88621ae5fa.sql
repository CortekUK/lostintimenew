-- 1. Create a new helper function that includes all staff roles (owner, manager, staff)
CREATE OR REPLACE FUNCTION public.is_any_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = uid 
    AND p.role IN ('owner', 'manager', 'staff')
  );
$$;

-- 2. Update expense_templates INSERT policy to allow all staff
DROP POLICY IF EXISTS expense_templates_insert_owner ON expense_templates;
CREATE POLICY "expense_templates_insert_all_staff" 
ON expense_templates 
FOR INSERT 
TO authenticated 
WITH CHECK (is_any_staff(auth.uid()));

-- 3. Update expense_templates UPDATE policy to allow all staff
DROP POLICY IF EXISTS expense_templates_update_owner ON expense_templates;
CREATE POLICY "expense_templates_update_all_staff" 
ON expense_templates 
FOR UPDATE 
TO authenticated 
USING (is_any_staff(auth.uid()))
WITH CHECK (is_any_staff(auth.uid()));

-- 4. Update expense_templates DELETE policy to allow all staff
DROP POLICY IF EXISTS expense_templates_delete_owner ON expense_templates;
CREATE POLICY "expense_templates_delete_all_staff" 
ON expense_templates 
FOR DELETE 
TO authenticated 
USING (is_any_staff(auth.uid()));

-- 5. Update expense_templates SELECT policy to allow all staff
DROP POLICY IF EXISTS expense_templates_read_staff ON expense_templates;
CREATE POLICY "expense_templates_read_all_staff" 
ON expense_templates 
FOR SELECT 
TO authenticated 
USING (is_any_staff(auth.uid()));