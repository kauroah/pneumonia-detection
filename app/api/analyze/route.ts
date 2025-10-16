export const runtime = "nodejs" // IMPORTANT: enable Node APIs & native addons
import { type NextRequest, NextResponse } from "next/server"
import { getUserBySession, createAnalysis } from "@/lib/file-storage"
import { runInference, convertPdfToImage } from "@/lib/model-inference"
import { classifySeverity, getSeverityDetails } from "@/lib/severity-classifier"
import path from "path"
import { cookies } from "next/headers"
import { llm } from "@/lib/llm"
import sharp from "sharp"
import { uploadImageToStorage } from "@/lib/file-storage"
import { createServerClient } from "@/lib/supabase/server"
import type { MedicalRecord } from "@/lib/db-types"

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const patientName = formData.get("patientName") as string
    const patientAge = formData.get("patientAge") as string
    const patientId = formData.get("patientId") as string | null

    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
    }

    let medicalRecords: MedicalRecord[] = []
    if (patientId) {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("record_date", { ascending: false })
        .limit(5) // Get last 5 records for context

      if (!error && data) {
        medicalRecords = data as MedicalRecord[]
      }
    }

    // буфер исходного файла
    const inputBuf = Buffer.from(await imageFile.arrayBuffer())
    const mimeType = imageFile.type || "image/jpeg"

    // Если PDF — как у вас, конвертируйте (или верните 400)
    let imageBuffer = inputBuf
    const isPdf = imageFile.name.toLowerCase().endsWith(".pdf")
    if (isPdf) {
      try {
        imageBuffer = await convertPdfToImage(inputBuf)
      } catch {
        return NextResponse.json(
          { error: "PDF conversion not supported yet. Please use PNG or JPEG images." },
          { status: 400 },
        )
      }
    }

    // Нормализуем размер/формат, чтобы не грузить гигабайты
    // Приведём к JPEG 80% и ширина <= 1024
    const processed = await sharp(imageBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Загружаем в Supabase Storage -> получаем публичный URL
    const publicUrl = await uploadImageToStorage(user.id, processed, "image/jpeg", "jpg")

    const modelPath = path.join(process.cwd(), "public", "models", "pneumonia_model.onnx")
    // Инференс по ОТКОРРЕКТИРОВАННОМУ буферу (processed)
    const inferenceResult = await runInference(processed, modelPath)

    const severity = classifySeverity(inferenceResult.diagnosis, inferenceResult.confidence)
    const severityDetails = getSeverityDetails(severity)

    const recommendation = await generateAIRecommendation(
      inferenceResult.diagnosis,
      inferenceResult.confidence,
      severity,
      severityDetails,
      medicalRecords, // Include medical history
    )

    const analysis = await createAnalysis({
      userId: user.id,
      imageUrl: publicUrl,
      result: inferenceResult.diagnosis,
      confidence: inferenceResult.confidence,
      aiRecommendation: recommendation,
      patientName: patientName || null,
      patientAge: patientAge ? Number.parseInt(patientAge) : null,
      imageType: isPdf ? "pdf" : "jpeg",
      patientId: patientId || null,
      severity,
    })

    return NextResponse.json({
      id: analysis.id,
      diagnosis: inferenceResult.diagnosis,
      confidence: inferenceResult.confidence,
      severity: severity,
      severityDetails: severityDetails,
      recommendation,
      imageUrl: publicUrl,
    })
  } catch (error: any) {
    console.error("Analysis API error:", error)
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 })
  }
}

