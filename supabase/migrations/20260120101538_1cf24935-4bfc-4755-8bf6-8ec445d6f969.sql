-- Allow staff to delete their own expenses (matching the pattern of expenses_update_own_staff)
CREATE POLICY "expenses_delete_own_staff" 
ON public.expenses 
FOR DELETE 
USING (is_staff(auth.uid()) AND staff_id = auth.uid());