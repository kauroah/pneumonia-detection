import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession, getDoctorStatistics, getAnalysesTrend } from "@/lib/file-storage"

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

    const searchParams = request.nextUrl.searchParams
    const days = Number.parseInt(searchParams.get("days") || "30")

    const statistics = await getDoctorStatistics(user.id)
    const trend = await getAnalysesTrend(user.id, days)

    return NextResponse.json({
      statistics,
      trend,
    })
  } catch (error) {
    console.error("Statistics error:", error)
    return NextResponse.json({ error: "Ошибка получения статистики" }, { status: 500 })
  }
}
