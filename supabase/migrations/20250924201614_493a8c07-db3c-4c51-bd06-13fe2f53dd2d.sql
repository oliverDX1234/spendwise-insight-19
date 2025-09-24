-- Create limits table for category spending limits
CREATE TABLE public.limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.limits ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own limits" 
ON public.limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own limits" 
ON public.limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits" 
ON public.limits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own limits" 
ON public.limits 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_limits_updated_at
BEFORE UPDATE ON public.limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically set end_date based on period_type
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set end_date
CREATE TRIGGER set_limit_end_date_trigger
BEFORE INSERT OR UPDATE ON public.limits
FOR EACH ROW
EXECUTE FUNCTION public.set_limit_end_date();