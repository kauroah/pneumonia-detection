import { llm } from "@/lib/llm";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const {
      text,
      diagnosis,
      confidence,
    }: { text: string; diagnosis: string; confidence: number } = await req.json();

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

    // Use non-streaming response
    const result = await llm().generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.3,
      maxOutputTokens: 900,
    });

    return Response.json({ 
      message: result.text 
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}