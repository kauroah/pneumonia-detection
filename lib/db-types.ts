export interface User {
  id: string
  email: string
  password_hash: string
  full_name: string
  role: "doctor" | "nurse"
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  doctor_id: string
  name: string
  age: number | null
  gender: "male" | "female" | "other" | null
  phone: string | null
  medical_history: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Analysis {
  id: string
  user_id: string
  patient_id: string | null // Added patient_id to link analyses to patients
  patient_name: string | null
  patient_age: number | null
  image_url: string
  image_type: "png" | "jpeg" | "pdf"
  diagnosis: "PNEUMONIA" | "NORMAL"
  confidence: number
  ai_recommendation: string | null
  created_at: string
}

export interface AnalysisResult {
  diagnosis: "PNEUMONIA" | "NORMAL"
  confidence: number
  recommendation: string
}
