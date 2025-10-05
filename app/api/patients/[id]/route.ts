import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession, getPatientById, getPatientAnalyses, updatePatient } from "@/lib/file-storage"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const patientId = params.id
    const patient = await getPatientById(patientId)

    if (!patient || patient.doctor_id !== user.id) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 })
    }

    const analyses = await getPatientAnalyses(patientId)

    return NextResponse.json({ patient, analyses })
  } catch (error) {
    console.error("Error fetching patient:", error)
    return NextResponse.json({ error: "Ошибка при получении данных пациента" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const patientId = params.id
    const patient = await getPatientById(patientId)

    if (!patient || patient.doctor_id !== user.id) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 })
    }

    const body = await request.json()
    const updatedPatient = await updatePatient(patientId, body)

    return NextResponse.json({ patient: updatedPatient })
  } catch (error) {
    console.error("Error updating patient:", error)
    return NextResponse.json({ error: "Ошибка при обновлении пациента" }, { status: 500 })
  }
}
