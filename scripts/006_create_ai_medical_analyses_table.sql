-- Create table for storing AI medical analyses
CREATE TABLE IF NOT EXISTS ai_medical_analyses (
  id SERIAL PRIMARY KEY,
  -- Changed patient_id from INTEGER to UUID to match patients table
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Changed doctor_id from TEXT to UUID to match users table
  doctor_id UUID NOT NULL,
  analysis_text TEXT NOT NULL,
  medical_records_count INTEGER NOT NULL,
  risk_level TEXT, -- 'low', 'moderate', 'high', 'critical'
  key_findings TEXT[], -- Array of key findings
  recommended_actions TEXT[], -- Array of recommended actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_analyses_patient_id ON ai_medical_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_doctor_id ON ai_medical_analyses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_medical_analyses(created_at DESC);

-- Add comment
COMMENT ON TABLE ai_medical_analyses IS 'Stores AI-generated medical analyses based on patient medical records';
