-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_number INTEGER NOT NULL,
  month_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT,
  excel_url TEXT,
  UNIQUE(user_id, report_number)
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_month_year ON public.reports(month_year);

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reports bucket
CREATE POLICY "Users can view their own reports"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Service role can insert reports"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
  );