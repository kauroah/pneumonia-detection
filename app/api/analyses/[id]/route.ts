import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession } from "@/lib/file-storage"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    console.log("Fetching analysis:", params.id, "for user:", user.id)

    // First, try to get the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", params.id)
      .single()

    if (analysisError || !analysis) {
      console.log("Analysis not found:", analysisError)
      return NextResponse.json({ error: "Анализ не найден" }, { status: 404 })
    }

    // Check if user is the creator
    if (analysis.user_id === user.id) {
      console.log("User is the creator of the analysis")
      return NextResponse.json({ analysis })
    }

    // Check if user is assigned as a reviewer for this analysis
    const { data: secondOpinion, error: opinionError } = await supabase
      .from("second_opinions")
      .select("*")
      .eq("analysis_id", params.id)
      .eq("reviewing_doctor_id", user.id)
      .single()

    if (secondOpinion) {
      console.log("User is assigned as reviewer for this analysis")
      return NextResponse.json({ analysis })
    }

    console.log("[User does not have access to this analysis")
    return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 })
  } catch (error) {
    console.error("Error fetching analysis:", error)
    return NextResponse.json({ error: "Ошибка получения анализа" }, { status: 500 })
  }
}
