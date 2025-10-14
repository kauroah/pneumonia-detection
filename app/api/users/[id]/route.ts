import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession } from "@/lib/file-storage"
import { createServerClient } from "@/lib/supabase/server"; 

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const currentUser = await getUserBySession(sessionId)
    if (!currentUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
    }

    const supabase = await createServerClient()

    const { data: user, error } = await supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("id", params.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Ошибка получения пользователя" }, { status: 500 })
  }
}
