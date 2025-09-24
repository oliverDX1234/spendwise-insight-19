-- Remove the existing cron job for checking limits
SELECT cron.unschedule('check-spending-limits');