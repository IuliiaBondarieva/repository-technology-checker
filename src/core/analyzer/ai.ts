// Minimal OpenAI-compatible chat client. ~40 lines, zero SDK dependencies.
// Works with OpenAI, Ollama (http://localhost:11434/v1), Groq, Together, etc.
//
// We only need JSON-object responses, so we ask for `response_format: json_object`
// which is supported by every OpenAI-compatible endpoint we care about.

export interface ChatOptions {
  system: string;
  user: string;
  baseURL?: string;
  apiKey?: string;
  model?: string;
}

export async function chatJSON<T = unknown>(options: ChatOptions): Promise<T> {
  const baseURL =
    options.baseURL ?? process.env.OPENAI_BASE_URL ?? "http://localhost:11434/v1";
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "not-needed";
  const model = options.model ?? process.env.AI_MODEL ?? "llama3.1:8b";

  const response = await fetch(`${baseURL.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI response had no content");
  return JSON.parse(content) as T;
}
