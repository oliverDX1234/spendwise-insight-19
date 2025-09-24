-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up cron job to process recurring expenses daily at midnight
SELECT cron.schedule(
  'process-recurring-expenses',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT
    net.http_post(
        url:='https://alpdddwpjrwapqedcwdw.supabase.co/functions/v1/process-recurring-expenses',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscGRkZHdwanJ3YXBxZWRjd2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDIwOTMsImV4cCI6MjA3MzYxODA5M30.JUT-3XeEpmprpGJnkndF0F7T8WaIt_y_Dslof2meeTA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);