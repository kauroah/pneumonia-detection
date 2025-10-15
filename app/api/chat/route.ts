import { convertToModelMessages, type UIMessage } from "ai";
import { llm } from "@/lib/llm";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    diagnosis,
    confidence,
  }: { messages: UIMessage[]; diagnosis: string; confidence: number } = await req.json();

  // --- System style guard: RU only, clinical tone, no markdown/tables/emojis/slang
  const systemPrompt = `
Вы — клинический ИИ-ассистент по пульмонологии. Вы отвечаете кратко, профессионально и на русском языке.
Формат И ВСЕ ПРАВИЛА (СТРОГО):
- Без Markdown, таблиц, смайлов и декоративных символов. Только обычный текст.
- Без пустой болтовни и вступлений. Сразу по делу.
- Структура по умолчанию:
Оценка:
План:
Контроль и наблюдение:
Красные флаги:
Памятка:
- Если нужно уточнение, задайте 1–3 конкретных вопроса в конце блока "Уточните:" — тоже обычным текстом.
- При пневмонии — давайте практичные рекомендации (амбулаторно vs стационар, антибиотики как классы/линии без назначения доз), поддержка, мониторинг, когда пересмотреть терапию.
- При норме — профилактика, мониторинг симптомов, когда обращаться.
- Напоминайте, что окончательное решение принимает врач.
- Запрещены конкретные назначения доз/схем; описывайте варианты и классы препаратов, критерии выбора, необходимость очной оценки.

Контекст пациента:
Диагноз модели: ${diagnosis}
Уверенность модели: ${confidence.toFixed(1)}%
`.trim();

  const prompt = convertToModelMessages([
    { id: "system", role: "system", parts: [{ type: "text", text: systemPrompt }] },
    ...messages,
  ]);

  // Более детерминированный ответ, без "воды"
  const result = llm().stream({
    messages: prompt,
    temperature: 0.3,
    maxOutputTokens: 900,
  });

  return result.toUIMessageStreamResponse();
}
