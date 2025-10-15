import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession } from "@/lib/file-storage"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")

    const supabase = await createServerClient()

    let query = supabase
      .from("medical_records")
      .select("*")
      .eq("doctor_id", user.id)
      .order("record_date", { ascending: false })

    if (patientId) {
      query = query.eq("patient_id", patientId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching medical records:", error)
      return NextResponse.json({ error: "Failed to fetch medical records" }, { status: 500 })
    }

    return NextResponse.json({ records: data })
  } catch (error) {
    console.error("Error in medical records GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { patient_id, record_type, record_date, title } = body

    if (!patient_id || !record_type || !record_date || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify patient belongs to doctor
    const supabase = await createServerClient()
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patient_id)
      .eq("doctor_id", user.id)
      .single()

    if (patientError || !patient) {
      return NextResponse.json({ error: "Patient not found or unauthorized" }, { status: 404 })
    }

    const newRecord = {
      patient_id,
      doctor_id: user.id,
      record_type,
      record_date,
      title,
      wbc_count: body.wbc_count || null,
      rbc_count: body.rbc_count || null,
      hemoglobin: body.hemoglobin || null,
      hematocrit: body.hematocrit || null,
      platelet_count: body.platelet_count || null,
      neutrophils: body.neutrophils || null,
      lymphocytes: body.lymphocytes || null,
      crp: body.crp || null,
      esr: body.esr || null,
      procalcitonin: body.procalcitonin || null,
      spo2: body.spo2 || null,
      respiratory_rate: body.respiratory_rate || null,
      temperature: body.temperature || null,
      heart_rate: body.heart_rate || null,
      blood_pressure_systolic: body.blood_pressure_systolic || null,
      blood_pressure_diastolic: body.blood_pressure_diastolic || null,
      findings: body.findings || null,
      notes: body.notes || null,
      file_url: body.file_url || null,
    }

    const { data, error } = await supabase.from("medical_records").insert(newRecord).select().single()

    if (error) {
      console.error("[v0] Error creating medical record:", error)
      return NextResponse.json({ error: "Failed to create medical record" }, { status: 500 })
    }

    return NextResponse.json({ record: data })
  } catch (error) {
    console.error("Error in medical records POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
