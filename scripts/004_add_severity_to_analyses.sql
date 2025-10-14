-- Add severity column to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS severity VARCHAR(20);

-- Update existing records to have severity based on confidence
UPDATE public.analyses
SET severity = CASE
  WHEN diagnosis = 'NORMAL' THEN NULL
  WHEN confidence >= 85 THEN 'severe'
  WHEN confidence >= 70 THEN 'moderate'
  ELSE 'mild'
END
WHERE severity IS NULL;
