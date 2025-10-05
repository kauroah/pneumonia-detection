"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { translations } from "@/lib/translations"
import { AlertCircle, CheckCircle2, Activity, Download } from "lucide-react"
import type { AnalysisResult } from "@/lib/db-types"
import { generatePDFReport } from "@/lib/pdf-generator"

interface AnalysisResultProps {
  result: AnalysisResult
  patientName?: string
  patientAge?: string
  doctorName?: string
}

export function AnalysisResultCard({ result, patientName, patientAge, doctorName }: AnalysisResultProps) {
  const isPneumonia = result.diagnosis === "PNEUMONIA"

  const handleExportPDF = async () => {
    try {
      await generatePDFReport({
        diagnosis: result.diagnosis,
        confidence: result.confidence,
        recommendation: result.recommendation || "",
        patientName: patientName || "Не указано",
        patientAge: patientAge || "Не указано",
        doctorName: doctorName || "Не указано",
        date: new Date().toLocaleDateString("ru-RU"),
        imageUrl: result.imageUrl,
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Ошибка при создании отчета")
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {translations.diagnosis}
          </div>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Экспорт PDF
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {isPneumonia ? (
              <AlertCircle className="w-6 h-6 text-destructive" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            )}
            <div>
              <p className="font-semibold text-lg">
                {isPneumonia ? translations.pneumoniaDetected : translations.noPneumonia}
              </p>
              <p className="text-sm text-muted-foreground">
                {translations.confidence}: {result.confidence.toFixed(1)}%
              </p>
            </div>
          </div>
          <Badge variant={isPneumonia ? "destructive" : "secondary"} className="text-sm px-3 py-1">
            {result.diagnosis}
          </Badge>
        </div>

        {result.recommendation && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{translations.recommendation}</h4>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg max-h-[400px] overflow-y-auto">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{result.recommendation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
