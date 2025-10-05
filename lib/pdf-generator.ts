// lib/pdf-generator.ts
"use client";

import jsPDF from "jspdf";

interface ReportData {
  diagnosis: string;
  confidence: number;
  recommendation: string;
  patientName: string;
  patientAge: string;
  doctorName: string;
  date: string;
  imageUrl?: string;
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchImageAsDataURL(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function generatePDFReport(data: ReportData) {
  // Create doc first
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Load & register a Unicode font (Cyrillic)
  const fontBuf = await fetch("/fonts/Roboto-Regular.ttf").then((r) => r.arrayBuffer());
  const fontBase64 = arrayBufferToBase64(fontBuf);
  doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  // Header
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text("МЕДИЦИНСКИЙ ОТЧЕТ", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("Система диагностики пневмонии", 105, 28, { align: "center" });

  // Separator
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Patient info
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Информация о пациенте", 20, 45);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Имя пациента: ${data.patientName}`, 20, 55);
  doc.text(`Возраст: ${data.patientAge}`, 20, 62);
  doc.text(`Дата обследования: ${data.date}`, 20, 69);
  doc.text(`Врач: ${data.doctorName}`, 20, 76);

  // Embed image (optional)
  if (data.imageUrl) {
    try {
      const imgData = await fetchImageAsDataURL(data.imageUrl);
      // Place a 60x60 mm thumbnail at top-right
      doc.addImage(imgData, "JPEG", 130, 45, 60, 60, undefined, "FAST");
    } catch (e) {
      console.warn("Failed to embed image into PDF:", e);
    }
  }

  // Diagnosis section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Результаты диагностики", 20, 90);

  const isPneumonia = data.diagnosis === "PNEUMONIA";
  doc.setFillColor(isPneumonia ? 220 : 40, isPneumonia ? 53 : 167, isPneumonia ? 69 : 69);
  doc.roundedRect(20, 95, 170, 20, 3, 3, "F");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(isPneumonia ? "ПНЕВМОНИЯ ОБНАРУЖЕНА" : "ПНЕВМОНИЯ НЕ ОБНАРУЖЕНА", 105, 105, { align: "center" });

  doc.setFontSize(12);
  doc.text(`Уверенность: ${data.confidence.toFixed(1)}%`, 105, 112, { align: "center" });

  // Recommendations
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Рекомендации", 20, 130);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(data.recommendation || "", 170);
  let y = 138;
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
      doc.setFont("Roboto");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
    }
    doc.text(line, 20, y);
    y += 6;
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Этот отчет создан автоматически системой ИИ-диагностики. Требуется подтверждение врача.",
      105,
      285,
      { align: "center" }
    );
    doc.text(`Страница ${i} из ${pageCount}`, 105, 290, { align: "center" });
  }

  // Safer ASCII filename
  const safeName = (data.patientName || "patient").replace(/[^\w]+/g, "_");
  const fileName = `Report_${safeName}_${Date.now()}.pdf`;
  doc.save(fileName);
}
