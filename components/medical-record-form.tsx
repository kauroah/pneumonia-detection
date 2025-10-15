"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface MedicalRecordFormProps {
  patientId: string
  onSuccess: () => void
  onCancel: () => void
}

export function MedicalRecordForm({ patientId, onSuccess, onCancel }: MedicalRecordFormProps) {
  const [loading, setLoading] = useState(false)
  const [recordType, setRecordType] = useState<string>("blood_test")
  const [recordDate, setRecordDate] = useState<Date>(new Date())
  const [formData, setFormData] = useState({
    title: "",
    // Blood test
    wbc_count: "",
    rbc_count: "",
    hemoglobin: "",
    hematocrit: "",
    platelet_count: "",
    neutrophils: "",
    lymphocytes: "",
    // Inflammatory markers
    crp: "",
    esr: "",
    procalcitonin: "",
    // Respiratory
    spo2: "",
    respiratory_rate: "",
    // Vital signs
    temperature: "",
    heart_rate: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    // Additional
    findings: "",
    notes: "",
  })

  const [comorbidities, setComorbidities] = useState<string[]>([])
  const [currentMedications, setCurrentMedications] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [smokingStatus, setSmokingStatus] = useState<string>("never")
  const [smokingPackYears, setSmokingPackYears] = useState("")
  const [alcoholUse, setAlcoholUse] = useState<string>("none")
  const [recentTravel, setRecentTravel] = useState("")
  const [environmentalExposures, setEnvironmentalExposures] = useState("")
  const [immunosuppressed, setImmunosuppressed] = useState(false)
  const [recentHospitalization, setRecentHospitalization] = useState(false)
  const [recentAntibiotics, setRecentAntibiotics] = useState(false)
  const [newItem, setNewItem] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        patient_id: patientId,
        record_type: recordType,
        record_date: recordDate.toISOString(),
        title: formData.title,
        findings: formData.findings || null,
        notes: formData.notes || null,
        comorbidities: comorbidities.length > 0 ? comorbidities : null,
        current_medications: currentMedications.length > 0 ? currentMedications : null,
        allergies: allergies.length > 0 ? allergies : null,
        smoking_status: smokingStatus,
        smoking_pack_years: smokingPackYears ? Number.parseFloat(smokingPackYears) : null,
        alcohol_use: alcoholUse,
        recent_travel: recentTravel || null,
        environmental_exposures: environmentalExposures || null,
        immunosuppressed,
        recent_hospitalization: recentHospitalization,
        recent_antibiotics: recentAntibiotics,
      }

      const numericFields = [
        "wbc_count",
        "rbc_count",
        "hemoglobin",
        "hematocrit",
        "platelet_count",
        "neutrophils",
        "lymphocytes",
        "crp",
        "esr",
        "procalcitonin",
        "spo2",
        "respiratory_rate",
        "temperature",
        "heart_rate",
        "blood_pressure_systolic",
        "blood_pressure_diastolic",
      ]

      numericFields.forEach((field) => {
        const value = formData[field as keyof typeof formData]
        if (value && value !== "") {
          payload[field] = Number.parseFloat(value as string)
        }
      })

      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to create medical record")

      onSuccess()
    } catch (error) {
      console.error("Error creating medical record:", error)
      alert("Ошибка при создании медицинской записи")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addToArray = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (value.trim()) {
      setArray([...array, value.trim()])
      setNewItem("")
    }
  }

  const removeFromArray = (array: string[], setArray: (arr: string[]) => void, index: number) => {
    setArray(array.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Новая медицинская запись</CardTitle>
          <CardDescription>Добавьте результаты анализов и медицинские данные</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="record_type">Тип записи</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood_test">Анализ крови</SelectItem>
                  <SelectItem value="lab_result">Лабораторный результат</SelectItem>
                  <SelectItem value="imaging">Визуализация</SelectItem>
                  <SelectItem value="vital_signs">Жизненные показатели</SelectItem>
                  <SelectItem value="medication">Медикаменты</SelectItem>
                  <SelectItem value="allergy">Аллергия</SelectItem>
                  <SelectItem value="condition">Состояние</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Дата записи</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(recordDate, "PPP", { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={recordDate} onSelect={(date) => date && setRecordDate(date)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Название записи *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Например: Общий анализ крови"
              required
            />
          </div>

          {/* ---- FIXED TABS BAR ---- */}
          <Tabs defaultValue="risk" className="w-full">
            <TabsList
  className="grid w-full grid-cols-5 bg-muted rounded-xl h-10 px-2 py-1 overflow-hidden shadow-inner"
>
  <TabsTrigger
    value="risk"
    className="flex items-center justify-center h-8 rounded-lg px-3 text-xs md:text-sm font-medium whitespace-nowrap
               transition-all duration-150 ease-in-out
               data-[state=active]:bg-background data-[state=active]:text-primary
               data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border
               hover:bg-background/70"
  >
    Факторы
  </TabsTrigger>

  <TabsTrigger
    value="blood"
    className="flex items-center justify-center h-8 rounded-lg px-3 text-xs md:text-sm font-medium whitespace-nowrap
               transition-all duration-150 ease-in-out
               data-[state=active]:bg-background data-[state=active]:text-primary
               data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border
               hover:bg-background/70"
  >
    Кровь
  </TabsTrigger>

  <TabsTrigger
    value="inflammatory"
    className="flex items-center justify-center h-8 rounded-lg px-3 text-xs md:text-sm font-medium whitespace-nowrap
               transition-all duration-150 ease-in-out
               data-[state=active]:bg-background data-[state=active]:text-primary
               data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border
               hover:bg-background/70"
  >
    Воспаление
  </TabsTrigger>

  <TabsTrigger
    value="respiratory"
    className="flex items-center justify-center h-8 rounded-lg px-3 text-xs md:text-sm font-medium whitespace-nowrap
               transition-all duration-150 ease-in-out
               data-[state=active]:bg-background data-[state=active]:text-primary
               data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border
               hover:bg-background/70"
  >
    Дыхание
  </TabsTrigger>

  <TabsTrigger
    value="vitals"
    className="flex items-center justify-center h-8 rounded-lg px-3 text-xs md:text-sm font-medium whitespace-nowrap
               transition-all duration-150 ease-in-out
               data-[state=active]:bg-background data-[state=active]:text-primary
               data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border
               hover:bg-background/70"
  >
    Показатели
  </TabsTrigger>
</TabsList>


            <TabsContent value="risk" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Сопутствующие заболевания</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      placeholder="Например: Диабет, ХОБЛ, Астма..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addToArray(comorbidities, setComorbidities, newItem)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => addToArray(comorbidities, setComorbidities, newItem)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {comorbidities.map((item, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {item}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFromArray(comorbidities, setComorbidities, index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Текущие медикаменты</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      placeholder="Название препарата и дозировка..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addToArray(currentMedications, setCurrentMedications, newItem)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => addToArray(currentMedications, setCurrentMedications, newItem)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentMedications.map((item, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {item}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFromArray(currentMedications, setCurrentMedications, index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Аллергии</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      placeholder="Аллергены..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addToArray(allergies, setAllergies, newItem)
                        }
                      }}
                    />
                    <Button type="button" size="icon" onClick={() => addToArray(allergies, setAllergies, newItem)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allergies.map((item, index) => (
                      <Badge key={index} variant="destructive" className="gap-1">
                        {item}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFromArray(allergies, setAllergies, index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Статус курения</Label>
                    <Select value={smokingStatus} onValueChange={setSmokingStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Никогда не курил</SelectItem>
                        <SelectItem value="former">Бывший курильщик</SelectItem>
                        <SelectItem value="current">Курит</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(smokingStatus === "former" || smokingStatus === "current") && (
                    <div className="space-y-2">
                      <Label>Пачко-лет</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={smokingPackYears}
                        onChange={(e) => setSmokingPackYears(e.target.value)}
                        placeholder="Количество пачко-лет"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Употребление алкоголя</Label>
                    <Select value={alcoholUse} onValueChange={setAlcoholUse}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не употребляет</SelectItem>
                        <SelectItem value="occasional">Редко</SelectItem>
                        <SelectItem value="moderate">Умеренно</SelectItem>
                        <SelectItem value="heavy">Часто</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Недавние поездки</Label>
                  <Textarea
                    value={recentTravel}
                    onChange={(e) => setRecentTravel(e.target.value)}
                    placeholder="Укажите недавние поездки, особенно в эндемичные районы..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Воздействие окружающей среды</Label>
                  <Textarea
                    value={environmentalExposures}
                    onChange={(e) => setEnvironmentalExposures(e.target.value)}
                    placeholder="Профессиональные вредности, загрязнение воздуха, контакт с химикатами..."
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="immunosuppressed"
                      checked={immunosuppressed}
                      onCheckedChange={(checked) => setImmunosuppressed(checked as boolean)}
                    />
                    <Label htmlFor="immunosuppressed" className="font-normal cursor-pointer">
                      Иммуносупрессия (ВИЧ, химиотерапия, иммунодепрессанты)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recent_hospitalization"
                      checked={recentHospitalization}
                      onCheckedChange={(checked) => setRecentHospitalization(checked as boolean)}
                    />
                    <Label htmlFor="recent_hospitalization" className="font-normal cursor-pointer">
                      Недавняя госпитализация (последние 90 дней)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recent_antibiotics"
                      checked={recentAntibiotics}
                      onCheckedChange={(checked) => setRecentAntibiotics(checked as boolean)}
                    />
                    <Label htmlFor="recent_antibiotics" className="font-normal cursor-pointer">
                      Недавний прием антибиотиков (последние 90 дней)
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="blood" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wbc_count">Лейкоциты (WBC, cells/μL)</Label>
                  <Input
                    id="wbc_count"
                    type="number"
                    step="0.01"
                    value={formData.wbc_count}
                    onChange={(e) => updateField("wbc_count", e.target.value)}
                    placeholder="4.0-11.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rbc_count">Эритроциты (RBC, млн/μL)</Label>
                  <Input
                    id="rbc_count"
                    type="number"
                    step="0.01"
                    value={formData.rbc_count}
                    onChange={(e) => updateField("rbc_count", e.target.value)}
                    placeholder="4.5-5.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hemoglobin">Гемоглобин (g/dL)</Label>
                  <Input
                    id="hemoglobin"
                    type="number"
                    step="0.01"
                    value={formData.hemoglobin}
                    onChange={(e) => updateField("hemoglobin", e.target.value)}
                    placeholder="12.0-16.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hematocrit">Гематокрит (%)</Label>
                  <Input
                    id="hematocrit"
                    type="number"
                    step="0.01"
                    value={formData.hematocrit}
                    onChange={(e) => updateField("hematocrit", e.target.value)}
                    placeholder="36-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platelet_count">Тромбоциты (cells/μL)</Label>
                  <Input
                    id="platelet_count"
                    type="number"
                    step="0.01"
                    value={formData.platelet_count}
                    onChange={(e) => updateField("platelet_count", e.target.value)}
                    placeholder="150-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neutrophils">Нейтрофилы (%)</Label>
                  <Input
                    id="neutrophils"
                    type="number"
                    step="0.01"
                    value={formData.neutrophils}
                    onChange={(e) => updateField("neutrophils", e.target.value)}
                    placeholder="40-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lymphocytes">Лимфоциты (%)</Label>
                  <Input
                    id="lymphocytes"
                    type="number"
                    step="0.01"
                    value={formData.lymphocytes}
                    onChange={(e) => updateField("lymphocytes", e.target.value)}
                    placeholder="20-40"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inflammatory" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="crp">C-реактивный белок (CRP, mg/L)</Label>
                  <Input
                    id="crp"
                    type="number"
                    step="0.01"
                    value={formData.crp}
                    onChange={(e) => updateField("crp", e.target.value)}
                    placeholder="< 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="esr">СОЭ (ESR, mm/hr)</Label>
                  <Input
                    id="esr"
                    type="number"
                    step="0.01"
                    value={formData.esr}
                    onChange={(e) => updateField("esr", e.target.value)}
                    placeholder="0-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="procalcitonin">Прокальцитонин (ng/mL)</Label>
                  <Input
                    id="procalcitonin"
                    type="number"
                    step="0.01"
                    value={formData.procalcitonin}
                    onChange={(e) => updateField("procalcitonin", e.target.value)}
                    placeholder="< 0.5"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="respiratory" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="spo2">Сатурация кислорода (SpO2, %)</Label>
                  <Input
                    id="spo2"
                    type="number"
                    step="0.01"
                    value={formData.spo2}
                    onChange={(e) => updateField("spo2", e.target.value)}
                    placeholder="95-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="respiratory_rate">Частота дыхания (в минуту)</Label>
                  <Input
                    id="respiratory_rate"
                    type="number"
                    value={formData.respiratory_rate}
                    onChange={(e) => updateField("respiratory_rate", e.target.value)}
                    placeholder="12-20"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vitals" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Температура (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => updateField("temperature", e.target.value)}
                    placeholder="36.5-37.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heart_rate">Пульс (уд/мин)</Label>
                  <Input
                    id="heart_rate"
                    type="number"
                    value={formData.heart_rate}
                    onChange={(e) => updateField("heart_rate", e.target.value)}
                    placeholder="60-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood_pressure_systolic">АД систолическое (mmHg)</Label>
                  <Input
                    id="blood_pressure_systolic"
                    type="number"
                    value={formData.blood_pressure_systolic}
                    onChange={(e) => updateField("blood_pressure_systolic", e.target.value)}
                    placeholder="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood_pressure_diastolic">АД диастолическое (mmHg)</Label>
                  <Input
                    id="blood_pressure_diastolic"
                    type="number"
                    value={formData.blood_pressure_diastolic}
                    onChange={(e) => updateField("blood_pressure_diastolic", e.target.value)}
                    placeholder="80"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="findings">Результаты и находки</Label>
            <Textarea
              id="findings"
              value={formData.findings}
              onChange={(e) => updateField("findings", e.target.value)}
              placeholder="Опишите результаты анализа и важные находки..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки врача</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Дополнительные заметки и комментарии..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить запись"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
