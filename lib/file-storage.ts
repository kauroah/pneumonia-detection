// lib/file-storage.ts
import type { User, Analysis, Patient, FollowUp } from "./db-types"
import { createServerClient } from "./supabase/server"

/** ---------- helpers ---------- */
function isPneumoniaDiagnosis(val?: string | null): boolean {
  if (!val) return false
  const v = val.trim().toUpperCase()
  // Support canonical EN + legacy RU just in case.
  return v === "PNEUMONIA" || v === "ПНЕВМОНИЯ"
}

/** Simple (demo) password hashing — replace with bcrypt/argon2 in production. */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "salt_secret_key")
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/** ---------- sessions ---------- */
interface Session {
  id: string
  user_id: string
  expires_at: string
  created_at?: string
}

export async function createSession(userId: string): Promise<string> {
  const supabase = await createServerClient()
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  const { error } = await supabase.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  })

  if (error) {
    console.error("Error creating session:", error)
    throw new Error("Ошибка создания сессии")
  }

  console.log("Session created:", sessionId, "for user:", userId)
  return sessionId
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const supabase = await createServerClient()

  const { data: session, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single()

  if (error || !session) {
    console.log("Session not found:", sessionId)
    return null
  }

  if (new Date(session.expires_at) < new Date()) {
    console.log("Session expired:", sessionId)
    await deleteSession(sessionId)
    return null
  }

  console.log("Session found:", sessionId, "for user:", session.user_id)
  return session as Session
}

export async function deleteSession(sessionId: string) {
  const supabase = await createServerClient()
  await supabase.from("sessions").delete().eq("id", sessionId)
}

export async function getUserBySession(sessionId: string): Promise<User | null> {
  const session = await getSession(sessionId)
  if (!session) {
    console.log("No session found for:", sessionId)
    return null
  }

  const supabase = await createServerClient()
  const { data: user, error } = await supabase.from("users").select("*").eq("id", session.user_id).single()

  if (error || !user) {
    console.log("No user found for session:", sessionId)
    return null
  }

  console.log("User found for session:", user.email)
  return user as User
}

/** ---------- users ---------- */
export async function createUser(email: string, password: string, fullName: string, role: string): Promise<User> {
  const supabase = await createServerClient()

  const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single()

  if (existingUser) {
    throw new Error("Пользователь уже существует")
  }

  const passwordHash = await hashPassword(password)

  const newUser: Omit<User, "created_at" | "updated_at"> = {
    id: crypto.randomUUID(),
    email,
    password_hash: passwordHash,
    full_name: fullName,
    role,
  }

  const { data, error } = await supabase.from("users").insert(newUser).select().single()
  if (error) {
    console.error("Error creating user:", error)
    throw new Error("Ошибка создания пользователя")
  }
  return data as User
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const supabase = await createServerClient()

  const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()
  if (error || !user) return null

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) return null

  return user as User
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = await createServerClient()
  const { data: user } = await supabase.from("users").select("*").eq("email", email).single()
  return (user as User) || null
}

export async function updateUser(
  userId: string,
  updates: { full_name?: string; email?: string; password_hash?: string },
): Promise<void> {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from("users")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("Error updating user:", error)
    throw new Error("Ошибка обновления пользователя")
  }
}

/** ---------- analyses ---------- */
export type CreateAnalysisInput = {
  userId: string // uuid
  imageUrl: string
  result: string // "PNEUMONIA" | "NORMAL"
  confidence: number
  aiRecommendation?: string | null
  patientName?: string | null
  patientAge?: number | null
  imageType?: "jpeg" | "png" | "pdf" | null
  patientId?: string | null // uuid (nullable)
  severity?: "mild" | "moderate" | "severe" | null
}

