"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Droplet, Heart, Wind, AlertCircle } from "lucide-react"
import type { MedicalRecord } from "@/lib/db-types"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface MedicalRecordCardProps {
  record: MedicalRecord
}

export function MedicalRecordCard({ record }: MedicalRecordCardProps) {
  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      blood_test: "Анализ крови",
      lab_result: "Лабораторный результат",
      imaging: "Визуализация",
      vital_signs: "Жизненные показатели",
      medication: "Медикаменты",
      allergy: "Аллергия",
      condition: "Состояние",
      other: "Другое",
    }
    return labels[type] || type
  }

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      blood_test: "bg-red-500/10 text-red-700 dark:text-red-400",
      lab_result: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      imaging: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      vital_signs: "bg-green-500/10 text-green-700 dark:text-green-400",
      medication: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      allergy: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      condition: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
      other: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    }
    return colors[type] || colors.other
  }

  const hasAbnormalValues = () => {
    // Check for abnormal inflammatory markers (indicators of pneumonia)
    if (record.crp && record.crp > 10) return true
    if (record.wbc_count && (record.wbc_count > 11 || record.wbc_count < 4)) return true
    if (record.spo2 && record.spo2 < 95) return true
    if (record.temperature && record.temperature > 37.5) return true
    if (record.respiratory_rate && record.respiratory_rate > 20) return true
    return false
  }

  return (
    <Card className={hasAbnormalValues() ? "border-orange-500/50" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{record.title}</CardTitle>
            <CardDescription>{format(new Date(record.record_date), "PPP", { locale: ru })}</CardDescription>
          </div>
          <Badge className={getRecordTypeColor(record.record_type)}>{getRecordTypeLabel(record.record_type)}</Badge>
        </div>
        {hasAbnormalValues() && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 mt-2">
            <AlertCircle className="w-4 h-4" />
            <span>Обнаружены отклонения от нормы</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blood Test Results */}
        {(record.wbc_count || record.rbc_count || record.hemoglobin || record.platelet_count) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Droplet className="w-4 h-4 text-red-500" />
              <span>Анализ крови</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.wbc_count && (
                <div className={record.wbc_count > 11 || record.wbc_count < 4 ? "text-orange-600" : ""}>
                  <span className="text-muted-foreground">Лейкоциты:</span> {record.wbc_count} cells/μL
                </div>
              )}
              {record.rbc_count && (
                <div>
                  <span className="text-muted-foreground">Эритроциты:</span> {record.rbc_count} млн/μL
                </div>
              )}
              {record.hemoglobin && (
                <div>
                  <span className="text-muted-foreground">Гемоглобин:</span> {record.hemoglobin} g/dL
                </div>
              )}
              {record.platelet_count && (
                <div>
                  <span className="text-muted-foreground">Тромбоциты:</span> {record.platelet_count} cells/μL
                </div>
              )}
              {record.neutrophils && (
                <div>
                  <span className="text-muted-foreground">Нейтрофилы:</span> {record.neutrophils}%
                </div>
              )}
              {record.lymphocytes && (
                <div>
                  <span className="text-muted-foreground">Лимфоциты:</span> {record.lymphocytes}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inflammatory Markers */}
        {(record.crp || record.esr || record.procalcitonin) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Activity className="w-4 h-4 text-orange-500" />
              <span>Маркеры воспаления</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.crp && (
                <div className={record.crp > 10 ? "text-orange-600" : ""}>
                  <span className="text-muted-foreground">CRP:</span> {record.crp} mg/L
                </div>
              )}
              {record.esr && (
                <div>
                  <span className="text-muted-foreground">СОЭ:</span> {record.esr} mm/hr
                </div>
              )}
              {record.procalcitonin && (
                <div className={record.procalcitonin > 0.5 ? "text-orange-600" : ""}>
                  <span className="text-muted-foreground">Прокальцитонин:</span> {record.procalcitonin} ng/mL
                </div>
              )}
            </div>
          </div>
        )}

        {/* Respiratory Function */}
        {(record.spo2 || record.respiratory_rate) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wind className="w-4 h-4 text-blue-500" />
              <span>Дыхательная функция</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.spo2 && (
                <div className={record.spo2 < 95 ? "text-orange-600" : ""}>
                  <span className="text-muted-foreground">SpO2:</span> {record.spo2}%
                </div>
              )}
              {record.respiratory_rate && (
                <div className={record.respiratory_rate > 20 ? "text-orange-600" : ""}>
                  <span className="text-muted-foreground">ЧД:</span> {record.respiratory_rate} в мин
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vital Signs */}
        {(record.temperature || record.heart_rate || record.blood_pressure_systolic) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Heart className="w-4 h-4 text-pink-500" />
              <span>Жизненные показатели</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.temperature && (
                <div className={record.temperature > 37.5 ? "text-orange-600" : ""}>
                  <span className="text-muted-foreground">Температура:</span> {record.temperature}°C
                </div>
              )}
              {record.heart_rate && (
                <div>
                  <span className="text-muted-foreground">Пульс:</span> {record.heart_rate} уд/мин
                </div>
              )}
              {record.blood_pressure_systolic && record.blood_pressure_diastolic && (
                <div>
                  <span className="text-muted-foreground">АД:</span> {record.blood_pressure_systolic}/
                  {record.blood_pressure_diastolic} mmHg
                </div>
              )}
            </div>
          </div>
        )}

        {/* Findings */}
        {record.findings && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Результаты:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{record.findings}</p>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Заметки врача:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{record.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
