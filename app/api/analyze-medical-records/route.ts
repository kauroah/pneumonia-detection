import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySession } from "@/lib/file-storage"
import { createServerClient } from "@/lib/supabase/server"
import { llm } from "@/lib/llm"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session")?.value

    if (!sessionId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await getUserBySession(sessionId)
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { patientId } = await request.json()

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    // Fetch medical records for the patient
    const supabase = await createServerClient()
    const { data: medicalRecords, error: recordsError } = await supabase
      .from("medical_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("record_date", { ascending: false })
      .limit(10)

    if (recordsError) {
      console.error("Error fetching medical records:", recordsError)
      return NextResponse.json({ error: "Failed to fetch medical records" }, { status: 500 })
    }

    if (!medicalRecords || medicalRecords.length === 0) {
      return NextResponse.json({ error: "No medical records found for this patient" }, { status: 404 })
    }

    // Fetch patient info
    const { data: patient } = await supabase.from("patients").select("*").eq("id", patientId).single()

    // Build comprehensive medical history context
    const medicalHistoryContext = medicalRecords
      .map((record, index) => {
        let context = `\n--- МЕДИЦИНСКАЯ ЗАПИСЬ #${index + 1} (${new Date(record.record_date).toLocaleDateString("ru-RU")}) ---\n`
        context += `Тип: ${record.record_type}\n`
        context += `Название: ${record.title}\n\n`

        // Risk factors
        if (record.comorbidities?.length > 0) {
          context += `СОПУТСТВУЮЩИЕ ЗАБОЛЕВАНИЯ: ${record.comorbidities.join(", ")}\n`
        }
        if (record.current_medications?.length > 0) {
          context += `ТЕКУЩИЕ МЕДИКАМЕНТЫ: ${record.current_medications.join(", ")}\n`
        }
        if (record.allergies?.length > 0) {
          context += `АЛЛЕРГИИ: ${record.allergies.join(", ")}\n`
        }
        if (record.smoking_status && record.smoking_status !== "never") {
          context += `КУРЕНИЕ: ${record.smoking_status === "current" ? "Курит" : "Бывший курильщик"}`
          if (record.smoking_pack_years) {
            context += ` (${record.smoking_pack_years} пачко-лет)`
          }
          context += `\n`
        }
        if (record.alcohol_use && record.alcohol_use !== "none") {
          context += `АЛКОГОЛЬ: ${record.alcohol_use}\n`
        }
        if (record.immunosuppressed) {
          context += `⚠️ ИММУНОСУПРЕССИЯ: Да\n`
        }
        if (record.recent_hospitalization) {
          context += `⚠️ НЕДАВНЯЯ ГОСПИТАЛИЗАЦИЯ: Да\n`
        }
        if (record.recent_antibiotics) {
          context += `НЕДАВНИЙ ПРИЕМ АНТИБИОТИКОВ: Да\n`
        }

        // Lab values
        context += `\nЛАБОРАТОРНЫЕ ПОКАЗАТЕЛИ:\n`
        if (record.wbc_count) context += `  • Лейкоциты (WBC): ${record.wbc_count} cells/μL (норма: 4.0-11.0)\n`
        if (record.rbc_count) context += `  • Эритроциты (RBC): ${record.rbc_count} млн/μL (норма: 4.5-5.5)\n`
        if (record.hemoglobin) context += `  • Гемоглобин: ${record.hemoglobin} g/dL (норма: 12.0-16.0)\n`
        if (record.platelet_count) context += `  • Тромбоциты: ${record.platelet_count} cells/μL (норма: 150-400k)\n`
        if (record.neutrophils) context += `  • Нейтрофилы: ${record.neutrophils}% (норма: 40-70%)\n`
        if (record.lymphocytes) context += `  • Лимфоциты: ${record.lymphocytes}% (норма: 20-40%)\n`
        if (record.crp) context += `  • CRP: ${record.crp} mg/L (норма: <10)\n`
        if (record.esr) context += `  • СОЭ: ${record.esr} mm/hr (норма: 0-20)\n`
        if (record.procalcitonin) context += `  • Прокальцитонин: ${record.procalcitonin} ng/mL (норма: <0.5)\n`
        if (record.spo2) context += `  • SpO2: ${record.spo2}% (норма: 95-100%)\n`
        if (record.respiratory_rate) context += `  • ЧД: ${record.respiratory_rate}/мин (норма: 12-20)\n`
        if (record.temperature) context += `  • Температура: ${record.temperature}°C (норма: 36.5-37.5)\n`
        if (record.heart_rate) context += `  • Пульс: ${record.heart_rate} уд/мин (норма: 60-100)\n`
        if (record.blood_pressure_systolic && record.blood_pressure_diastolic) {
          context += `  • АД: ${record.blood_pressure_systolic}/${record.blood_pressure_diastolic} mmHg\n`
        }

        if (record.findings) {
          context += `\nРЕЗУЛЬТАТЫ: ${record.findings}\n`
        }
        if (record.notes) {
          context += `ЗАМЕТКИ ВРАЧА: ${record.notes}\n`
        }

        return context
      })
      .join("\n")

    const prompt = `Вы — врач-диагност по заболеваниям грудной клетки. Это не чат, а офлайн рекомендация для клинициста. Работайте строго с предоставленными данными. Ничего не выдумывайте. Если сведений нет — пишите «нет данных». 
Не используйте Markdown-разметку и не выводите символы вроде **, ##, >, [ ] или таблицы через вертикальные черты. 
Пишите чистым русским языком, аккуратно, без разговорных оборотов. 
Фокус — пульмонология/рентгенология (пневмония, туберкулёз, кардиомегалия, плевральный выпот и др., если релевантно).

ИСХОДНЫЕ ДАННЫЕ
Имя: ${patient?.name || "Не указано"}
Возраст: ${patient?.age || "Не указан"} лет
Пол: ${patient?.gender || "Не указан"}
Медицинская история (последние записи, по убыванию даты):
${medicalHistoryContext}

СТРОГИЕ ПРАВИЛА
1) Никогда не оставляйте шаблонные заготовки, пустые скобки или слова типа «[Показатель]», «[Период]», «[Причина]». Если данных нет — «нет данных».
2) Единицы измерения сохраняйте как в исходных данных. Нормы приводите в тех же единицах. 
3) Проценты отклонений указывайте только если расчёт надёжен; иначе формулируйте «выше нормы»/«ниже нормы».
4) При нескольких записях кратко опишите динамику (рост, снижение, стабильность).
5) Не предлагайте инвазивные вмешательства без клинических оснований в данных.
6) Обязательно выведите одну строку итогового риска в конце резюме в точной форме ниже (ровно один вариант).

СТРУКТУРА ВЫВОДА (заполните каждый раздел; без Markdown и без квадратных скобок)

АНАЛИЗ МЕДИЦИНСКОЙ ИСТОРИИ ПАЦИЕНТА

Пациент: ${patient?.name || "Не указано"}
Пол: ${patient?.gender || "Не указан"}
Возраст: ${patient?.age || "Не указан"} лет

Краткое резюме (TL;DR)
— Основные наблюдения: …
— Ключевые отклонения лабораторных показателей: …
— Наиболее вероятное состояние(я): …
— Срочные сигналы (если есть): … / нет

ИТОГОВАЯ ОЦЕНКА РИСКА: выберите ровно одну формулировку
— ИТОГОВАЯ ОЦЕНКА РИСКА: 🟢 низкий риск
— ИТОГОВАЯ ОЦЕНКА РИСКА: 🟡 умеренный риск
— ИТОГОВАЯ ОЦЕНКА РИСКА: 🟠 высокий риск
— ИТОГОВАЯ ОЦЕНКА РИСКА: 🔴 критический

Выявленные факторы риска
— Сопутствующие заболевания: …
— Текущие препараты и потенциальные взаимодействия: …
— Образ жизни (курение, алкоголь): …
— Иммунный статус/иммуносупрессия: …
— Недавние госпитализации/антибиотики: …
— Прочие значимые факторы: …

Лабораторные показатели
(Оформите как аккуратный блок с выровненными строками, без таблиц с вертикальными чертами.)
Пример формата строк:
Лейкоциты (WBC): [значение]; норма 4.0–11.0 …; интерпретация: …
Нейтрофилы: [значение]%; норма 40–70%; интерпретация: …
Лимфоциты: [значение]%; норма 20–40%; интерпретация: …
Эритроциты (RBC): [значение] …; норма 4.5–5.5 …; интерпретация: …
Гемоглобин: [значение] g/dL; норма 12.0–16.0; интерпретация: …
Тромбоциты: [значение] …; норма 150–400k …; интерпретация: …
CRP: [значение] mg/L; норма < 10; интерпретация: …
СОЭ: [значение] mm/hr; норма 0–20; интерпретация: …
Прокальцитонин: [значение] ng/mL; норма < 0.5; интерпретация: …
SpO₂: [значение]%; норма 95–100%; интерпретация: …
Частота дыхания: [значение]/мин; норма 12–20; интерпретация: …
Температура: [значение] °C; норма 36.5–37.5; интерпретация: …
Пульс: [значение] уд/мин; норма 60–100; интерпретация: …
Артериальное давление: [систолическое/диастолическое] mmHg; интерпретация: …

Динамика (если есть не менее двух записей)
— WBC: рост/снижение/стабильно
— Нейтрофилы: рост/снижение/стабильно
— CRP: рост/снижение/стабильно
— Прочие показатели: …

Наиболее вероятные состояния (дифференциальный ряд)
1. Наименование состояния — обоснование по данным (конкретные показатели, жалобы/находки, динамика)
2. Альтернативное состояние — обоснование
3. Альтернативное состояние — обоснование
(Отметьте критически важные к исключению состояния словами «требует первоочередного исключения».)

Рекомендации
Обследования (по приоритету)
— Исследование 1 — цель/клинический смысл
— Исследование 2 — цель/клинический смысл
— Исследование 3 — цель/клинический смысл

Консультации специалистов
— Специалист 1 — причина направления
— Специалист 2 — причина направления

Мониторинг
— Какие показатели контролировать, как часто, и пороговые значения для повторной оценки

Профилактика и образ жизни
— Питание: …
— Физическая активность: …
— Режим отдыха/сон: …
— Отказ от курения, вакцинация по показаниям и др.: …

Критические находки (если имеются)
— Перечислите чётко, каждая с кратким пояснением клинической значимости

Источник данных
— Количество проанализированных записей: ${medicalRecords.length}
— Примечание: анализ выполнен по предоставленным данным, без постановки окончательного диагноза
— Дата анализа: ${new Date().toLocaleDateString("ru-RU")}`

    const result = await llm().generate({
      messages: [
        { role: "system", content: prompt },
      ],
      temperature: 0.3,
      maxOutputTokens: 3000,
    })

    const analysisText = result.text

    // Extract risk level from the analysis
    let riskLevel: "low" | "moderate" | "high" | "critical" = "moderate"
    if (analysisText.toLowerCase().includes("критический") || analysisText.toLowerCase().includes("critical")) {
      riskLevel = "critical"
    } else if (
      analysisText.toLowerCase().includes("высокий риск") ||
      analysisText.toLowerCase().includes("high risk")
    ) {
      riskLevel = "high"
    } else if (analysisText.toLowerCase().includes("низкий риск") || analysisText.toLowerCase().includes("low risk")) {
      riskLevel = "low"
    }

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("ai_medical_analyses")
      .insert({
        patient_id: patientId,
        doctor_id: user.id,
        analysis_text: analysisText,
        medical_records_count: medicalRecords.length,
        risk_level: riskLevel,
      })
      .select()
      .single()

    if (saveError) {
      console.error("Error saving AI analysis:", saveError)
      // Continue even if save fails - return the analysis anyway
    }

    return NextResponse.json({
      success: true,
      recommendation: analysisText,
      recordsAnalyzed: medicalRecords.length,
      analysisId: savedAnalysis?.id,
      riskLevel,
    })
  } catch (error) {
    console.error("Error analyzing medical records:", error)
    return NextResponse.json({ error: "Failed to analyze medical records" }, { status: 500 })
  }
}
