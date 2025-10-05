import type { User, Analysis } from "./db-types"
import { createServerClient } from "./supabase/server"
interface Session {
  id: string
  user_id: string
  expires_at: string
  created_at?: string
}

// Users
export async function createUser(email: string, password: string, fullName: string, role: string): Promise<User> {
  const supabase = await createServerClient()

  // Check if user exists
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

  if (error || !user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) {
    return null
  }

  return user as User
}

// Sessions
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

  // Check if expired
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

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = await createServerClient()
  const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

  if (error || !user) {
    return null
  }

  return user as User
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

// Analyses
/*export async function createAnalysis(
  userId: string,
  imageUrl: string,
  result: string,
  confidence: number,
  aiRecommendation?: string,
  patientName?: string,
  patientAge?: number,
  imageType?: string,
): Promise<Analysis> {
  const supabase = await createServerClient()

  const newAnalysis = {
    id: crypto.randomUUID(),
    user_id: userId,
    image_url: imageUrl,
    diagnosis: result,
    confidence,
    ai_recommendation: aiRecommendation,
    patient_name: patientName,
    patient_age: patientAge,
    image_type: imageType,
  }

  const { data, error } = await supabase.from("analyses").insert(newAnalysis).select().single()

  if (error) {
    console.error("[v0] Error creating analysis:", error)
    throw new Error("Ошибка создания анализа")
  }

  return data as Analysis
}*/

/*export async function createAnalysis(input: {
  userId: string;
  imageUrl: string;
  result: string;
  confidence: number;
  aiRecommendation?: string | null;
  patientName?: string | null;
  patientAge?: number | null;
  imageType?: string | null;
  patientId?: string | null;
}): Promise<Analysis> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      id: crypto.randomUUID(),
      user_id: input.userId,
      image_url: input.imageUrl,
      diagnosis: input.result,
      confidence: input.confidence,
      ai_recommendation: input.aiRecommendation ?? null,
      patient_name: input.patientName ?? null,
      patient_age: input.patientAge ?? null,
      image_type: input.imageType ?? null,
      patient_id: input.patientId ?? null,
    })
    .select()
    .single()
  if (error) throw new Error("Ошибка создания анализа")
  return data as Analysis
}*/

export type CreateAnalysisInput = {
  userId: string;                 // uuid
  imageUrl: string;
  result: string;
  confidence: number;
  aiRecommendation?: string | null;
  patientName?: string | null;
  patientAge?: number | null;
  imageType?: "jpeg" | "png" | "pdf" | null;
  patientId?: string | null;      // uuid
};

export async function createAnalysis(input: CreateAnalysisInput): Promise<Analysis> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("analyses")
    .insert({
      id: crypto.randomUUID(),
      user_id: input.userId,
      image_url: input.imageUrl,
      diagnosis: input.result,
      confidence: input.confidence,
      ai_recommendation: input.aiRecommendation ?? null,
      patient_name: input.patientName ?? null,
      patient_age: input.patientAge ?? null,
      image_type: input.imageType ?? null,
      patient_id: input.patientId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating analysis:", error);
    throw new Error("Ошибка создания анализа");
  }
  return data as Analysis;
}



export async function getAnalysesByUser(userId: string): Promise<Analysis[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching analyses:", error)
    return []
  }

  return (data as Analysis[]) || []
}


// Patients
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

  if (error || !data) {
    return null
  }

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


// Image storage - convert to base64 data URL
// Removed saveImage function as it's no longer needed (FileReader doesn't work server-side)
// Image conversion is now handled directly in the API route using Node.js Buffer

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use bcrypt or similar
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

/*export async function uploadImageToStorage(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = await createServerClient()
  const bucket = "xray-images" // создадим его ниже
  const ext = (mimeType.split("/")[1] || "jpg").toLowerCase()
  const filePath = `${userId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase
    .storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    })
  if (upErr) throw new Error(`Ошибка загрузки изображения: ${upErr.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}
*/

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pneumonia-images";
export async function uploadImageToStorage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  ext: string
): Promise<string> {
  const supabase = await createServerClient();

  const filename = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  // If bucket is public:
  const { data: pub } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename);

  return pub.publicUrl;
}