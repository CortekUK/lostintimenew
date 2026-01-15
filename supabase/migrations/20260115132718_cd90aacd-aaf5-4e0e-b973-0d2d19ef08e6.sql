-- Allow staff to safely insert/update their own expense rows (match frontend behavior)

-- Insert: replace overly-broad staff insert policy (didn't enforce staff_id)
DROP POLICY IF EXISTS expenses_insert_staff ON public.expenses;

CREATE POLICY expenses_insert_own_staff
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  is_staff(auth.uid())
  AND staff_id = auth.uid()
);

-- Update: allow staff to update only expenses they recorded
CREATE POLICY expenses_update_own_staff
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  is_staff(auth.uid())
  AND staff_id = auth.uid()
)
WITH CHECK (
  is_staff(auth.uid())
  AND staff_id = auth.uid()
);
