import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function HomePage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")

  if (sessionCookie) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
