import { type NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/file-storage"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (sessionId) {
      await deleteSession(sessionId)
    }

    cookieStore.delete("session")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: error.message || "Ошибка выхода" }, { status: 500 })
  }
}