async function generateAIRecommendation(
  diagnosis: string,
  confidence: number,
  severity: "mild" | "moderate" | "severe" | null,
  severityDetails: {
    description: string
    urgency: "low" | "medium" | "high"
    recommendations: string[]
  },
  medicalRecords: MedicalRecord[] = [], // Medical history from База знаний
): Promise<string> {
  // Helper to nuke any stray Markdown the model might still emit
  const sanitize = (s: string) =>
    s
      .replace(/^[#>\-*\s]+/gm, "")
      .replace(/[`*_~]/g, "")
      .replace(/^\s*\|.*\|\s*$/gm, (m) =>
        m
          .replace(/\|/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim(),
      )
      .replace(/\n{3,}/g, "\n\n")
      .trim()

  try {
    const baseIntro = [
      `Диагноз: ${diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}`,
      `Уверенность модели: ${confidence.toFixed(1)}%`,
      severity ? `Степень тяжести: ${severityDetails.description} (срочность: ${severityDetails.urgency})` : null,
    ]
      .filter(Boolean)
      .join("\n")

    let medicalHistoryContext = ""
    if (medicalRecords.length > 0) {
      const latestRecord = medicalRecords[0]

      medicalHistoryContext = `\n\nМЕДИЦИНСКАЯ ИСТОРИЯ ПАЦИЕНТА (База знаний):`

      // Risk factors
      if (latestRecord.comorbidities) {
        medicalHistoryContext += `\nСопутствующие заболевания: ${latestRecord.comorbidities}`
      }
      if (latestRecord.current_medications) {
        medicalHistoryContext += `\nТекущие медикаменты: ${latestRecord.current_medications}`
      }
      if (latestRecord.allergies) {
        medicalHistoryContext += `\nАллергии: ${latestRecord.allergies}`
      }
      if (latestRecord.smoking_status) {
        medicalHistoryContext += `\nКурение: ${latestRecord.smoking_status}`
      }
      if (latestRecord.alcohol_use) {
        medicalHistoryContext += `\nАлкоголь: ${latestRecord.alcohol_use}`
      }
      if (latestRecord.environmental_exposures) {
        medicalHistoryContext += `\nВоздействие окружающей среды: ${latestRecord.environmental_exposures}`
      }
      if (latestRecord.immunosuppression) {
        medicalHistoryContext += `\nИммуносупрессия: ${latestRecord.immunosuppression}`
      }
      if (latestRecord.recent_hospitalization) {
        medicalHistoryContext += `\nНедавняя госпитализация: ${latestRecord.recent_hospitalization}`
      }

      // Lab results
      const abnormalLabs: string[] = []
      if (latestRecord.wbc && (latestRecord.wbc < 4.0 || latestRecord.wbc > 11.0)) {
        abnormalLabs.push(`Лейкоциты: ${latestRecord.wbc} (норма 4.0-11.0)`)
      }
      if (latestRecord.crp && latestRecord.crp > 10) {
        abnormalLabs.push(`CRP: ${latestRecord.crp} (норма <10)`)
      }
      if (latestRecord.esr && latestRecord.esr > 20) {
        abnormalLabs.push(`СОЭ: ${latestRecord.esr} (норма <20)`)
      }
      if (latestRecord.spo2 && latestRecord.spo2 < 95) {
        abnormalLabs.push(`SpO2: ${latestRecord.spo2}% (норма >95%)`)
      }
      if (latestRecord.temperature && latestRecord.temperature > 37.5) {
        abnormalLabs.push(`Температура: ${latestRecord.temperature}°C`)
      }

      if (abnormalLabs.length > 0) {
        medicalHistoryContext += `\n\nОТКЛОНЕНИЯ В АНАЛИЗАХ:\n${abnormalLabs.join("\n")}`
      }

      if (latestRecord.notes) {
        medicalHistoryContext += `\n\nДополнительные заметки: ${latestRecord.notes}`
      }
    }

    const commonRules = `
ФОРМАТИРОВАНИЕ (СТРОГО):
- Возвращай ТОЛЬКО обычный текст. Никакого Markdown и спецсимволов (#, *, |, \` и т.п.).
- Структура всегда из 6 разделов с НУМЕРОВАННЫМИ пунктами:
1) Анализ медицинской истории и факторов риска
2) Немедленные действия
3) Дополнительные анализы
4) Лечение
5) Уход и режим
6) График контрольных осмотров
- Для раздела 6 используй полноценный список строк "Время — действие"
- Пиши сжато, по делу, без «воды». Не используй таблицы, только ровные строки.
- Финальная строка: "Окончательное решение принимает лечащий врач."`

    const prompt =
      diagnosis === "PNEUMONIA"
        ? `${baseIntro}${medicalHistoryContext}

Ты — медицинский ассистент. Составь четкий, персонализированный план для лечения пневмонии на русском языке.
${medicalRecords.length > 0 ? "ВАЖНО: Учитывай медицинскую историю пациента при составлении рекомендаций. Объясни, какие факторы из истории могли способствовать развитию пневмонии." : ""}

Учитывай данные о тяжести и срочности:
- Базовые рекомендации по тяжести: 
${severityDetails.recommendations.map((r) => `  - ${r}`).join("\n")}

${commonRules}

