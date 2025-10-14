-- Create second opinions table for collaborative diagnosis
CREATE TABLE IF NOT EXISTS public.second_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  requesting_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewing_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, completed, declined
  request_notes TEXT,
  review_notes TEXT,
  review_diagnosis VARCHAR(50),
  review_confidence DECIMAL(5,2),
  review_severity VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_second_opinions_analysis ON public.second_opinions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_second_opinions_requesting ON public.second_opinions(requesting_doctor_id);
CREATE INDEX IF NOT EXISTS idx_second_opinions_reviewing ON public.second_opinions(reviewing_doctor_id);
CREATE INDEX IF NOT EXISTS idx_second_opinions_status ON public.second_opinions(status);
