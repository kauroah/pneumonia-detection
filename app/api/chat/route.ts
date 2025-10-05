//import { convertToModelMessages, streamText, type UIMessage } from "ai"
//import { deepseek } from "@ai-sdk/deepseek";
import { convertToModelMessages, type UIMessage } from "ai";
import { llm } from "@/lib/llm";

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, diagnosis, confidence }: { messages: UIMessage[]; diagnosis: string; confidence: number } =
    await req.json()

  const systemPrompt = `Вы - медицинский ИИ-ассистент, специализирующийся на пневмонии и здоровье легких. 
Вы помогаете врачам и медсестрам в российских медицинских центрах.

Контекст текущего пациента:
- Диагноз: ${diagnosis}
- Уверенность модели: ${confidence.toFixed(1)}%

Ваши обязанности:
1. Предоставлять подробные планы лечения для пациентов с пневмонией
2. Давать рекомендации по профилактике для здоровых пациентов
3. Отвечать на вопросы о симптомах, лечении и уходе
4. Всегда напоминать, что окончательное решение принимает врач

ВАЖНО: 
- Отвечайте ТОЛЬКО на русском языке
- Будьте профессиональны и точны
- Используйте медицинскую терминологию, но объясняйте сложные термины
- Всегда подчеркивайте важность консультации с врачом`

  const prompt = convertToModelMessages([
    {
      id: "system",
      role: "system",
      parts: [{ type: "text", text: systemPrompt }],
    },
    ...messages,
  ])

  /*const result = streamText({
    model: deepseek("deepseek-chat"),
    messages: prompt,
    temperature: 0.7,
    maxOutputTokens: 2000,
  })*/

    const result = llm().stream({
    messages: prompt,
    temperature: 0.7,
    maxOutputTokens: 1500,
  });

  return result.toUIMessageStreamResponse()
}
