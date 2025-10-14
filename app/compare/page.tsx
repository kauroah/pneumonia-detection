"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { Analysis } from "@/lib/db-types"
import { getSeverityBadgeText, getSeverityColor } from "@/lib/severity-classifier"

export default function ComparePage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",") || []
    if (ids.length === 0) {
      router.push("/history")
      return
    }
    fetchAnalyses(ids)
  }, [searchParams])

  const fetchAnalyses = async (ids: string[]) => {
    try {
      const promises = ids.map((id) => fetch(`/api/analyses/${id}`).then((res) => res.json()))
      const results = await Promise.all(promises)
      setAnalyses(results.map((r) => r.analysis).filter(Boolean))
    } catch (error) {
      console.error("Failed to fetch analyses:", error)
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

  const getComparisonIcon = (index: number) => {
    if (index === 0 || analyses.length < 2) return null

    const current = analyses[index].confidence
    const previous = analyses[index - 1].confidence

    if (current > previous) {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else if (current < previous) {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Анализы не найдены</CardTitle>
            <CardDescription>Выбранные анализы не найдены в системе</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/history")} className="w-full">
              Вернуться к истории
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Сравнение анализов</h1>
            <p className="text-xs text-muted-foreground">Сравнение {analyses.length} снимков</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/history")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к истории
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Patient Info */}
        {analyses[0]?.patient_name && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Информация о пациенте</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Имя пациента</p>
                  <p className="font-medium">{analyses[0].patient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Возраст</p>
                  <p className="font-medium">{analyses[0].patient_age || "Не указан"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((analysis, index) => (
            <Card key={analysis.id} className="relative">
              <div className="absolute top-4 right-4 z-10">
                <Badge variant="outline" className="bg-background">
                  Анализ #{index + 1}
                </Badge>
              </div>

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(analysis.created_at)}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* X-ray Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={analysis.image_url || "/placeholder.svg"}
                    alt={`X-ray ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Diagnosis */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Диагноз:</span>
                    <Badge variant={analysis.diagnosis === "PNEUMONIA" ? "destructive" : "default"}>
                      {analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}
                    </Badge>
                  </div>

                  {analysis.diagnosis === "PNEUMONIA" && analysis.severity && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Тяжесть:</span>
                      <Badge variant={getSeverityColor(analysis.severity) as any}>
                        {getSeverityBadgeText(analysis.severity)}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Уверенность:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{(analysis.confidence * 100).toFixed(1)}%</span>
                      {getComparisonIcon(index)}
                    </div>
                  </div>
                </div>

                {/* AI Recommendation */}
                {analysis.ai_recommendation && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Рекомендации ИИ:</p>
                    <p className="text-sm text-muted-foreground line-clamp-4">{analysis.ai_recommendation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Summary */}
        {analyses.length >= 2 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Сводка сравнения</CardTitle>
              <CardDescription>Анализ изменений между снимками</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Первый анализ</p>
                    <p className="font-medium">{formatDate(analyses[0].created_at)}</p>
                    <p className="text-sm">
                      {analyses[0].diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"} (
                      {(analyses[0].confidence * 100).toFixed(1)}%)
                    </p>
                    {analyses[0].severity && (
                      <p className="text-sm text-muted-foreground">
                        Тяжесть: {getSeverityBadgeText(analyses[0].severity)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Последний анализ</p>
                    <p className="font-medium">{formatDate(analyses[analyses.length - 1].created_at)}</p>
                    <p className="text-sm">
                      {analyses[analyses.length - 1].diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"} (
                      {(analyses[analyses.length - 1].confidence * 100).toFixed(1)}%)
                    </p>
                    {analyses[analyses.length - 1].severity && (
                      <p className="text-sm text-muted-foreground">
                        Тяжесть: {getSeverityBadgeText(analyses[analyses.length - 1].severity)}
                      </p>
                    )}
                  </div>
                </div>

                {analyses[0].diagnosis !== analyses[analyses.length - 1].diagnosis && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium">
                      {analyses[0].diagnosis === "PNEUMONIA"
                        ? "Состояние улучшилось: от пневмонии к норме"
                        : "Обнаружена пневмония в последнем анализе"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
