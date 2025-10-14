// app/api/doctors/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server"; // ✅ correct helper
import { getUserBySession } from "@/lib/file-storage";      // for session check

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;
    if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getUserBySession(sessionId);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const supabase = await createServerClient();

    // adjust table/columns to your schema
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("role", "doctor")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Doctors fetch error:", error);
      return NextResponse.json({ error: "Failed to load doctors" }, { status: 500 });
    }

    return NextResponse.json({ doctors: data ?? [] });
  } catch (e: any) {
    console.error("Doctors route error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
