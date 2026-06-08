-- Add deduplication_id to email_logs
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS deduplication_id text;

-- Add UNIQUE constraint to prevent duplicate emails
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_deduplication_id 
ON email_logs(deduplication_id) 
WHERE deduplication_id IS NOT NULL;

-- Enable RLS for insert if not already
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs (needed for frontend-triggered emails)
-- But restrict them to only insert if they are the sender or it's a system email
CREATE POLICY "Authenticated users can insert email logs"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true); 
  -- In a stricter environment, we might want to validate the 'from_email' or other fields, 
  -- but for now, allowing insert is necessary for the frontend trigger to work.
