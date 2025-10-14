import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession, getFollowUpsByDoctor, createFollowUp } from "@/lib/file-storage"

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

    const followUps = await getFollowUpsByDoctor(user.id)

    return NextResponse.json({ followUps })
  } catch (error) {
    console.error("Follow-ups fetch error:", error)
    return NextResponse.json({ error: "Ошибка получения записей" }, { status: 500 })
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
    const { patientId, scheduledDate, notes, analysisId } = body

    if (!patientId || !scheduledDate) {
      return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 })
    }

    const followUp = await createFollowUp(user.id, patientId, scheduledDate, notes, analysisId)

    return NextResponse.json({ followUp })
  } catch (error) {
    console.error("Follow-up creation error:", error)
    return NextResponse.json({ error: "Ошибка создания записи" }, { status: 500 })
  }
}
