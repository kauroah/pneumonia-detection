interface GenerateOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GenerateResult {
  text: string;
}

export function llm() {
  const provider = process.env.AI_PROVIDER ?? "ollama";

  if (provider === "ollama") {
    const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
    const modelId = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";

    return {
      generate: async (opts: GenerateOptions): Promise<GenerateResult> => {
        try {
          const response = await fetch(`${baseURL}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelId,
              messages: opts.messages,
              temperature: opts.temperature || 0.3,
              max_tokens: opts.maxOutputTokens || 900,
              stream: false,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
          }
          
          const data = await response.json();
          return { text: data.choices[0]?.message?.content || "No response generated" };
        } catch (error) {
          console.error("Ollama API error:", error);
          return { text: "Sorry, I encountered an error. Please try again." };
        }
      }
    };
  }

  if (provider === "groq") {
    return {
      generate: async (opts: GenerateOptions): Promise<GenerateResult> => {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: opts.messages,
              temperature: opts.temperature || 0.3,
              max_tokens: opts.maxOutputTokens || 900,
              stream: false,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
          }
          
          const data = await response.json();
          return { text: data.choices[0]?.message?.content || "No response generated" };
        } catch (error) {
          console.error("Groq API error:", error);
          return { text: "Sorry, I encountered an error. Please try again." };
        }
      }
    };
  }

  if (provider === "openrouter") {
    return {
      generate: async (opts: GenerateOptions): Promise<GenerateResult> => {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
              model: "meta-llama/llama-3.1-8b-instruct:free",
              messages: opts.messages,
              temperature: opts.temperature || 0.3,
              max_tokens: opts.maxOutputTokens || 900,
              stream: false,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
          }
          
          const data = await response.json();
          return { text: data.choices[0]?.message?.content || "No response generated" };
        } catch (error) {
          console.error("OpenRouter API error:", error);
          return { text: "Sorry, I encountered an error. Please try again." };
        }
      }
    };
  }

  // Fallback: use Ollama
  return {
    generate: async (opts: GenerateOptions): Promise<GenerateResult> => {
      return { text: "AI service not configured properly" };
    }
  };
}