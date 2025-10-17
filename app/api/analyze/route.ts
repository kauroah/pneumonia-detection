export const runtime = "nodejs"; // IMPORTANT: enable Node APIs & native addons
import { type NextRequest, NextResponse } from "next/server"
import { getUserBySession, createAnalysis } from "@/lib/file-storage"
import { runInference, convertPdfToImage } from "@/lib/model-inference"
import { classifySeverity, getSeverityDetails } from "@/lib/severity-classifier"
import path from "path"
import { cookies } from "next/headers"
import { llm } from "@/lib/llm";
import sharp from "sharp"
import { uploadImageToStorage } from "@/lib/file-storage" 

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

/*    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const patientName = formData.get("patientName") as string
    const patientAge = formData.get("patientAge") as string

    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    const mimeType = imageFile.type || "image/jpeg"
    const imageUrl = `data:${mimeType};base64,${base64}`

    let imageBuffer = buffer

    // Determine file type
    const fileType = imageFile.name.toLowerCase().endsWith(".pdf")
      ? "pdf"
      : imageFile.name.toLowerCase().endsWith(".png")
        ? "png"
        : "jpeg"

    // Convert PDF to image if necessary
    if (fileType === "pdf") {
      try {
        imageBuffer = await convertPdfToImage(imageBuffer)
      } catch (error) {
        return NextResponse.json(
          { error: "PDF conversion not supported yet. Please use PNG or JPEG images." },
          { status: 400 },
        )
      }
    }

    // Path to your ONNX model file
    const modelPath = path.join(process.cwd(), "public", "models", "resnet18.onnx")

    // Run inference
    const inferenceResult = await runInference(imageBuffer, modelPath)

    const recommendation = await generateAIRecommendation(inferenceResult.diagnosis, inferenceResult.confidence)

    await createAnalysis(
      user.id,
      imageUrl,
      inferenceResult.diagnosis,
      inferenceResult.confidence,
      recommendation,
      patientName || undefined,
      patientAge ? Number.parseInt(patientAge) : undefined,
      fileType,
    )

    return NextResponse.json({
      diagnosis: inferenceResult.diagnosis,
      confidence: inferenceResult.confidence,
      recommendation: recommendation,
      imageUrl: imageUrl,
    })
  } catch (error: any) {
    console.error("Analysis API error:", error)
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 })
  }
}*/

const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const patientName = formData.get("patientName") as string
    const patientAge = formData.get("patientAge") as string
    const patientId = formData.get("patientId") as string | null

    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
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
          { status: 400 }
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
    const publicUrl = await uploadImageToStorage(
      user.id,
      processed,
      "image/jpeg",
      "jpg"
    )

    // Путь к модели
   // const modelPath = path.join(process.cwd(), "public", "models", "resnet18.onnx")

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
    )

   /* await createAnalysis(
      user.id,
      publicUrl, // <— сохраняем URL, не data URL!
      inferenceResult.diagnosis,
      inferenceResult.confidence,
      recommendation,
      patientName || undefined,
      patientId || undefined,
      patientAge ? Number.parseInt(patientAge) : undefined,
      isPdf ? "pdf" : "jpeg"
    )*/

  const analysis = await createAnalysis({
    userId: user.id,
    imageUrl: publicUrl,
    result: inferenceResult.diagnosis,
    confidence: inferenceResult.confidence,
    aiRecommendation: recommendation,
    patientName: patientName || null,
    patientAge: patientAge ? Number.parseInt(patientAge) : null,
    imageType: isPdf ? "pdf" : "jpeg",
    patientId: patientId || null,   // make sure analyses.patient_id is UUID (nullable)
    severity,                       // "mild" | "moderate" | "severe" | null
  });

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

