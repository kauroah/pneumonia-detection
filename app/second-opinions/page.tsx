"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, UserCheck, Clock, CheckCircle, XCircle } from "lucide-react"
import type { SecondOpinion, Analysis, User } from "@/lib/db-types"
import { getSeverityBadgeText, getSeverityColor } from "@/lib/severity-classifier"

export default function SecondOpinionsPage() {
  const [opinions, setOpinions] = useState<
    (SecondOpinion & { analysis?: Analysis; requesting_doctor?: User; reviewing_doctor?: User })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [userRes, opinionsRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/second-opinions")])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData.user)
      }

      if (opinionsRes.ok) {
        const data = await opinionsRes.json()

        // Fetch related data for each opinion
        const enrichedOpinions = await Promise.all(
          data.opinions.map(async (opinion: SecondOpinion) => {
            const [analysisRes, requestingDoctorRes, reviewingDoctorRes] = await Promise.all([
              fetch(`/api/analyses/${opinion.analysis_id}`),
              fetch(`/api/users/${opinion.requesting_doctor_id}`),
              opinion.reviewing_doctor_id ? fetch(`/api/users/${opinion.reviewing_doctor_id}`) : Promise.resolve(null),
            ])

            const analysis = analysisRes.ok ? (await analysisRes.json()).analysis : null
            const requestingDoctor = requestingDoctorRes.ok ? (await requestingDoctorRes.json()).user : null
            const reviewingDoctor =
              reviewingDoctorRes && reviewingDoctorRes.ok ? (await reviewingDoctorRes.json()).user : null

            return {
              ...opinion,
              analysis,
              requesting_doctor: requestingDoctor,
              reviewing_doctor: reviewingDoctor,
            }
          }),
        )

        setOpinions(enrichedOpinions)
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

  const requestedOpinions = opinions.filter((o) => o.requesting_doctor_id === user?.id)
  const reviewOpinions = opinions.filter((o) => o.reviewing_doctor_id === user?.id || !o.reviewing_doctor_id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Второе мнение</h1>
            <p className="text-xs text-muted-foreground">Запросы на консультацию коллег</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="requested" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="requested">Мои запросы ({requestedOpinions.length})</TabsTrigger>
            <TabsTrigger value="review">Для рассмотрения ({reviewOpinions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="requested" className="space-y-4">
            {requestedOpinions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Вы еще не запрашивали второе мнение</p>
                </CardContent>
              </Card>
            ) : (
              requestedOpinions.map((opinion) => (
                <Card key={opinion.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          Пациент: {opinion.analysis?.patient_name || "Не указано"}
                        </CardTitle>
                        <CardDescription className="mt-1">Запрошено: {formatDate(opinion.created_at)}</CardDescription>
                      </div>
                      {getStatusBadge(opinion.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {opinion.analysis && (
                      <div className="flex gap-4">
                        <img
                          src={opinion.analysis.image_url || "/placeholder.svg"}
                          alt="X-ray"
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Первичный диагноз:</span>
                            <Badge variant={opinion.analysis.diagnosis === "PNEUMONIA" ? "destructive" : "default"}>
                              {opinion.analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}
                            </Badge>
                            {opinion.analysis.severity && (
                              <Badge variant={getSeverityColor(opinion.analysis.severity) as any}>
                                {getSeverityBadgeText(opinion.analysis.severity)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Уверенность: {(opinion.analysis.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {opinion.request_notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Примечания к запросу:</p>
                        <p className="text-sm text-muted-foreground">{opinion.request_notes}</p>
                      </div>
                    )}

                    {opinion.status === "completed" && opinion.review_notes && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Заключение коллеги:</p>
                        <div className="space-y-2">
                          {opinion.review_diagnosis && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Диагноз:</span>
                              <Badge>{opinion.review_diagnosis}</Badge>
                              {opinion.review_severity && (
                                <Badge variant={getSeverityColor(opinion.review_severity as any) as any}>
                                  {getSeverityBadgeText(opinion.review_severity as any)}
                                </Badge>
                              )}
                            </div>
                          )}
                          {opinion.review_confidence && (
                            <p className="text-sm">Уверенность: {opinion.review_confidence.toFixed(1)}%</p>
                          )}
                          <p className="text-sm text-muted-foreground">{opinion.review_notes}</p>
                        </div>
                      </div>
                    )}

                    <Button variant="outline" size="sm" onClick={() => router.push(`/second-opinions/${opinion.id}`)}>
                      Подробнее
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            {reviewOpinions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Нет запросов на рассмотрение</p>
                </CardContent>
              </Card>
            ) : (
              reviewOpinions.map((opinion) => (
                <Card key={opinion.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          Пациент: {opinion.analysis?.patient_name || "Не указано"}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          От: {opinion.requesting_doctor?.full_name || "Неизвестно"}
                        </CardDescription>
                        <CardDescription>Запрошено: {formatDate(opinion.created_at)}</CardDescription>
                      </div>
                      {getStatusBadge(opinion.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {opinion.analysis && (
                      <div className="flex gap-4">
                        <img
                          src={opinion.analysis.image_url || "/placeholder.svg"}
                          alt="X-ray"
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Первичный диагноз:</span>
                            <Badge variant={opinion.analysis.diagnosis === "PNEUMONIA" ? "destructive" : "default"}>
                              {opinion.analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}
                            </Badge>
                            {opinion.analysis.severity && (
                              <Badge variant={getSeverityColor(opinion.analysis.severity) as any}>
                                {getSeverityBadgeText(opinion.analysis.severity)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Уверенность: {(opinion.analysis.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {opinion.request_notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Примечания к запросу:</p>
                        <p className="text-sm text-muted-foreground">{opinion.request_notes}</p>
                      </div>
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push(`/second-opinions/${opinion.id}/review`)}
                      disabled={opinion.status === "completed" || opinion.status === "declined"}
                    >
                      {opinion.status === "completed" ? "Просмотрено" : "Рассмотреть"}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
