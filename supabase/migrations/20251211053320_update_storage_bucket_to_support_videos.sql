/*
  # Update Storage Bucket to Support Videos and Images

  1. Changes
    - Update the 'images' bucket to support both image and video formats
    - Increase file size limit to 52MB (50MB) to accommodate videos
    - Add common video mime types (mp4, webm, ogg, mov, avi)
    - Keep all existing image formats (jpeg, jpg, png, gif, webp, svg)

  2. Supported Formats
    Images: JPEG, JPG, PNG, GIF, WebP, SVG
    Videos: MP4, WebM, OGG, MOV, AVI, QuickTime

  3. Notes
    - Existing policies remain unchanged
    - Public read access continues to work for all media types
    - Authenticated users can upload both images and videos
*/

-- Update the images bucket to support videos
UPDATE storage.buckets
SET 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/avi'
  ]
WHERE id = 'images';