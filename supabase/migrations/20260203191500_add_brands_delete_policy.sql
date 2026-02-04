-- Add DELETE policy for brands table
CREATE POLICY "Allow managers to delete brands"
  ON brands FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );
