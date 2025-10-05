"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus, Calendar, Phone, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/db-types"

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async (search?: string) => {
    try {
      const url = search ? `/api/patients?search=${encodeURIComponent(search)}` : "/api/patients"
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setPatients(data.patients)
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.length > 2 || value.length === 0) {
      fetchPatients(value)
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
          <p className="text-muted-foreground">Загрузка пациентов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Пациенты</h1>
            <p className="text-muted-foreground">Управление записями пациентов</p>
          </div>
          <Button onClick={() => router.push("/patients/new")}>
            <UserPlus className="w-4 h-4 mr-2" />
            Новый пациент
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени пациента..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {patients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Пациенты не найдены" : "У вас пока нет пациентов"}
              </p>
              <Button onClick={() => router.push("/patients/new")}>
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить первого пациента
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient) => (
              <Card
                key={patient.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/patients/${patient.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{patient.name}</span>
                    {patient.age && <Badge variant="secondary">{patient.age} лет</Badge>}
                  </CardTitle>
                  <CardDescription>{getGenderLabel(patient.gender)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Добавлен {new Date(patient.created_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