/*async function generateAIRecommendation(
  diagnosis: string, 
  confidence: number,
  severity: "mild" | "moderate" | "severe" | null,
  severityDetails: any,
): Promise<string> {
  try {
    const prompt =
      diagnosis === "PNEUMONIA"
        ? `Вы медицинский ИИ-ассистент. Создайте подробный план лечения для пациента с диагнозом пневмония.

Параметры:
- Уверенность диагноза: ${confidence.toFixed(1)}%
- Степень тяжести: ${severityDetails.description}
- Уровень срочности: ${severityDetails.urgency === "high" ? "Высокий" : severityDetails.urgency === "medium" ? "Средний" : "Низкий"}

Базовые рекомендации:
${severityDetails.recommendations.map((r: string) => `- ${r}`).join("\n")}

Создайте детальный план, включающий:
1. Немедленные действия с учетом степени тяжести
2. Необходимые дополнительные анализы
3. Варианты лечения (медикаментозное и поддерживающее)
4. Рекомендации по уходу и режиму
5. График контрольных осмотров

Напишите на русском языке. Будьте профессиональны и напомните, что окончательное решение принимает врач.`
        : `Вы медицинский ИИ-ассистент. Пневмония не обнаружена (уверенность ${confidence.toFixed(1)}%). 
    
Создайте план профилактики здоровья легких:
1. Рекомендации по образу жизни
2. Профилактические меры
3. Когда нужно обратиться к врачу
4. Упражнения для легких
5. Питание для здоровья легких

Напишите на русском языке. Будьте позитивны и поддерживающи.`

  /*  const { text } = await generateText({
    model: deepseek("deepseek-chat"), // or "gpt-4o" if you want the big one
    prompt,
    maxOutputTokens: 1000,
    temperature: 0.7,
  });*/

   /* const { text } = await llm().gen({
    prompt,
    maxOutputTokens: 15000,
    temperature: 0.5,
  });


    return text
  } catch (error) {
    console.error("AI recommendation error:", error)
    // Fallback to basic recommendation with severity
    if (diagnosis === "PNEUMONIA" && severity) {
      return `Обнаружены признаки пневмонии (${severityDetails.description}) с уверенностью ${confidence.toFixed(1)}%. ${severityDetails.recommendations.join(". ")}`
    }
    return diagnosis === "PNEUMONIA"
      ? `Обнаружены признаки пневмонии с уверенностью ${confidence.toFixed(1)}%. Требуется консультация врача.`
      : `Признаков пневмонии не обнаружено. Продолжайте следить за здоровьем легких.`
  }
}*/

async function generateAIRecommendation(
  diagnosis: string,
  confidence: number,
  severity: "mild" | "moderate" | "severe" | null,
  severityDetails: {
    description: string;
    urgency: "low" | "medium" | "high";
    recommendations: string[];
  },
): Promise<string> {
  // Helper to nuke any stray Markdown the model might still emit
  const sanitize = (s: string) =>
    s
      // headings / lists / code
      .replace(/^[#>\-\*\s]+/gm, "")
      .replace(/[`*_~]/g, "")
      // table pipes / separators
      .replace(/^\s*\|.*\|\s*$/gm, (m) => m.replace(/\|/g, " ").replace(/\s{2,}/g, " ").trim())
      // multiple blank lines -> single
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  try {
    const baseIntro = [
      `Диагноз: ${diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}`,
      `Уверенность модели: ${confidence.toFixed(1)}%`,
      severity ? `Степень тяжести: ${severityDetails.description} (срочность: ${severityDetails.urgency})` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const commonRules = `
ФОРМАТИРОВАНИЕ (СТРОГО):
- Возвращай ТОЛЬКО обычный текст. Никакого Markdown и спецсимволов (#, *, |, \` и т.п.).
- Структура всегда из 5 разделов с НУМЕРОВАННЫМИ пунктами:
1) Немедленные действия
2) Дополнительные анализы
3) Лечение
4) Уход и режим
5) График контрольных осмотров
- Для раздела 5 используй полноценный список строк “Время — действие”, например:
  08:00 — Осмотр врача
  12:00 — Контроль температуры и сатурации
  15:00 — Лабораторные анализы
  19:00 — Обсуждение результатов и коррекция терапии
  23:00 — Отдых, ночной мониторинг
- Пиши сжато, по делу, без «воды». Не используй таблицы, только ровные строки.
- Финальная строка: “Окончательное решение принимает лечащий врач.”`;

    const prompt =
      diagnosis === "PNEUMONIA"
        ? `${baseIntro}

Ты — медицинский ассистент. Составь четкий, практический план для лечения пневмонии на русском языке.
Учитывай данные о тяжести и срочности:
- Базовые рекомендации по тяжести: 
${severityDetails.recommendations.map((r) => `  - ${r}`).join("\n")}

${commonRules}

Контент:
1) Немедленные действия (3–6 пунктов, привязанных к тяжести).
2) Дополнительные анализы (3–6 пунктов, лаборатория + инструментальные).
3) Лечение (4–8 пунктов: антибиотики/противовирусные — как варианты, поддержка, мониторинг).
4) Уход и режим (3–6 пунктов).
5) График контрольных осмотров (5–6 временных точек в течение суток).`
        : `${baseIntro}

