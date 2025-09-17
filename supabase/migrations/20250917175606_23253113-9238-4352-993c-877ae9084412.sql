-- Rename profiles table to users
ALTER TABLE public.profiles RENAME TO users;

-- Add email column to users table
ALTER TABLE public.users ADD COLUMN email TEXT;

-- Update the existing user record with email from auth.users
UPDATE public.users 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = public.users.user_id
);

-- Make email NOT NULL after populating existing data
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

-- Update the trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (user_id, full_name, date_of_birth, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE 
      ELSE NULL 
    END,
    NEW.email
  );
  RETURN NEW;
END;
$function$;