export async function createAnalysis(input: CreateAnalysisInput): Promise<Analysis> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("analyses")
    .insert({
      id: crypto.randomUUID(),
      user_id: input.userId,
      image_url: input.imageUrl,
      diagnosis: input.result,
      confidence: input.confidence,
      severity: input.severity ?? null,
      ai_recommendation: input.aiRecommendation ?? null,
      patient_name: input.patientName ?? null,
      patient_age: input.patientAge ?? null,
      image_type: input.imageType ?? null,
      patient_id: input.patientId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating analysis:", error)
    throw new Error("Ошибка создания анализа")
  }
  return data as Analysis
}

export async function getAnalysesByUser(userId: string): Promise<Analysis[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching analyses:", error)
    return []
  }
  return (data as Analysis[]) || []
}

/** ---------- patients ---------- */
export async function createPatient(
  doctorId: string,
  patientData: {
    name: string
    age?: number
    gender?: string
    phone?: string
    medical_history?: string
    notes?: string
  },
): Promise<Patient> {
  const supabase = await createServerClient()

  const newPatient = {
    id: crypto.randomUUID(),
    doctor_id: doctorId,
    name: patientData.name,
    age: patientData.age || null,
    gender: patientData.gender || null,
    phone: patientData.phone || null,
    medical_history: patientData.medical_history || null,
    notes: patientData.notes || null,
  }

  const { data, error } = await supabase.from("patients").insert(newPatient).select().single()
  if (error) {
    console.error("Error creating patient:", error)
    throw new Error("Ошибка создания пациента")
  }
  return data as Patient
}

export async function getPatientsByDoctor(doctorId: string): Promise<Patient[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching patients:", error)
    return []
  }
  return (data as Patient[]) || []
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase.from("patients").select("*").eq("id", patientId).single()
  if (error || !data) return null
  return data as Patient
}

export async function searchPatients(doctorId: string, searchTerm: string): Promise<Patient[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("doctor_id", doctorId)
    .ilike("name", `%${searchTerm}%`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error searching patients:", error)
    return []
  }
  return (data as Patient[]) || []
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Omit<Patient, "id" | "doctor_id" | "created_at">>,
): Promise<Patient> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("patients")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .select()
    .single()

  if (error) {
    console.error("Error updating patient:", error)
    throw new Error("Ошибка обновления пациента")
  }
  return data as Patient
}

export async function getPatientAnalyses(patientId: string): Promise<Analysis[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching patient analyses:", error)
    return []
  }
  return (data as Analysis[]) || []
}

/** ---------- follow-ups ---------- */
export async function createFollowUp(
  doctorId: string,
  patientId: string,
  scheduledDate: string,
  notes?: string,
  analysisId?: string,
): Promise<FollowUp> {
  const supabase = await createServerClient()

  const newFollowUp = {
    id: crypto.randomUUID(),
    doctor_id: doctorId,
    patient_id: patientId,
    analysis_id: analysisId || null,
    scheduled_date: scheduledDate,
    status: "scheduled" as const,
    notes: notes || null,
    outcome: null,
  }

  const { data, error } = await supabase.from("follow_ups").insert(newFollowUp).select().single()
  if (error) {
    console.error("Error creating follow-up:", error)
    throw new Error("Ошибка создания записи на прием")
  }
  return data as FollowUp
}

export async function getFollowUpsByDoctor(doctorId: string): Promise<FollowUp[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("scheduled_date", { ascending: true })

  if (error) {
    console.error("Error fetching follow-ups:", error)
    return []
  }
  return (data as FollowUp[]) || []
}

export async function getFollowUpsByPatient(patientId: string): Promise<FollowUp[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_date", { ascending: false })

  if (error) {
    console.error("Error fetching patient follow-ups:", error)
    return []
  }
  return (data as FollowUp[]) || []
}

export async function updateFollowUp(
  followUpId: string,
  updates: Partial<Omit<FollowUp, "id" | "doctor_id" | "patient_id" | "created_at">>,
): Promise<FollowUp> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("follow_ups")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", followUpId)
    .select()
    .single()

  if (error) {
    console.error("Error updating follow-up:", error)
    throw new Error("Ошибка обновления записи")
  }
  return data as FollowUp
}

