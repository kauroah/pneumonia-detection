"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LogOut, Activity, Loader2, User, ArrowLeft, Search, Calendar, FileText } from "lucide-react"
import type { Analysis } from "@/lib/db-types"

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUserAndHistory()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAnalyses(analyses)
    } else {
      const filtered = analyses.filter((analysis) =>
        analysis.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredAnalyses(filtered)
    }
  }, [searchQuery, analyses])

  const fetchUserAndHistory = async () => {
    try {
      const userResponse = await fetch("/api/auth/me")
      if (!userResponse.ok) {
        setAuthError(true)
        return
      }

      const userData = await userResponse.json()
      setUser(userData.user)

      const historyResponse = await fetch("/api/history")
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setAnalyses(historyData.analyses)
        setFilteredAnalyses(historyData.analyses)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setAuthError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (authError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ошибка аутентификации</CardTitle>
            <CardDescription>Не удалось загрузить данные пользователя</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Вернуться к входу
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">История пациентов</h1>
              <p className="text-xs text-muted-foreground">Все диагнозы и анализы</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              <User className="w-4 h-4 mr-2" />
              Профиль
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Поиск по пациентам</CardTitle>
            <CardDescription>Найдите анализы по имени пациента</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Введите имя пациента..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredAnalyses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Пациенты не найдены" : "История анализов пуста"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAnalyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          {analysis.patient_id ? (
                            <button
                              onClick={() => router.push(`/patients/${analysis.patient_id}`)}
                              className="font-semibold text-lg hover:text-primary transition-colors text-left"
                            >
                              {analysis.patient_name || "Имя не указано"}
                            </button>
                          ) : (
                            <h3 className="font-semibold text-lg">{analysis.patient_name || "Имя не указано"}</h3>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Возраст: {analysis.patient_age || "Не указан"}
                          </p>
                        </div>
                        <Badge
                          variant={analysis.diagnosis === "PNEUMONIA" ? "destructive" : "default"}
                          className="ml-2"
                        >
                          {analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{formatDate(analysis.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Уверенность: </span>
                          <span className="font-medium">{(analysis.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>

                      {analysis.ai_recommendation && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium mb-1">Рекомендации ИИ:</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{analysis.ai_recommendation}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {analysis.image_url && (
                        <img
                          src={analysis.image_url || "/placeholder.svg"}
                          alt="X-ray"
                          className="w-full md:w-32 h-32 object-cover rounded-lg border"
                        />
                      )}
                      {analysis.patient_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/patients/${analysis.patient_id}`)}
                        >
                          Профиль пациента
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {filteredAnalyses.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Всего анализов: {filteredAnalyses.length}
          </div>
        )}
      </main>
    </div>
  )
}
