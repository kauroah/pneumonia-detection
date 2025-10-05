import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession, getAnalysesByUser } from "@/lib/file-storage"

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

    const analyses = await getAnalysesByUser(user.id)

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Ошибка получения истории" }, { status: 500 })
  }
}
