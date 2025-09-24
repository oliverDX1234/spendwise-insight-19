-- Add "Other" as a predefined category
INSERT INTO categories (id, name, color, user_id, is_predefined, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'Other',
  '#6B7280',
  '00000000-0000-0000-0000-000000000000',
  true,
  now(),
  now()
);