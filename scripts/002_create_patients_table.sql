-- Create patients table for patient record management
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  gender VARCHAR(20),
  phone VARCHAR(50),
  medical_history TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add patient_id to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON public.patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);
CREATE INDEX IF NOT EXISTS idx_analyses_patient_id ON public.analyses(patient_id);

-- Add RLS policies for patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their own patients"
  ON public.patients FOR SELECT
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can insert their own patients"
  ON public.patients FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their own patients"
  ON public.patients FOR UPDATE
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can delete their own patients"
  ON public.patients FOR DELETE
  USING (doctor_id = auth.uid());
