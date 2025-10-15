-- Add comprehensive risk factor fields to medical_records table
-- These fields help doctors understand pneumonia causes and risk factors

ALTER TABLE public.medical_records
ADD COLUMN IF NOT EXISTS comorbidities TEXT[], -- Array of chronic conditions (diabetes, COPD, heart disease, etc.)
ADD COLUMN IF NOT EXISTS current_medications TEXT[], -- List of current medications
ADD COLUMN IF NOT EXISTS allergies TEXT[], -- Known allergies
ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50), -- 'never', 'former', 'current'
ADD COLUMN IF NOT EXISTS smoking_pack_years DECIMAL(10, 2), -- Pack-years for smokers
ADD COLUMN IF NOT EXISTS alcohol_use VARCHAR(50), -- 'none', 'occasional', 'moderate', 'heavy'
ADD COLUMN IF NOT EXISTS recent_travel TEXT, -- Recent travel history
ADD COLUMN IF NOT EXISTS environmental_exposures TEXT, -- Work/home exposures
ADD COLUMN IF NOT EXISTS vaccination_history JSONB, -- Vaccination records (flu, pneumococcal, COVID, etc.)
ADD COLUMN IF NOT EXISTS immunosuppressed BOOLEAN DEFAULT false, -- Immunocompromised status
ADD COLUMN IF NOT EXISTS recent_hospitalization BOOLEAN DEFAULT false, -- Recent hospital stay
ADD COLUMN IF NOT EXISTS recent_antibiotics BOOLEAN DEFAULT false; -- Recent antibiotic use

-- Add comment to table
COMMENT ON TABLE public.medical_records IS 'Comprehensive medical records including labs, risk factors, comorbidities, and exposures for pneumonia diagnosis';
