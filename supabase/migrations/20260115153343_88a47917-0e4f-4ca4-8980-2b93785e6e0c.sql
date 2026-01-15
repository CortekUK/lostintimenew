-- Allow all staff to insert stock movements (needed for sales to complete)
CREATE POLICY "Stock Movements: All staff can insert"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  is_any_staff(auth.uid())
);