/**
 * Deterministic in-memory provider for unit tests: responses are scripted per
 * matcher, calls are recorded for assertions. Never used in production code
 * paths; injected through the router's provider seam.
 */
import type {
  AiModel,
  AiProvider,
  ChatChunk,
  ChatRequest,
  ChatResult,
} from "@/ai/types";

export interface ScriptedResponse {
  /** Substring matched against the last user message; "*" matches anything. */
  match: string;
  content: string;
}

export class FakeAiProvider implements AiProvider {
  readonly id = "fake";
  readonly name = "Fake";
  readonly calls: ChatRequest[] = [];

  constructor(private readonly script: ScriptedResponse[]) {}

  async chat(request: ChatRequest): Promise<ChatResult> {
    this.calls.push(request);
    const lastUser =
      [...request.messages].reverse().find((m) => m.role === "user")?.content ??
      "";
    const hit = this.script.find(
      (entry) => entry.match === "*" || lastUser.includes(entry.match),
    );
    if (!hit) {
      throw new Error(`FakeAiProvider: no scripted response matches "${lastUser.slice(0, 80)}"`);
    }
    return {
      content: hit.content,
      usage: { inputTokens: 100, outputTokens: 50 },
      model: request.model,
    };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatChunk> {
    const result = await this.chat(request);
    yield { content: result.content };
  }

  async listModels(): Promise<AiModel[]> {
    return [{ id: "fake-model", name: "Fake model" }];
  }
}
