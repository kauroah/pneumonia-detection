"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { translations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/image-upload"
import { AnalysisResultCard } from "@/components/analysis-result"
import { AIChat } from "@/components/ai-chat"
import { LogOut, Activity, Loader2, User, Users } from "lucide-react"
import type { AnalysisResult } from "@/lib/db-types"

export default function DashboardPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [patientName, setPatientName] = useState("")
  const [patientAge, setPatientAge] = useState("")
  const [patientId, setPatientId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchUser()
    const patientIdParam = searchParams.get("patientId")
    if (patientIdParam) {
      setPatientId(patientIdParam)
      fetchPatientData(patientIdParam)
    }
  }, [searchParams])

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me")

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setAuthError(true)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
      setAuthError(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatientData = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPatientName(data.patient.name)
        setPatientAge(data.patient.age?.toString() || "")
      }
    } catch (error) {
      console.error("Failed to fetch patient data:", error)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const handleAnalyze = async () => {
    if (!selectedImage) return

    setAnalyzing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("image", selectedImage)
      formData.append("patientName", patientName || "")
      formData.append("patientAge", patientAge || "")
      if (patientId) {
        formData.append("patientId", patientId)
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Analysis failed")

      const analysisResult = await response.json()
      setResult(analysisResult)
    } catch (error) {
      console.error("Analysis error:", error)
      alert("Ошибка при анализе изображения")
    } finally {
      setAnalyzing(false)
    }
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
              <h1 className="text-xl font-bold">Диагностика пневмонии</h1>
              <p className="text-xs text-muted-foreground">Система анализа рентгеновских снимков</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/patients")}>
              <Users className="w-4 h-4 mr-2" />
              Пациенты
            </Button>
            <Button variant="outline" onClick={() => router.push("/history")}>
              <Activity className="w-4 h-4 mr-2" />
              История
            </Button>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              <User className="w-4 h-4 mr-2" />
              Профиль
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {translations.logout}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{translations.newAnalysis}</CardTitle>
              <CardDescription>
                {patientId
                  ? "Анализ для выбранного пациента"
                  : "Загрузите рентгеновский снимок грудной клетки для анализа"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {patientId && patientName && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Пациент: {patientName}</p>
                    {patientAge && <p className="text-xs text-muted-foreground">Возраст: {patientAge} лет</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPatientId(null)
                      setPatientName("")
                      setPatientAge("")
                      router.push("/dashboard")
                    }}
                  >
                    Изменить
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="patientName">{translations.patientName}</Label>
                <Input
                  id="patientName"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Иван Петров"
                  disabled={!!patientId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientAge">{translations.patientAge}</Label>
                <Input
                  id="patientAge"
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="45"
                  disabled={!!patientId}
                />
              </div>

              <div className="space-y-2">
                <Label>{translations.uploadImage}</Label>
                <ImageUpload
                  onImageSelect={setSelectedImage}
                  selectedImage={selectedImage}
                  onClear={() => setSelectedImage(null)}
                />
              </div>

              <Button onClick={handleAnalyze} disabled={!selectedImage || analyzing} className="w-full h-11">
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {translations.analyzing}
                  </>
                ) : (
                  translations.analyze
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {result && (
              <>
                <AnalysisResultCard
                  result={result}
                  patientName={patientName}
                  patientAge={patientAge}
                  doctorName={user.full_name}
                />
                <AIChat result={result} />
              </>
            )}

            {!result && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Результаты анализа появятся здесь после обработки изображения
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
