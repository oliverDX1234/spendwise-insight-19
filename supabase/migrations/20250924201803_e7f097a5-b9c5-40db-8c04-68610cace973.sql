-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.set_limit_end_date()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.period_type
    WHEN 'weekly' THEN
      NEW.end_date := NEW.start_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      NEW.end_date := NEW.start_date + INTERVAL '1 month';
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;