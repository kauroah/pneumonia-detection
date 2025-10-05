import { type NextRequest, NextResponse } from "next/server"
import { createUser, createSession } from "@/lib/file-storage"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role } = await request.json()

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 })
    }

    // Create user
    const user = await createUser(email, password, fullName, role)

    // Create session
    const sessionId = await createSession(user.id)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, fullName: user.full_name } })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: error.message || "Ошибка регистрации" }, { status: 500 })
  }
}
