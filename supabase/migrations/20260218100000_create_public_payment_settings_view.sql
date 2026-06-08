-- Create a view for public access to payment settings
-- Only exposes non-sensitive fields
CREATE OR REPLACE VIEW public_payment_settings AS
SELECT 
  id, 
  provider, 
  mode, 
  publishable_key, 
  merchant_id, 
  is_active,
  created_at,
  updated_at
FROM payment_settings
WHERE is_active = true;

-- Grant access to public (anon) and authenticated users
GRANT SELECT ON public_payment_settings TO anon, authenticated;

-- Add comment
COMMENT ON VIEW public_payment_settings IS 'Publicly accessible view of payment settings with sensitive data excluded';
