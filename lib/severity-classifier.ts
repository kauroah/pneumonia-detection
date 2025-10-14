// Severity classification logic for pneumonia cases
export type SeverityLevel = "mild" | "moderate" | "severe" | null

export interface SeverityClassification {
  level: SeverityLevel
  description: string
  urgency: "low" | "medium" | "high"
  recommendations: string[]
}

export function classifySeverity(diagnosis: string, confidence: number): SeverityLevel {
  // Only classify severity for pneumonia cases
  if (diagnosis !== "PNEUMONIA") {
    return null
  }

  // Classification based on confidence score
  // Higher confidence = more severe pneumonia indicators
  if (confidence >= 85) {
    return "severe"
  } else if (confidence >= 70) {
    return "moderate"
  } else {
    return "mild"
  }
}

export function getSeverityDetails(severity: SeverityLevel): SeverityClassification {
  switch (severity) {
    case "severe":
      return {
        level: "severe",
        description: "Тяжелая пневмония",
        urgency: "high",
        recommendations: [
          "Немедленная госпитализация",
          "Внутривенная антибиотикотерапия",
          "Мониторинг жизненных показателей",
          "Рентген грудной клетки каждые 24-48 часов",
          "Консультация пульмонолога",
          "Возможна кислородная терапия",
        ],
      }
    case "moderate":
      return {
        level: "moderate",
        description: "Умеренная пневмония",
        urgency: "medium",
        recommendations: [
          "Амбулаторное лечение под наблюдением",
          "Пероральная антибиотикотерапия",
          "Контрольный осмотр через 48-72 часа",
          "Рентген через 7-10 дней",
          "Постельный режим",
          "Обильное питье",
        ],
      }
    case "mild":
      return {
        level: "mild",
        description: "Легкая пневмония",
        urgency: "low",
        recommendations: [
          "Амбулаторное лечение",
          "Антибиотики по назначению врача",
          "Контрольный осмотр через 5-7 дней",
          "Отдых и обильное питье",
          "Жаропонижающие при необходимости",
          "Избегать физических нагрузок",
        ],
      }
    default:
      return {
        level: null,
        description: "Норма",
        urgency: "low",
        recommendations: [
          "Профилактические меры",
          "Здоровый образ жизни",
          "Регулярные осмотры",
          "Вакцинация по графику",
        ],
      }
  }
}

export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case "severe":
      return "destructive"
    case "moderate":
      return "default"
    case "mild":
      return "secondary"
    default:
      return "outline"
  }
}

export function getSeverityBadgeText(severity: SeverityLevel): string {
  switch (severity) {
    case "severe":
      return "Тяжелая"
    case "moderate":
      return "Умеренная"
    case "mild":
      return "Легкая"
    default:
      return "Норма"
  }
}
