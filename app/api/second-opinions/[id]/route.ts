import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession } from "@/lib/file-storage"
import { createServerClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const supabase = await createServerClient()

    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // If completing review, set reviewed_at
    if (body.status === "completed") {
      updateData.reviewed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("second_opinions")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating second opinion:", error)
      return NextResponse.json({ error: "Ошибка обновления запроса" }, { status: 500 })
    }

    return NextResponse.json({ opinion: data })
  } catch (error) {
    console.error("Second opinion update error:", error)
    return NextResponse.json({ error: "Ошибка обновления запроса" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    console.log("Fetching second opinion:", params.id)

    if (!sessionId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
    }

    const supabase = await createServerClient()

    const { data: opinion, error } = await supabase.from("second_opinions").select("*").eq("id", params.id).single()

    console.log("Second opinion query result:", { opinion, error })

    if (error || !opinion) {
      console.error("Second opinion not found:", params.id, error)
      return NextResponse.json({ error: "Запрос не найден" }, { status: 404 })
    }

    return NextResponse.json({ secondOpinion: opinion })
  } catch (error) {
    console.error("Error fetching second opinion:", error)
    return NextResponse.json({ error: "Ошибка получения запроса" }, { status: 500 })
  }
}
