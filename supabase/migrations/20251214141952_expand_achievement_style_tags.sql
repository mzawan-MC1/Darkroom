/*
  # Expand Achievement Style Tags

  1. Changes
    - Updates the CHECK constraint on game_achievements.style_tag to allow new values:
      - horror, adventurer, sinner, achiever, reacher, struggler, dracula, gamer, sleeper, dangerous
    - Maintains existing values: vikings, pirates, neutral
    
  2. Notes
    - This is a non-breaking change that expands available options
    - Existing data remains valid
*/

-- Drop the existing constraint
ALTER TABLE game_achievements 
DROP CONSTRAINT IF EXISTS game_achievements_style_tag_check;

-- Add the updated constraint with all style tags
ALTER TABLE game_achievements
ADD CONSTRAINT game_achievements_style_tag_check 
CHECK (style_tag IN (
  'vikings', 
  'pirates', 
  'neutral', 
  'horror', 
  'adventurer', 
  'sinner', 
  'achiever', 
  'reacher', 
  'struggler', 
  'dracula', 
  'gamer', 
  'sleeper', 
  'dangerous'
));
