ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS common_uses text,
  ADD COLUMN IF NOT EXISTS how_to_use text,
  ADD COLUMN IF NOT EXISTS common_projects text,
  ADD COLUMN IF NOT EXISTS safety_tips text,
  ADD COLUMN IF NOT EXISTS whats_included text,
  ADD COLUMN IF NOT EXISTS tips_and_tricks text;

UPDATE public.tools
SET short_description = description
WHERE short_description IS NULL AND description IS NOT NULL;