export async function getUpcomingFollowUps(doctorId: string, days = 7): Promise<FollowUp[]> {
  const supabase = await createServerClient()

  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("status", "scheduled")
    .gte("scheduled_date", now.toISOString())
    .lte("scheduled_date", futureDate.toISOString())
    .order("scheduled_date", { ascending: true })

  if (error) {
    console.error("Error fetching upcoming follow-ups:", error)
    return []
  }
  return (data as FollowUp[]) || []
}

/** ---------- statistics (fixed) ---------- */
export async function getDoctorStatistics(doctorId: string): Promise<{
  totalPatients: number
  totalAnalyses: number
  pneumoniaDetected: number
  normalCases: number
  analysesThisWeek: number
  analysesThisMonth: number
  recentAnalyses: Analysis[]
}> {
  const supabase = await createServerClient()

  const { count: totalPatients } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", doctorId)

  const { data: allAnalyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", doctorId)
    .order("created_at", { ascending: false })

  const analyses = (allAnalyses as Analysis[]) ?? []

  const pneumoniaDetected = analyses.filter((a) => isPneumoniaDiagnosis(a.diagnosis)).length
  const normalCases = analyses.length - pneumoniaDetected

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const analysesThisWeek = analyses.filter((a) => new Date(a.created_at) >= oneWeekAgo).length

  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const analysesThisMonth = analyses.filter((a) => new Date(a.created_at) >= oneMonthAgo).length

  return {
    totalPatients: totalPatients || 0,
    totalAnalyses: analyses.length,
    pneumoniaDetected,
    normalCases,
    analysesThisWeek,
    analysesThisMonth,
    recentAnalyses: analyses.slice(0, 10),
  }
}

export async function getAnalysesTrend(
  doctorId: string,
  days = 30,
): Promise<Array<{ date: string; pneumonia: number; normal: number }>> {
  const supabase = await createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", doctorId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true })

  if (!analyses || analyses.length === 0) return []

  const groupedByDate: Record<string, { pneumonia: number; normal: number }> = {}
  ;(analyses as Analysis[]).forEach((a) => {
    const date = new Date(a.created_at).toISOString().split("T")[0]
    if (!groupedByDate[date]) groupedByDate[date] = { pneumonia: 0, normal: 0 }
    if (isPneumoniaDiagnosis(a.diagnosis)) groupedByDate[date].pneumonia++
    else groupedByDate[date].normal++
  })

  return Object.entries(groupedByDate).map(([date, counts]) => ({ date, ...counts }))
}

export async function getAnalysesTrendWithSeverity(
  doctorId: string,
  days = 30,
): Promise<Array<{ date: string; mild: number; moderate: number; severe: number; normal: number; pneumonia: number }>> {
  const supabase = await createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", doctorId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true })

  if (!analyses || analyses.length === 0) return []

  const groupedByDate: Record<
    string,
    { mild: number; moderate: number; severe: number; normal: number; pneumonia: number }
  > = {}
  ;(analyses as Analysis[]).forEach((a) => {
    const date = new Date(a.created_at).toISOString().split("T")[0]
    if (!groupedByDate[date]) {
      groupedByDate[date] = { mild: 0, moderate: 0, severe: 0, normal: 0, pneumonia: 0 }
    }

    if (isPneumoniaDiagnosis(a.diagnosis)) {
      groupedByDate[date].pneumonia++
      // Count by severity
      if (a.severity === "mild") groupedByDate[date].mild++
      else if (a.severity === "moderate") groupedByDate[date].moderate++
      else if (a.severity === "severe") groupedByDate[date].severe++
    } else {
      groupedByDate[date].normal++
    }
  })

  return Object.entries(groupedByDate).map(([date, counts]) => ({ date, ...counts }))
}

/** ---------- storage upload ---------- */
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pneumonia-images"

export async function uploadImageToStorage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  ext: string,
): Promise<string> {
  const supabase = await createServerClient()
  const filename = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, buffer, {
    contentType: mimeType,
    upsert: false,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
  return pub.publicUrl
}
