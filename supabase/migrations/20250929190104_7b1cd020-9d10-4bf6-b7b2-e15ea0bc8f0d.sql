-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the monthly report generation to run at midnight on the 1st of every month
-- This will generate reports for the previous month
SELECT cron.schedule(
  'generate-monthly-reports',
  '0 0 1 * *', -- At midnight on the 1st of every month
  $$
  SELECT
    net.http_post(
      url:='https://alpdddwpjrwapqedcwdw.supabase.co/functions/v1/generate-monthly-reports',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscGRkZHdwanJ3YXBxZWRjd2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDIwOTMsImV4cCI6MjA3MzYxODA5M30.JUT-3XeEpmprpGJnkndF0F7T8WaIt_y_Dslof2meeTA"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);