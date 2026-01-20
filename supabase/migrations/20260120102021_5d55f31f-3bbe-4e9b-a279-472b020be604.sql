-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create a new policy that allows all authenticated staff to view all profiles
-- This is needed so staff can see who created expenses, sales, etc.
CREATE POLICY "Staff can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_any_staff(auth.uid()));