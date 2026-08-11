/**
 * AI provider abstraction (see CLAUDE.md): providers are swappable per
 * functionality; Venice is the default. Functionalities are named for what
 * the product does with the call (declarative naming rule) and route by
 * stakes: cheap models for summaries and evaluations, strong writers for
 * content.
 */

export type AiFunctionality =
  | "scan_summary" // summarize scan material (diffs, release notes) into signal summaries
  | "scan_briefing" // AI-briefing hunts via web/X search (executes from Phase 7)
  | "signal_evaluation" // per-project relevance judgment of a signal
  | "content_suggestion" // the four-part suggestion draft
  | "content_draft" // rendering actual file contents for accepted suggestions
  | "translation" // locale fan-out (Phase 6)
  | "draft_critique" // challenge mode (Phase 8)
  | "eval_judgement"; // eval harness rubric judge (Phase 8)

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for a JSON object response when supported. */
  isJsonResponse?: boolean;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatResult {
  content: string;
  usage: ChatUsage;
  model: string;
}

export interface ChatChunk {
  content: string;
}

export interface AiModel {
  id: string;
  name: string;
}

export interface AiProvider {
  id: string;
  name: string;
  chat(request: ChatRequest): Promise<ChatResult>;
  streamChat(request: ChatRequest): AsyncIterable<ChatChunk>;
  listModels(): Promise<AiModel[]>;
}
