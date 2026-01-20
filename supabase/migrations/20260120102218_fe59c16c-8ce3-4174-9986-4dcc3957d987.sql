-- Drop the restrictive staff-only-own-expense policies
DROP POLICY IF EXISTS "expenses_delete_own_staff" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_own_staff" ON public.expenses;

-- Create new policies that allow all staff to update/delete any expense
CREATE POLICY "expenses_update_any_staff" 
ON public.expenses 
FOR UPDATE 
USING (is_any_staff(auth.uid()));

CREATE POLICY "expenses_delete_any_staff" 
ON public.expenses 
FOR DELETE 
USING (is_any_staff(auth.uid()));