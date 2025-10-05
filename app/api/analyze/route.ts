export const runtime = "nodejs"; // IMPORTANT: enable Node APIs & native addons
import { type NextRequest, NextResponse } from "next/server"
import { getUserBySession, createAnalysis } from "@/lib/file-storage"
import { runInference, convertPdfToImage } from "@/lib/model-inference"
import { generateText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
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
      "image/jpeg"
    )

    // Путь к модели
   // const modelPath = path.join(process.cwd(), "public", "models", "resnet18.onnx")

    const modelPath = path.join(process.cwd(), "public", "models", "pneumonia_model.onnx")
    // Инференс по ОТКОРРЕКТИРОВАННОМУ буферу (processed)
    const inferenceResult = await runInference(processed, modelPath)

    const recommendation = await generateAIRecommendation(
      inferenceResult.diagnosis,
      inferenceResult.confidence
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

await createAnalysis({
  userId: user.id,
  imageUrl: publicUrl,
  result: inferenceResult.diagnosis,
  confidence: inferenceResult.confidence,
  aiRecommendation: recommendation,
  patientName: patientName || null,
  patientAge: patientAge ? Number.parseInt(patientAge) : undefined,
  imageType: isPdf ? "pdf" : "jpeg",
  patientId: patientId || null,
})

    return NextResponse.json({
      diagnosis: inferenceResult.diagnosis,
      confidence: inferenceResult.confidence,
      recommendation,
      imageUrl: publicUrl,
    })
  } catch (error: any) {
    console.error("Analysis API error:", error)
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 })
  }
}

async function generateAIRecommendation(diagnosis: string, confidence: number): Promise<string> {
  try {
    const prompt =
      diagnosis === "PNEUMONIA"
        ? `Вы медицинский ИИ-ассистент. Создайте подробный план лечения для пациента с диагнозом пневмония (уверенность ${confidence.toFixed(1)}%). 
    
Включите:
1. Рекомендации по немедленным действиям
2. Необходимые дополнительные анализы
3. Варианты лечения
4. Рекомендации по уходу
5. Когда нужен контрольный осмотр

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

    const { text } = await llm().gen({
    prompt,
    maxOutputTokens: 400,
    temperature: 0.5,
  });


    return text
  } catch (error) {
    console.error("AI recommendation error:", error)
    // Fallback to basic recommendation
    return diagnosis === "PNEUMONIA"
      ? `Обнаружены признаки пневмонии с уверенностью ${confidence.toFixed(1)}%. Требуется консультация врача.`
      : `Признаков пневмонии не обнаружено. Продолжайте следить за здоровьем легких.`
  }
}
