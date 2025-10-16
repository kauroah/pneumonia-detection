// lib/auth.ts
import { cookies } from "next/headers";
import { getUserBySession } from "@/lib/file-storage";

export async function requireUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) return null;

  const user = await getUserBySession(sessionId);
  return user; // null if not found/expired
}
