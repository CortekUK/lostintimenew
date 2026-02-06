-- Grant owner (superadmin) role to admin@demo.com
UPDATE profiles
SET role = 'owner'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@demo.com'
);
