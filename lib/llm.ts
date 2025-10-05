import { generateText, streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
// (Optional: keep DeepSeek as a backup if you ever top up credit)
// import { deepseek } from "@ai-sdk/deepseek";

export function llm() {
  const provider = process.env.AI_PROVIDER ?? "ollama";

  if (provider === "ollama") {
    const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
    const modelId = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";

    // `apiKey` is ignored by Ollama; `name` is just a label
    const ollama = createOpenAICompatible({
      name: "ollama",
      baseURL,
      apiKey: "ollama",
    });

    return {
      gen: (opts: Omit<Parameters<typeof generateText>[0], "model">) =>
        generateText({ ...opts, model: ollama(modelId) }),
      stream: (opts: Omit<Parameters<typeof streamText>[0], "model">) =>
        streamText({ ...opts, model: ollama(modelId) }),
    };
  }

  if (provider === "groq") {
    const groq = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY!,
    });
    return {
      gen: (opts) => generateText({ ...opts, model: groq("llama-3.1-8b-instant") }),
      stream: (opts) => streamText({ ...opts, model: groq("llama-3.1-8b-instant") }),
    };
  }

  if (provider === "openrouter") {
    const openrouter = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY!,
    });
    const model = "meta-llama/llama-3.1-8b-instruct:free";
    return {
      gen: (opts) => generateText({ ...opts, model: openrouter(model) }),
      stream: (opts) => streamText({ ...opts, model: openrouter(model) }),
    };
  }

  // Fallback: use Ollama
  return llm();
}
