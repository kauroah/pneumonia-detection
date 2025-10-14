-- Create follow-ups table for tracking patient appointments and treatment outcomes
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, missed
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON public.follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_doctor ON public.follow_ups(doctor_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON public.follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
