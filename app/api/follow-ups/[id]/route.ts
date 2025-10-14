import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession, updateFollowUp } from "@/lib/file-storage"

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
    const followUp = await updateFollowUp(params.id, body)

    return NextResponse.json({ followUp })
  } catch (error) {
    console.error("Follow-up update error:", error)
    return NextResponse.json({ error: "Ошибка обновления записи" }, { status: 500 })
  }
}
