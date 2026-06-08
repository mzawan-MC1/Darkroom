/*
  # Fix Waiver Template Version Data Type
  
  ## Problem
  The waivers.template_version column is type INTEGER, but waiver_templates.version is TEXT.
  When trying to save a version like "1.0" from the template into the waiver, we get the error:
  "invalid input syntax for type integer: '1.0'"
  
  ## Changes
  1. Change waivers.template_version from INTEGER to TEXT
     - Allows storing version numbers with decimal points (e.g., "1.0", "2.1")
     - Matches the data type of waiver_templates.version
     - Preserves existing data by casting integers to text
  
  ## Data Safety
  - Uses ALTER COLUMN with TYPE to safely convert existing integer values to text
  - Existing data will be preserved (e.g., 1 becomes "1")
  - No data loss will occur
*/

-- Change template_version column from integer to text to match waiver_templates.version
ALTER TABLE waivers 
ALTER COLUMN template_version TYPE text USING template_version::text;
