"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { translations } from "@/lib/translations"
import { AlertCircle, CheckCircle2, Activity, Download, AlertTriangle, UserPlus, Loader2 } from "lucide-react"
import type { AnalysisResult } from "@/lib/db-types"
import { generatePDFReport } from "@/lib/pdf-generator"
import { getSeverityBadgeText, getSeverityColor } from "@/lib/severity-classifier"

interface AnalysisResultProps {
  result: AnalysisResult
  patientName?: string
  patientAge?: string
  doctorName?: string
}

export function AnalysisResultCard({ result, patientName, patientAge, doctorName }: AnalysisResultProps) {
  const isPneumonia = result.diagnosis === "PNEUMONIA"
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleExportPDF = async () => {
    try {
      // Fetch second opinion if analysis has one
      let secondOpinionData = null
      if (result.id) {
        try {
          const response = await fetch(`/api/second-opinions?analysisId=${result.id}`)
          if (response.ok) {
            const data = await response.json()
            const completedOpinion = data.opinions?.find((op: any) => op.status === "completed")
            if (completedOpinion) {
              secondOpinionData = {
                reviewerName: completedOpinion.reviewing_doctor?.full_name || "Не указано",
                reviewerDiagnosis: completedOpinion.review_diagnosis || "Не указано",
                reviewerConfidence: completedOpinion.review_confidence || 0,
                reviewNotes: completedOpinion.review_notes || "",
                reviewDate: new Date(completedOpinion.updated_at).toLocaleDateString("ru-RU"),
              }
            }
          }
        } catch (error) {
          console.error("Error fetching second opinion:", error)
        }
      }

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

  const handleDialogOpen = async (open: boolean) => {
    setIsDialogOpen(open)
    if (open && doctors.length === 0) {
      setLoadingDoctors(true)
      try {
        const response = await fetch("/api/doctors")
        if (response.ok) {
          const data = await response.json()
          setDoctors(data.doctors || [])
        }
      } catch (error) {
        console.error("Error loading doctors:", error)
      } finally {
        setLoadingDoctors(false)
      }
    }
  }

  const handleRequestSecondOpinion = async () => {
    if (!result.id) {
      alert("Ошибка: ID анализа не найден")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/second-opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: result.id,
          reviewingDoctorId: selectedDoctor || null,
          requestNotes: requestNotes || null,
        }),
      })

      if (response.ok) {
        alert("Запрос на консультацию отправлен успешно!")
        setIsDialogOpen(false)
        setSelectedDoctor("")
        setRequestNotes("")
      } else {
        alert("Ошибка при отправке запроса")
      }
    } catch (error) {
      console.error("Error requesting second opinion:", error)
      alert("Ошибка при отправке запроса")
    } finally {
      setSubmitting(false)
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
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Консультация
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Запросить консультацию</DialogTitle>
                  <DialogDescription>
                    Отправьте этот анализ другому врачу для получения консультации
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Выберите врача (необязательно)</Label>
                    {loadingDoctors ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : (
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger id="doctor">
                          <SelectValue placeholder="Любой доступный врач" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.full_name} ({doctor.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Примечания (необязательно)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Добавьте любые дополнительные заметки или вопросы..."
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                    Отмена
                  </Button>
                  <Button onClick={handleRequestSecondOpinion} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      "Отправить запрос"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleExportPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Экспорт PDF
            </Button>
          </div>
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
          <div className="flex flex-col gap-2 items-end">
            <Badge variant={isPneumonia ? "destructive" : "secondary"} className="text-sm px-3 py-1">
              {result.diagnosis}
            </Badge>
            {isPneumonia && result.severity && (
              <Badge variant={getSeverityColor(result.severity) as any} className="text-sm px-3 py-1">
                {getSeverityBadgeText(result.severity)}
              </Badge>
            )}
          </div>
        </div>

        {isPneumonia && result.severityDetails && (
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-5 h-5 ${
                  result.severityDetails.urgency === "high"
                    ? "text-destructive"
                    : result.severityDetails.urgency === "medium"
                      ? "text-orange-500"
                      : "text-yellow-500"
                }`}
              />
              <h4 className="font-semibold">Степень тяжести: {result.severityDetails.description}</h4>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Рекомендации по лечению:</p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                {result.severityDetails.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

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
