import jsPDF from "jspdf"

interface ReportData {
  diagnosis: string
  confidence: number
  severity?: "mild" | "moderate" | "severe" | null
  recommendation: string
  patientName: string
  patientAge: string
  doctorName: string
  date: string
  imageUrl?: string
  secondOpinion?: {
    reviewerName: string
    reviewerDiagnosis: string
    reviewerConfidence: number
    reviewNotes: string
    reviewDate: string
  } | null
}

export async function generatePDFReport(data: ReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  // Try to load Cyrillic-capable font; gracefully fall back to default
  try {
    const fontBuf = await fetch("/fonts/Roboto-Regular.ttf").then((r) => {
      if (!r.ok) throw new Error("Font fetch failed")
      return r.arrayBuffer()
    })
    const fontBase64 = arrayBufferToBase64(fontBuf)
    doc.addFileToVFS("Roboto-Regular.ttf", fontBase64)
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
    doc.setFont("Roboto")
  } catch {
    // fallback to built-in
    doc.setFont("helvetica", "normal")
  }

  // Header
  doc.setFontSize(20)
  doc.setTextColor(41, 128, 185)
  doc.text("МЕДИЦИНСКИЙ ОТЧЕТ", 105, 20, { align: "center" })

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text("Система диагностики пневмонии", 105, 28, { align: "center" })

  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(0.5)
  doc.line(20, 35, 190, 35)

  // Patient info
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text("Информация о пациенте", 20, 45)

  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text(`Имя пациента: ${data.patientName}`, 20, 55)
  doc.text(`Возраст: ${data.patientAge}`, 20, 62)
  doc.text(`Дата обследования: ${data.date}`, 20, 69)
  doc.text(`Врач: ${data.doctorName}`, 20, 76)

  // Optional image preview (scaled to fit a box)
  let yPosition = 90
  if (data.imageUrl) {
    try {
      const { base64, type } = await fetchAsBase64(data.imageUrl)
      // draw within a 60mm tall box at (140, 45)
      // keep aspect ratio by limiting width/height
      const imgW = 50
      const imgH = 60
      doc.addImage(base64, type, 140, 45, imgW, imgH)
    } catch {
      // ignore image errors
    }
  }

  // Diagnosis section
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text("Результаты диагностики", 20, yPosition)

  const isPneumonia = data.diagnosis === "PNEUMONIA"
  yPosition += 5

  if (isPneumonia) {
    doc.setFillColor(220, 53, 69) // red
  } else {
    doc.setFillColor(40, 167, 69) // green
  }
  doc.roundedRect(20, yPosition, 170, 20, 3, 3, "F")

  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(isPneumonia ? "ПНЕВМОНИЯ ОБНАРУЖЕНА" : "ПНЕВМОНИЯ НЕ ОБНАРУЖЕНА", 105, yPosition + 10, { align: "center" })

  doc.setFontSize(12)
  doc.text(`Уверенность: ${data.confidence.toFixed(1)}%`, 105, yPosition + 17, { align: "center" })

  yPosition += 30

  if (isPneumonia && data.severity) {
    const severityText =
      data.severity === "severe" ? "Тяжелая" : data.severity === "moderate" ? "Средняя" : "Легкая"
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Степень тяжести: ${severityText}`, 20, yPosition)
    yPosition += 10
  }

  // Recommendations
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text("Рекомендации", 20, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)

  const lines = doc.splitTextToSize(data.recommendation ?? "", 170)
  for (const line of lines) {
    ({ yPosition } = ensurePageBreak(doc, yPosition, 270))
    doc.text(line, 20, yPosition)
    yPosition += 6
  }

  // Second opinion (optional)
  if (data.secondOpinion) {
    yPosition += 10
    ;({ yPosition } = ensurePageBreak(doc, yPosition, 250))

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text("Второе мнение", 20, yPosition)
    yPosition += 8

    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(0.3)
    doc.rect(20, yPosition, 170, 50)

    yPosition += 8
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)

    const so = data.secondOpinion
    doc.text(`Врач-рецензент: ${so.reviewerName}`, 25, yPosition); yPosition += 7
    doc.text(`Дата проверки: ${so.reviewDate}`, 25, yPosition); yPosition += 7
    doc.text(`Диагноз: ${so.reviewerDiagnosis}`, 25, yPosition); yPosition += 7

    const rc = Number.isFinite(so.reviewerConfidence) ? so.reviewerConfidence : 0
    doc.text(`Уверенность: ${rc.toFixed(1)}%`, 25, yPosition); yPosition += 7

    if (so.reviewNotes) {
      doc.text("Примечания:", 25, yPosition)
      yPosition += 5
      const notesLines = doc.splitTextToSize(so.reviewNotes, 160)
      for (const line of notesLines) {
        ({ yPosition } = ensurePageBreak(doc, yPosition, 270, true))
        doc.text(line, 25, yPosition)
        yPosition += 5
      }
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(
      "Этот отчет создан автоматически системой ИИ-диагностики. Требуется подтверждение врача.",
      105,
      285,
      { align: "center" }
    )
    doc.text(`Страница ${i} из ${pageCount}`, 105, 290, { align: "center" })
  }

  const fileName = `Отчет_${data.patientName.replace(/\s+/g, "_")}_${Date.now()}.pdf`
  doc.save(fileName)
}

/* ---------- helpers ---------- */

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buf)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/**
 * Fetch remote image URL and return base64 + format for jsPDF.addImage.
 * Falls back to 'JPEG' if we can't guess the type.
 */
async function fetchAsBase64(url: string): Promise<{ base64: string; type: "PNG" | "JPEG" }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Image fetch failed")

  const contentType = res.headers.get("content-type") || ""
  const buf = await res.arrayBuffer()
  const b64 = arrayBufferToBase64(buf)

  // Deduce jsPDF image type
  if (contentType.includes("png")) return { base64: `data:image/png;base64,${b64}`, type: "PNG" }
  return { base64: `data:image/jpeg;base64,${b64}`, type: "JPEG" }
}

/** Add a new page if y exceeds limit; return updated y. */
function ensurePageBreak(doc: jsPDF, y: number, limit: number, smallGap = false) {
  if (y > limit) {
    doc.addPage()
    y = smallGap ? 20 : 20
  }
  return { yPosition: y }
}
