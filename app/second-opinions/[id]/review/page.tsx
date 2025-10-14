"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"

interface SecondOpinion {
  id: string
  analysis_id: string
  requesting_doctor_id: string
  reviewing_doctor_id: string | null
  status: string
  notes: string | null
  review_notes: string | null
  review_diagnosis: string | null
  review_confidence: number | null
  created_at: string
  updated_at: string
}

interface Analysis {
  id: string
  patient_name: string
  patient_age: number
  diagnosis: string
  confidence: number
  severity: string | null
  image_url: string
  ai_recommendation: string
  created_at: string
}

interface User {
  id: string
  email: string
  full_name: string
}

export default function ReviewSecondOpinionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [secondOpinion, setSecondOpinion] = useState<SecondOpinion | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [requestingDoctor, setRequestingDoctor] = useState<User | null>(null)
  const [reviewDiagnosis, setReviewDiagnosis] = useState("")
  const [reviewConfidence, setReviewConfidence] = useState("")
  const [reviewNotes, setReviewNotes] = useState("")

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch second opinion
      const opinionRes = await fetch(`/api/second-opinions/${params.id}`)
      if (!opinionRes.ok) throw new Error("Failed to fetch second opinion")
      const opinionData = await opinionRes.json()
      setSecondOpinion(opinionData.secondOpinion)

      // Fetch analysis
      const analysisRes = await fetch(`/api/analyses/${opinionData.secondOpinion.analysis_id}`)
      if (!analysisRes.ok) throw new Error("Failed to fetch analysis")
      const analysisData = await analysisRes.json()
      setAnalysis(analysisData.analysis)

      // Fetch requesting doctor
      const doctorRes = await fetch(`/api/users/${opinionData.secondOpinion.requesting_doctor_id}`)
      if (!doctorRes.ok) throw new Error("Failed to fetch doctor")
      const doctorData = await doctorRes.json()
      setRequestingDoctor(doctorData.user)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (action: "complete" | "decline") => {
    if (action === "complete" && (!reviewDiagnosis || !reviewConfidence || !reviewNotes)) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/second-opinions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "complete" ? "completed" : "declined",
          review_diagnosis: action === "complete" ? reviewDiagnosis : null,
          review_confidence: action === "complete" ? Number.parseFloat(reviewConfidence) : null,
          review_notes: action === "complete" ? reviewNotes : "Отклонено",
        }),
      })

      if (!response.ok) throw new Error("Failed to submit review")

      toast({
        title: "Успешно",
        description: action === "complete" ? "Второе мнение отправлено" : "Запрос отклонен",
      })

      router.push("/second-opinions")
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось отправить ответ",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!secondOpinion || !analysis || !requestingDoctor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Ошибка</CardTitle>
            <CardDescription>Запрос не найден</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/second-opinions">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/second-opinions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Проверка второго мнения</h1>
          <p className="text-muted-foreground">
            Запрос от: {requestingDoctor.full_name} ({requestingDoctor.email})
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Original Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Оригинальный анализ</CardTitle>
            <CardDescription>
              Пациент: {analysis.patient_name}, {analysis.patient_age} лет
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
              <Image src={analysis.image_url || "/placeholder.svg"} alt="X-ray" fill className="object-contain" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Диагноз:</span>
                <Badge variant={analysis.diagnosis === "Пневмония" ? "destructive" : "default"}>
                  {analysis.diagnosis}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Уверенность:</span>
                <span className="text-sm">{(analysis.confidence * 100).toFixed(1)}%</span>
              </div>

              {analysis.severity && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Тяжесть:</span>
                  <Badge
                    variant={
                      analysis.severity === "severe"
                        ? "destructive"
                        : analysis.severity === "moderate"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {analysis.severity === "severe"
                      ? "Тяжелая"
                      : analysis.severity === "moderate"
                        ? "Средняя"
                        : "Легкая"}
                  </Badge>
                </div>
              )}
            </div>

            {secondOpinion.notes && (
              <div className="space-y-2">
                <Label>Заметки от врача:</Label>
                <p className="text-sm text-muted-foreground">{secondOpinion.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Рекомендации ИИ:</Label>
              <p className="text-sm text-muted-foreground">{analysis.ai_recommendation}</p>
            </div>
          </CardContent>
        </Card>

        {/* Review Form */}
        <Card>
          <CardHeader>
            <CardTitle>Ваше мнение</CardTitle>
            <CardDescription>Предоставьте свою оценку диагноза</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Ваш диагноз *</Label>
              <Select value={reviewDiagnosis} onValueChange={setReviewDiagnosis}>
                <SelectTrigger id="diagnosis">
                  <SelectValue placeholder="Выберите диагноз" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Норма">Норма</SelectItem>
                  <SelectItem value="Пневмония">Пневмония</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Уверенность (0-1) *</Label>
              <input
                id="confidence"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={reviewConfidence}
                onChange={(e) => setReviewConfidence(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="0.85"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Ваши заметки *</Label>
              <Textarea
                id="notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Опишите ваши наблюдения и обоснование диагноза..."
                rows={6}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleSubmit("complete")} disabled={submitting} className="flex-1">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  "Отправить мнение"
                )}
              </Button>
              <Button onClick={() => handleSubmit("decline")} disabled={submitting} variant="outline">
                Отклонить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
