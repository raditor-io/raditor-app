/**
 * Venice.ai adapter (OpenAI-compatible chat completions API). The fetch
 * implementation is injectable for tests.
 */
import type {
  AiModel,
  AiProvider,
  ChatChunk,
  ChatRequest,
  ChatResult,
} from "@/ai/types";

const DEFAULT_BASE_URL = "https://api.venice.ai/api/v1";

export interface VeniceProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class VeniceProvider implements AiProvider {
  readonly id = "venice";
  readonly name = "Venice.ai";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: VeniceProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      // isJsonResponse is intentionally NOT mapped to response_format: several
      // Venice models reject it with a 400. JSON output is enforced by the
      // prompts and recovered by parseJsonResponse instead.
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_completion_tokens: request.maxTokens,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Venice chat failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Venice chat returned no message content");
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
      model: data.model ?? request.model,
    };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatChunk> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_completion_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Venice stream failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield { content };
          } catch {
            // Ignore malformed keep-alive lines.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(): Promise<AiModel[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Venice models failed (${response.status})`);
    }
    const data = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return (data.data ?? []).map((m) => ({ id: m.id, name: m.id }));
  }
}
