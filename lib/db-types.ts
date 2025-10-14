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
  severity: "mild" | "moderate" | "severe" | null
  ai_recommendation: string | null
  created_at: string
}

export interface AnalysisResult {
  id?: string;
  diagnosis: "PNEUMONIA" | "NORMAL"
  confidence: number
  severity?: "mild" | "moderate" | "severe" | null
  severityDetails?: any
  recommendation: string
  imageUrl?: string
}

export interface FollowUp {
  id: string
  patient_id: string
  doctor_id: string
  analysis_id: string | null
  scheduled_date: string
  status: "scheduled" | "completed" | "cancelled" | "missed"
  notes: string | null
  outcome: string | null
  created_at: string
  updated_at: string
}

export interface SecondOpinion {
  id: string
  analysis_id: string
  requesting_doctor_id: string
  reviewing_doctor_id: string | null
  status: "pending" | "in_review" | "completed" | "declined"
  request_notes: string | null
  review_notes: string | null
  review_diagnosis: string | null
  review_confidence: number | null
  review_severity: string | null
  created_at: string
  reviewed_at: string | null
  updated_at: string
}
