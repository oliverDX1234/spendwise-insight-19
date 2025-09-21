-- Remove the default subscription_plan and add a new field to track onboarding completion
ALTER TABLE public.users 
ALTER COLUMN subscription_plan DROP DEFAULT,
ADD COLUMN onboarding_completed boolean DEFAULT false;