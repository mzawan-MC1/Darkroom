/*
  # Update Storage Bucket to Support Videos and Images

  1. Changes
    - Update the 'images' bucket to support both image and video formats
    - Increase file size limit to 52MB to accommodate videos
    - Add common video mime types
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