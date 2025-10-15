-- Create medical_records table for comprehensive patient medical history
-- This includes blood tests, lab results, and other medical data that can help diagnose pneumonia

CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Record metadata
  record_type VARCHAR(50) NOT NULL, -- 'blood_test', 'lab_result', 'imaging', 'vital_signs', 'medication', 'allergy', 'condition', 'other'
  record_date TIMESTAMP NOT NULL,
  title VARCHAR(255) NOT NULL,
  
  -- Blood test results
  wbc_count DECIMAL(10, 2), -- White Blood Cell count (cells/μL)
  rbc_count DECIMAL(10, 2), -- Red Blood Cell count (million cells/μL)
  hemoglobin DECIMAL(10, 2), -- Hemoglobin (g/dL)
  hematocrit DECIMAL(10, 2), -- Hematocrit (%)
  platelet_count DECIMAL(10, 2), -- Platelet count (cells/μL)
  neutrophils DECIMAL(10, 2), -- Neutrophils (%)
  lymphocytes DECIMAL(10, 2), -- Lymphocytes (%)
  
  -- Inflammatory markers
  crp DECIMAL(10, 2), -- C-Reactive Protein (mg/L)
  esr DECIMAL(10, 2), -- Erythrocyte Sedimentation Rate (mm/hr)
  procalcitonin DECIMAL(10, 2), -- Procalcitonin (ng/mL)
  
  -- Respiratory function
  spo2 DECIMAL(5, 2), -- Oxygen saturation (%)
  respiratory_rate INTEGER, -- Breaths per minute
  
  -- Vital signs
  temperature DECIMAL(5, 2), -- Body temperature (°C)
  heart_rate INTEGER, -- Beats per minute
  blood_pressure_systolic INTEGER, -- mmHg
  blood_pressure_diastolic INTEGER, -- mmHg
  
  -- Additional data
  findings TEXT, -- Detailed findings and observations
  notes TEXT, -- Doctor's notes
  file_url TEXT, -- URL to attached files (PDFs, images)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_type ON public.medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON public.medical_records(record_date DESC);

-- Enable Row Level Security
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Doctors can view medical records of their patients"
ON public.medical_records FOR SELECT
USING (doctor_id = auth.uid() OR patient_id IN (SELECT id FROM public.patients WHERE doctor_id = auth.uid()));

CREATE POLICY "Doctors can insert medical records for their patients"
ON public.medical_records FOR INSERT
WITH CHECK (doctor_id = auth.uid() AND patient_id IN (SELECT id FROM public.patients WHERE doctor_id = auth.uid()));

CREATE POLICY "Doctors can update medical records of their patients"
ON public.medical_records FOR UPDATE
USING (doctor_id = auth.uid() OR patient_id IN (SELECT id FROM public.patients WHERE doctor_id = auth.uid()));

CREATE POLICY "Doctors can delete medical records of their patients"
ON public.medical_records FOR DELETE
USING (doctor_id = auth.uid() OR patient_id IN (SELECT id FROM public.patients WHERE doctor_id = auth.uid()));
