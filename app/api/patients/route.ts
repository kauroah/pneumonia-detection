import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession } from "@/lib/file-storage"
import { createPatient, getPatientsByDoctor, searchPatients } from "@/lib/file-storage"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")

    const patients = search ? await searchPatients(user.id, search) : await getPatientsByDoctor(user.id)

    return NextResponse.json({ patients })
  } catch (error) {
    console.error("Error fetching patients:", error)
    return NextResponse.json({ error: "Ошибка при получении пациентов" }, { status: 500 })
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
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { name, age, gender, phone, medical_history, notes } = body

    if (!name) {
      return NextResponse.json({ error: "Имя пациента обязательно" }, { status: 400 })
    }

    const patient = await createPatient(user.id, {
      name,
      age,
      gender,
      phone,
      medical_history,
      notes,
    })

    return NextResponse.json({ patient })
  } catch (error) {
    console.error("Error creating patient:", error)
    return NextResponse.json({ error: "Ошибка при создании пациента" }, { status: 500 })
  }
}
