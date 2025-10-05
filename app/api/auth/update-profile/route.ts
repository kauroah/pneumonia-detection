import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession, updateUser, getUserByEmail } from "@/lib/file-storage"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)

    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { fullName, email, currentPassword, newPassword } = await request.json()

    // Validate email if changed
    if (email !== user.email) {
      const existingUser = await getUserByEmail(email)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json({ error: "Email уже используется" }, { status: 400 })
      }
    }

    // If changing password, verify current password
    let passwordHash = user.password_hash
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Требуется текущий пароль" }, { status: 400 })
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
      if (!isValidPassword) {
        return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 })
      }

      passwordHash = await bcrypt.hash(newPassword, 10)
    }

    await updateUser(user.id, {
      full_name: fullName,
      email,
      password_hash: passwordHash,
    })

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error: any) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 })
  }
}
