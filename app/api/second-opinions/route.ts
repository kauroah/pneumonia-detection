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
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
    }

    const supabase = await createServerClient()

    // Get second opinions where user is either requesting or reviewing doctor
    const { data: opinions, error } = await supabase
      .from("second_opinions")
      .select("*")
      .or(`requesting_doctor_id.eq.${user.id},reviewing_doctor_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching second opinions:", error)
      return NextResponse.json({ error: "Ошибка получения запросов" }, { status: 500 })
    }

    return NextResponse.json({ opinions: opinions || [] })
  } catch (error) {
    console.error("Second opinions fetch error:", error)
    return NextResponse.json({ error: "Ошибка получения запросов" }, { status: 500 })
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
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
    }

    const body = await request.json()
    const { analysisId, reviewingDoctorId, requestNotes } = body

    if (!analysisId) {
      return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const newOpinion = {
      id: crypto.randomUUID(),
      analysis_id: analysisId,
      requesting_doctor_id: user.id,
      reviewing_doctor_id: reviewingDoctorId || null,
      status: "pending",
      request_notes: requestNotes || null,
    }

    const { data, error } = await supabase.from("second_opinions").insert(newOpinion).select().single()

    if (error) {
      console.error("Error creating second opinion:", error)
      return NextResponse.json({ error: "Ошибка создания запроса" }, { status: 500 })
    }

    return NextResponse.json({ opinion: data })
  } catch (error) {
    console.error("Second opinion creation error:", error)
    return NextResponse.json({ error: "Ошибка создания запроса" }, { status: 500 })
  }
}
