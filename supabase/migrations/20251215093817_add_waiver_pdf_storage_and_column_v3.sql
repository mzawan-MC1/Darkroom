/*
  # Add Waiver PDF Storage and Column

  1. Changes
    - Create a new storage bucket 'waivers' for storing signed waiver PDFs
    - Add 'signed_pdf_url' column to waivers table to store the PDF file path
    - Configure RLS policies for the waivers storage bucket
      - Authenticated users can read their own waivers
      - Admin/Staff can read all waivers
      - Authenticated users can insert waiver PDFs
      - Admin/Staff can delete waivers if needed
  
  2. Security
    - Enable RLS on storage bucket
    - Policies ensure customers can only view their own signed waivers
    - Admin and Staff have full access to all waiver PDFs
*/

-- Create storage bucket for waiver PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'waivers',
  'waivers',
  false,
  5242880, -- 5MB limit per PDF
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Add signed_pdf_url column to waivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waivers' AND column_name = 'signed_pdf_url'
  ) THEN
    ALTER TABLE waivers ADD COLUMN signed_pdf_url text;
  END IF;
END $$;

-- Storage policies for waiver PDFs
-- Policy: Authenticated users can read their own waiver PDFs or Admin/Staff can read all
CREATE POLICY "Users can view own waiver PDFs or admins view all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'waivers' AND
    (
      -- User can view their own waivers
      EXISTS (
        SELECT 1 FROM waivers
        WHERE waivers.signed_pdf_url = storage.objects.name
        AND waivers.user_id = auth.uid()
      )
      OR
      -- Admin/Staff can view all waivers
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('Admin', 'Staff')
        AND ur.is_active = true
      )
    )
  );

-- Policy: Allow authenticated users to upload waiver PDFs
CREATE POLICY "Authenticated users can upload waiver PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'waivers'
  );

-- Policy: Admin/Staff can delete waiver PDFs if needed
CREATE POLICY "Admin and Staff can delete waiver PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'waivers' AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin', 'Staff')
      AND ur.is_active = true
    )
  );