Контент:
1) Анализ медицинской истории и факторов риска (3-5 пунктов: какие факторы из истории могли привести к пневмонии, какие сопутствующие заболевания усложняют лечение, какие лекарства могут взаимодействовать)
2) Немедленные действия (3–6 пунктов, привязанных к тяжести и истории пациента).
3) Дополнительные анализы (3–6 пунктов, учитывая имеющиеся отклонения).
4) Лечение (4–8 пунктов: антибиотики/противовирусные с учетом аллергий и текущих медикаментов, поддержка, мониторинг).
5) Уход и режим (3–6 пунктов, учитывая сопутствующие заболевания).
6) График контрольных осмотров (5–6 временных точек в течение суток).`
        : `${baseIntro}${medicalHistoryContext}

Ты — медицинский ассистент. Составь понятный план профилактики и наблюдения за состоянием легких на русском языке.
${medicalRecords.length > 0 ? "ВАЖНО: Учитывай факторы риска из медицинской истории пациента. Укажи, какие факторы требуют особого внимания для профилактики." : ""}

${commonRules}

Контент:
1) Анализ медицинской истории и факторов риска (если есть история — укажи факторы риска для будущего; если нет — укажи "Медицинская история не предоставлена")
2) Немедленные действия (если есть жалобы — что делать прямо сейчас; если нет — укажи "Не требуются"). 
3) Дополнительные анализы (при каких симптомах и какие именно, учитывая факторы риска).
4) Лечение (если симптомов нет — укажи "Не требуется"; иначе примеры OTC по назначению врача с учетом аллергий).
5) Уход и режим (дыхательные упражнения, сон, гидратация, отказ от курения, учитывая сопутствующие заболевания).
6) График контрольных осмотров (5–6 временных точек в течение суток или недельный план для домашнего режима).`

    const { text } = await llm().gen({
      prompt,
      maxOutputTokens: 1200, // Increased for medical history analysis
      temperature: 0.4,
    })

    return sanitize(text)
  } catch (error) {
    console.error("AI recommendation error:", error)
    const medicalHistoryNote =
      medicalRecords.length > 0 ? "\n\nУчтена медицинская история пациента при составлении рекомендаций." : ""

    const backup =
      diagnosis === "PNEUMONIA"
        ? `Диагноз: Пневмония
Уверенность модели: ${confidence.toFixed(1)}%
Степень тяжести: ${severityDetails.description}${medicalHistoryNote}

1) Анализ медицинской истории и факторов риска
${
  medicalRecords.length > 0
    ? `- Учтены сопутствующие заболевания и текущие медикаменты
- Проанализированы факторы риска развития пневмонии
- Выявлены потенциальные осложнения`
    : "- Медицинская история не предоставлена"
}

2) Немедленные действия
- ${severityDetails.recommendations.join("\n- ")}

3) Дополнительные анализы
- Общий анализ крови и CRP
- Пульсоксиметрия и контроль SpO2
- Рентген/КТ грудной клетки по назначению врача

4) Лечение
- Антибиотикотерапия по назначению врача${medicalRecords.length > 0 && medicalRecords[0].allergies ? ` (с учетом аллергий: ${medicalRecords[0].allergies})` : ""}
- Симптоматическая терапия (жаропонижающие)
- Контроль эффективности через 48–72 часа

5) Уход и режим
- Отдых, достаточная гидратация
- Ограничение физи��еских нагрузок
- Дыхательная гимнастика по согласованию с врачом

6) График контрольных осмотров
08:00 — Осмотр врача
12:00 — Контроль температуры и сатурации
15:00 — Лабораторные анализы (по плану)
19:00 — Коррекция терапии по результатам
23:00 — Отдых, ночной мониторинг

Окончательное решение принимает лечащий врач.`
        : `Диагноз: Норма
Уверенность модели: ${confidence.toFixed(1)}%${medicalHistoryNote}

1) Анализ медицинской истории и факторов риска
${
  medicalRecords.length > 0
    ? `- Выявлены факторы риска, требующие наблюдения
- Рекомендуется профилактика с учетом истории`
    : "- Медицинская история не предоставлена"
}

2) Немедленные действия
- Не требуются

3) Дополнительные анализы
- При появлении лихорадки, кашля, одышки — обратиться к врачу
- По рекомендациям врача — ОАК, рентген/КТ

4) Лечение
- Не требуется при отсутствии симптомов

5) Уход и режим
- Физическая активность по самочувствию
- Гидратация, отказ от курения
- Проветривание, влажная уборка

6) График контрольных осмотров
08:00 — Утренняя самопроверка самочувствия
12:00 — Короткая прогулка/дыхательная разминка
15:00 — Гидратация, отдых
19:00 — Легкая физическая нагрузка
23:00 — Подготовка ко сну

Окончательное решение принимает лечащий врач.`

    return backup
  }
}
