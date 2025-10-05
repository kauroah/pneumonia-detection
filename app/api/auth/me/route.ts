import { type NextRequest, NextResponse } from "next/server"
import { getUserBySession } from "@/lib/file-storage"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)

    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    return NextResponse.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } })
  } catch (error: any) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: error.message || "Error getting user" }, { status: 500 })
  }
}
