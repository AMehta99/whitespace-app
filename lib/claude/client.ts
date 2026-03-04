import Anthropic from "@anthropic-ai/sdk";

// Initialize Claude client
export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default model to use
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// Helper to create a streaming message
export async function createStreamingMessage(options: {
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}) {
  return claude.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
  });
}

// Helper for non-streaming messages
export async function createMessage(options: {
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}) {
  return claude.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
  });
}
