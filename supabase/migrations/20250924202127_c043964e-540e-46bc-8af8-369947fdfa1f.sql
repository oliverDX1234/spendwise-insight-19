-- Set up cron job to check spending limits daily at 9 AM
SELECT cron.schedule(
  'check-spending-limits',
  '0 9 * * *', -- Every day at 9 AM
  $$
  SELECT
    net.http_post(
        url:='https://alpdddwpjrwapqedcwdw.supabase.co/functions/v1/check-limits',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscGRkZHdwanJ3YXBxZWRjd2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDIwOTMsImV4cCI6MjA3MzYxODA5M30.JUT-3XeEpmprpGJnkndF0F7T8WaIt_y_Dslof2meeTA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);