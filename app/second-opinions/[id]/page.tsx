"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Loader2, UserCheck, Clock, CheckCircle, XCircle, Calendar, User, FileText } from "lucide-react"
import type { SecondOpinion, Analysis, User as UserType } from "@/lib/db-types"
import { generatePDFReport } from "@/lib/pdf-generator"
import { getSeverityBadgeText, getSeverityColor } from "@/lib/severity-classifier"

interface SecondOpinionDetailPageProps {
  params: { id: string }
}

export default function SecondOpinionDetailPage({ params }: SecondOpinionDetailPageProps) {
  const [opinion, setOpinion] = useState<SecondOpinion | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [requestingDoctor, setRequestingDoctor] = useState<UserType | null>(null)
  const [reviewingDoctor, setReviewingDoctor] = useState<UserType | null>(null)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      const [userRes, opinionRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/second-opinions/${params.id}`),
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setCurrentUser(userData.user)
      }

      if (opinionRes.ok) {
        const opinionData = await opinionRes.json()
        setOpinion(opinionData.secondOpinion)

        // Fetch related data
        const [analysisRes, requestingDoctorRes, reviewingDoctorRes] = await Promise.all([
          fetch(`/api/analyses/${opinionData.secondOpinion.analysis_id}`),
          fetch(`/api/users/${opinionData.secondOpinion.requesting_doctor_id}`),
          opinionData.secondOpinion.reviewing_doctor_id
            ? fetch(`/api/users/${opinionData.secondOpinion.reviewing_doctor_id}`)
            : Promise.resolve(null),
        ])

        if (analysisRes.ok) {
          const analysisData = await analysisRes.json()
          setAnalysis(analysisData.analysis)
        }

        if (requestingDoctorRes.ok) {
          const doctorData = await requestingDoctorRes.json()
          setRequestingDoctor(doctorData.user)
        }

        if (reviewingDoctorRes && reviewingDoctorRes.ok) {
          const doctorData = await reviewingDoctorRes.json()
          setReviewingDoctor(doctorData.user)
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Ожидает" },
      in_review: { variant: "default", icon: UserCheck, label: "На рассмотрении" },
      completed: { variant: "default", icon: CheckCircle, label: "Завершено" },
      declined: { variant: "destructive", icon: XCircle, label: "Отклонено" },
    }

    const config = variants[status] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const handleExportPDF = async () => {
    if (!opinion || !analysis || !currentUser) return

    setExporting(true)
    try {
      const diagnosisText = analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"
      const severityText = analysis.severity
        ? analysis.severity === "severe"
          ? "Тяжелая"
          : analysis.severity === "moderate"
            ? "Средняя"
            : "Легкая"
        : ""

      const reviewDiagnosisText = opinion.review_diagnosis || "Не указано"
      const reviewSeverityText = opinion.review_severity
        ? opinion.review_severity === "severe"
          ? "Тяжелая"
          : opinion.review_severity === "moderate"
            ? "Средняя"
            : "Легкая"
        : ""

      await generatePDFReport({
        diagnosis: diagnosisText,
        confidence: analysis.confidence * 100,
        severity: severityText,
        recommendation: analysis.ai_recommendation || "Рекомендации не доступны",
        patientName: analysis.patient_name,
        patientAge: analysis.patient_age.toString(),
        doctorName: requestingDoctor?.full_name || "Неизвестно",
        date: new Date(analysis.created_at).toLocaleDateString("ru-RU"),
        imageUrl: analysis.image_url,
        secondOpinion: {
          reviewerName: reviewingDoctor?.full_name || "Неизвестно",
          reviewerDiagnosis: `${reviewDiagnosisText}${reviewSeverityText ? ` (${reviewSeverityText})` : ""}`,
          reviewerConfidence: opinion.review_confidence || 0,
          reviewNotes: opinion.review_notes || "",
          reviewDate: opinion.reviewed_at ? new Date(opinion.reviewed_at).toLocaleDateString("ru-RU") : "",
        },
      })
    } catch (error) {
      console.error("Failed to export PDF:", error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!opinion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Запрос не найден</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isRequester = currentUser?.id === opinion.requesting_doctor_id
  const isReviewer = currentUser?.id === opinion.reviewing_doctor_id || !opinion.reviewing_doctor_id

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Детали запроса</h1>
            <p className="text-xs text-muted-foreground">Консультация</p>
          </div>
          <div className="flex gap-2">
            {opinion.status === "completed" && (
              <Button variant="default" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Экспорт...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Экспорт отчета
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push("/second-opinions")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Статус запроса</CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Создано: {formatDate(opinion.created_at)}
                  </CardDescription>
                </div>
                {getStatusBadge(opinion.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Запросил
                  </p>
                  <p className="text-sm text-muted-foreground">{requestingDoctor?.full_name || "Неизвестно"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Рассматривает
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {reviewingDoctor?.full_name || "Любой доступный врач"}
                  </p>
                </div>
              </div>

              {opinion.request_notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Примечания к запросу:</p>
                    <p className="text-sm text-muted-foreground">{opinion.request_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Original Analysis */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Первичный анализ</CardTitle>
                <CardDescription>Пациент: {analysis.patient_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-6">
                  <img
                    src={analysis.image_url || "/placeholder.svg"}
                    alt="X-ray"
                    className="w-48 h-48 object-cover rounded-lg border"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Диагноз:</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={analysis.diagnosis === "PNEUMONIA" ? "destructive" : "default"}>
                          {analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}
                        </Badge>
                        {analysis.severity && (
                          <Badge variant={getSeverityColor(analysis.severity) as any}>
                            {getSeverityBadgeText(analysis.severity)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Уверенность:</p>
                      <p className="text-sm text-muted-foreground">{(analysis.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Дата анализа:</p>
                      <p className="text-sm text-muted-foreground">{formatDate(analysis.created_at)}</p>
                    </div>
                  </div>
                </div>

                {analysis.ai_recommendation && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Рекомендации ИИ:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.ai_recommendation}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Results */}
          {opinion.status === "completed" && opinion.review_notes && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Заключение коллеги
                </CardTitle>
                <CardDescription>
                  {opinion.reviewed_at && `Завершено: ${formatDate(opinion.reviewed_at)}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {opinion.review_diagnosis && (
                  <div>
                    <p className="text-sm font-medium mb-2">Диагноз:</p>
                    <div className="flex items-center gap-2">
                      <Badge>{opinion.review_diagnosis}</Badge>
                      {opinion.review_severity && (
                        <Badge variant={getSeverityColor(opinion.review_severity as any) as any}>
                          {getSeverityBadgeText(opinion.review_severity as any)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {opinion.review_confidence && (
                  <div>
                    <p className="text-sm font-medium">Уверенность:</p>
                    <p className="text-sm text-muted-foreground">{opinion.review_confidence.toFixed(1)}%</p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Примечания:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{opinion.review_notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Declined */}
          {opinion.status === "declined" && opinion.review_notes && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Запрос отклонен
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{opinion.review_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {opinion.status === "pending" && isReviewer && (
            <Card>
              <CardContent className="pt-6">
                <Button className="w-full" onClick={() => router.push(`/second-opinions/${opinion.id}/review`)}>
                  Рассмотреть запрос
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
