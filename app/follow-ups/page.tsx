"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Clock, Loader2, Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { FollowUp, Patient } from "@/lib/db-types"

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<(FollowUp & { patient?: Patient })[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [followUpsRes, patientsRes] = await Promise.all([fetch("/api/follow-ups"), fetch("/api/patients")])

      if (followUpsRes.ok) {
        const data = await followUpsRes.json()
        const followUpsWithPatients = await Promise.all(
          data.followUps.map(async (fu: FollowUp) => {
            const patientRes = await fetch(`/api/patients/${fu.patient_id}`)
            if (patientRes.ok) {
              const patientData = await patientRes.json()
              return { ...fu, patient: patientData.patient }
            }
            return fu
          }),
        )
        setFollowUps(followUpsWithPatients)
      }

      if (patientsRes.ok) {
        const data = await patientsRes.json()
        setPatients(data.patients)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFollowUp = async () => {
    if (!selectedPatientId || !scheduledDate) {
      alert("Пожалуйста, заполните все обязательные поля")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          scheduledDate,
          notes,
        }),
      })

      if (response.ok) {
        setDialogOpen(false)
        setSelectedPatientId("")
        setScheduledDate("")
        setNotes("")
        fetchData()
      } else {
        alert("Ошибка создания записи")
      }
    } catch (error) {
      console.error("Failed to create follow-up:", error)
      alert("Ошибка создания записи")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to update status:", error)
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
      scheduled: { variant: "default", icon: Clock, label: "Запланировано" },
      completed: { variant: "default", icon: CheckCircle, label: "Завершено" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Отменено" },
      missed: { variant: "destructive", icon: AlertCircle, label: "Пропущено" },
    }

    const config = variants[status] || variants.scheduled
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const upcomingFollowUps = followUps.filter(
    (fu) => fu.status === "scheduled" && new Date(fu.scheduled_date) >= new Date(),
  )
  const pastFollowUps = followUps.filter((fu) => fu.status !== "scheduled" || new Date(fu.scheduled_date) < new Date())

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
            <h1 className="text-xl font-bold">Записи на прием</h1>
            <p className="text-xs text-muted-foreground">Управление приемами пациентов</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Новая запись
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать запись на прием</DialogTitle>
                  <DialogDescription>Запланируйте прием для пациента</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Пациент</Label>
                    <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите пациента" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Дата и время</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Примечания</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Дополнительная информация..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleCreateFollowUp} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Создать запись
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Upcoming Follow-ups */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Предстоящие приемы ({upcomingFollowUps.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {upcomingFollowUps.length === 0 ? (
              <Card className="border-dashed col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Нет запланированных приемов</p>
                </CardContent>
              </Card>
            ) : (
              upcomingFollowUps.map((followUp) => (
                <Card key={followUp.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{followUp.patient?.name || "Пациент"}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(followUp.scheduled_date)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(followUp.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {followUp.notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Примечания:</p>
                        <p className="text-sm text-muted-foreground">{followUp.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(followUp.id, "completed")}>
                        Завершить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(followUp.id, "cancelled")}>
                        Отменить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Past Follow-ups */}
        <div>
          <h2 className="text-lg font-semibold mb-4">История приемов ({pastFollowUps.length})</h2>
          <div className="space-y-3">
            {pastFollowUps.map((followUp) => (
              <Card key={followUp.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{followUp.patient?.name || "Пациент"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(followUp.scheduled_date)}</p>
                      {followUp.notes && <p className="text-sm text-muted-foreground mt-1">{followUp.notes}</p>}
                    </div>
                    {getStatusBadge(followUp.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
