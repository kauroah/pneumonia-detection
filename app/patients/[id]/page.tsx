"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, Phone, FileText, Activity, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Patient, Analysis } from "@/lib/db-types"

export default function PatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatientData()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`)
      const data = await response.json()

      if (response.ok) {
        setPatient(data.patient)
        setAnalyses(data.analyses)
      } else {
        alert(data.error || "Ошибка при загрузке данных пациента")
        router.push("/patients")
      }
    } catch (error) {
      console.error("Error fetching patient:", error)
      alert("Ошибка при загрузке данных пациента")
    } finally {
      setLoading(false)
    }
  }

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return "Не указан"
    return gender === "male" ? "Мужской" : gender === "female" ? "Женский" : "Другой"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных пациента...</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <Button variant="ghost" onClick={() => router.push("/patients")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к пациентам
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{patient.name}</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>Информация о пациенте</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => router.push(`/dashboard?patientId=${patientId}`)} className="w-full" size="lg">
                  <Activity className="w-4 h-4 mr-2" />
                  Новый анализ
                </Button>

                {patient.age && (
                  <div>
                    <p className="text-sm text-muted-foreground">Возраст</p>
                    <p className="font-medium">{patient.age} лет</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Пол</p>
                  <p className="font-medium">{getGenderLabel(patient.gender)}</p>
                </div>

                {patient.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Дата добавления</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{new Date(patient.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                </div>

                {patient.medical_history && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Медицинская история</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{patient.medical_history}</p>
                  </div>
                )}

                {patient.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Заметки</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{patient.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  История анализов
                </CardTitle>
                <CardDescription>Все диагностические исследования пациента</CardDescription>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">У этого пациента пока нет анализов</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis) => (
                      <Card key={analysis.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={analysis.diagnosis === "PNEUMONIA" ? "destructive" : "default"}>
                                  {analysis.diagnosis === "PNEUMONIA" ? "Пневмония" : "Норма"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {(analysis.confidence * 100).toFixed(1)}% уверенность
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(analysis.created_at).toLocaleString("ru-RU")}
                              </p>
                            </div>
                            {analysis.image_url && (
                              <img
                                src={analysis.image_url || "/placeholder.svg"}
                                alt="X-ray"
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                            )}
                          </div>

                          {analysis.ai_recommendation && (
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm font-medium mb-1">Рекомендации ИИ:</p>
                              <p className="text-sm text-muted-foreground">{analysis.ai_recommendation}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