Ты — медицинский ассистент. Составь понятный план профилактики и наблюдения за состоянием легких на русском языке.

${commonRules}

Контент:
1) Немедленные действия (если есть жалобы — что делать прямо сейчас; если нет — укажи “Не требуются”). 
2) Дополнительные анализы (при каких симптомах и какие именно).
3) Лечение (если симптомов нет — укажи “Не требуется”; иначе примеры OTC по назначению врача).
4) Уход и режим (дыхательные упражнения, сон, гидратация, отказ от курения).
5) График контрольных осмотров (5–6 временных точек в течение суток или недельный план для домашнего режима).`;

    const { text } = await llm().gen({
      prompt,
      maxOutputTokens: 900, // 15000 тормозит и может сыпать “форматный шум”
      temperature: 0.4,     // более детерминированный стиль
    });

    return sanitize(text);
  } catch (error) {
    console.error("AI recommendation error:", error);
    // Узкий, но аккуратный бэкап
    const backup =
      diagnosis === "PNEUMONIA"
        ? `Диагноз: Пневмония
Уверенность модели: ${confidence.toFixed(1)}%
Степень тяжести: ${severityDetails.description}

1) Немедленные действия
- ${severityDetails.recommendations.join("\n- ")}

2) Дополнительные анализы
- Общий анализ крови и CRP
- Пульсоксиметрия и контроль SpO2
- Рентген/КТ грудной клетки по назначению врача

3) Лечение
- Антибиотикотерапия по назначению врача
- Симптоматическая терапия (жаропонижающие)
- Контроль эффективности через 48–72 часа

4) Уход и режим
- Отдых, достаточная гидратация
- Ограничение физических нагрузок
- Дыхательная гимнастика по согласованию с врачом

5) График контрольных осмотров
08:00 — Осмотр врача
12:00 — Контроль температуры и сатурации
15:00 — Лабораторные анализы (по плану)
19:00 — Коррекция терапии по результатам
23:00 — Отдых, ночной мониторинг

Окончательное решение принимает лечащий врач.`
        : `Диагноз: Норма
Уверенность модели: ${confidence.toFixed(1)}%

1) Немедленные действия
- Не требуются

2) Дополнительные анализы
- При появлении лихорадки, кашля, одышки — обратиться к врачу
- По рекомендациям врача — ОАК, рентген/КТ

3) Лечение
- Не требуется при отсутствии симптомов

4) Уход и режим
- Физическая активность по самочувствию
- Гидратация, отказ от курения
- Проветривание, влажная уборка

5) График контрольных осмотров
08:00 — Утренняя самопроверка самочувствия
12:00 — Короткая прогулка/дыхательная разминка
15:00 — Гидратация, отдых
19:00 — Легкая физическая нагрузка
23:00 — Подготовка ко сну

Окончательное решение принимает лечащий врач.`;

    return backup;
  }
}
