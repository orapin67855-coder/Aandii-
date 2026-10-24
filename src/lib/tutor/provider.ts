import { MATH_TOOL, runMath } from "./math";

const MODEL = process.env.AI_MODEL ?? "gemini-3.8-flash";
const FALLBACK = process.env.AI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
const NATIVE = "https://generativelanguage.googleapis.com/v1beta";

export class ProviderError extends Error {
  constructor(public status: number) {
    super(`provider ${status}`);
  }
}

export const aiConfigured = () => Boolean(process.env.AI_API_KEY?.trim());

type Usage = { prompt: number; completion: number };
type Trace = { ok: boolean };
type Part = {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
  thoughtSignature?: string;
};
type Content = { role: "user" | "model"; parts: Part[] };
type OpenAiMsg = {
  role: string;
  content?: unknown;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

const customBase = process.env.AI_BASE_URL?.replace(/\/$/, "");
const useOpenAi = Boolean(customBase && !customBase.includes("generativelanguage.googleapis.com"));

function geminiParameters() {
  const properties: Record<string, { type: string; description?: string; enum?: readonly string[] }> = {};
  for (const [key, value] of Object.entries(MATH_TOOL.input_schema.properties)) {
    properties[key] = {
      type: value.type === "array" ? "ARRAY" : "STRING",
      description: "description" in value ? value.description : undefined,
      enum: "enum" in value ? value.enum : undefined,
    };
  }
  return { type: "OBJECT", properties, required: MATH_TOOL.input_schema.required };
}

function imagePart(url: string): Part | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function visibleText(parts: Part[]): string {
  return parts.filter((part) => part.text && !part.thought).map((part) => part.text).join("").trim();
}

async function nativeCall(system: string, contents: Content[], model: string): Promise<{ parts: Part[]; usage: Usage }> {
  const response = await fetch(`${NATIVE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.AI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: [{ name: MATH_TOOL.name, description: MATH_TOOL.description, parameters: geminiParameters() }] }],
      generationConfig: { maxOutputTokens: 1500 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new ProviderError(response.status);
  const body = await response.json() as {
    candidates?: { content?: { parts?: Part[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const parts = body.candidates?.[0]?.content?.parts;
  if (!parts?.length) throw new ProviderError(502);
  return {
    parts,
    usage: { prompt: body.usageMetadata?.promptTokenCount ?? 0, completion: body.usageMetadata?.candidatesTokenCount ?? 0 },
  };
}

async function openAiCall(messages: OpenAiMsg[], model: string): Promise<{ message: OpenAiMsg; usage: Usage }> {
  const response = await fetch(`${customBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({
      model,
      messages,
      tools: [{ type: "function", function: { name: MATH_TOOL.name, description: MATH_TOOL.description, parameters: MATH_TOOL.input_schema } }],
      tool_choice: "auto",
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new ProviderError(response.status);
  const body = await response.json() as { choices?: { message?: OpenAiMsg }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const message = body.choices?.[0]?.message;
  if (!message) throw new ProviderError(502);
  return { message, usage: { prompt: body.usage?.prompt_tokens ?? 0, completion: body.usage?.completion_tokens ?? 0 } };
}

async function withFallback<T>(run: (model: string) => Promise<T>, startedTools: boolean): Promise<{ value: T; model: string }> {
  try {
    return { value: await run(MODEL), model: MODEL };
  } catch (error) {
    const retriable = error instanceof ProviderError && [404, 429, 500, 503].includes(error.status);
    if (retriable && !startedTools && FALLBACK && FALLBACK !== MODEL) return { value: await run(FALLBACK), model: FALLBACK };
    throw error;
  }
}

export async function runTutor(
  system: string,
  history: { role: "user" | "assistant"; content: string }[],
  text: string,
  images: string[],
): Promise<{ answer: string; trace: Trace[]; usage: Usage; model: string }> {
  const usage: Usage = { prompt: 0, completion: 0 };
  const trace: Trace[] = [];
  let model = MODEL;

  if (!useOpenAi) {
    const contents: Content[] = history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    }));
    const parts: Part[] = [];
    if (text) parts.push({ text });
    else if (images.length) parts.push({ text: "ช่วยดูโจทย์ในรูปให้หน่อย" });
    for (const url of images) {
      const image = imagePart(url);
      if (image) parts.push(image);
    }
    contents.push({ role: "user", parts });
    for (let step = 0; step < 5; step += 1) {
      const called = await withFallback((name) => nativeCall(system, contents, name), trace.length > 0);
      model = called.model;
      usage.prompt += called.value.usage.prompt;
      usage.completion += called.value.usage.completion;
      const calls = called.value.parts.filter((part) => part.functionCall?.name === MATH_TOOL.name);
      if (!calls.length) return { answer: visibleText(called.value.parts), trace, usage, model };
      contents.push({ role: "model", parts: called.value.parts });
      const responses: Part[] = [];
      for (const part of calls) {
        const out = runMath(part.functionCall?.args ?? null);
        trace.push(out);
        responses.push({ functionResponse: { name: MATH_TOOL.name, response: out } });
      }
      contents.push({ role: "user", parts: responses });
    }
    return { answer: "", trace, usage, model };
  }

  const userContent = images.length
    ? [{ type: "text", text: text || "ช่วยดูโจทย์ในรูปให้หน่อย" }, ...images.map((url) => ({ type: "image_url", image_url: { url } }))]
    : text;
  const messages: OpenAiMsg[] = [{ role: "system", content: system }, ...history, { role: "user", content: userContent }];
  for (let step = 0; step < 5; step += 1) {
    const called = await withFallback((name) => openAiCall(messages, name), trace.length > 0);
    model = called.model;
    usage.prompt += called.value.usage.prompt;
    usage.completion += called.value.usage.completion;
    const message = called.value.message;
    if (!message.tool_calls?.length) {
      return { answer: typeof message.content === "string" ? message.content.trim() : "", trace, usage, model };
    }
    messages.push(message);
    for (const toolCall of message.tool_calls) {
      let args: unknown = null;
      try { args = JSON.parse(toolCall.function.arguments); } catch { /* runMath reports the bad shape */ }
      const out = runMath(args);
      trace.push(out);
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(out) });
    }
  }
  return { answer: "", trace, usage, model };
}
