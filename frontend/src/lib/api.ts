export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string; ts?: number };
export type Hint = { text: string; politeness: "casual" | "neutral" | "formal" };
export type Scenario = { id: string; title: string; language: string; description: string; starter?: string };

export async function startSession(language: string): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/api/session/start`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) throw new Error("Failed to start session");
  return res.json();
}

export async function getScenarios(language: string): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE}/api/scenarios?language=${encodeURIComponent(language)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function getHints(messages: ChatMessage[], language: string): Promise<Hint[]> {
  const res = await fetch(`${API_BASE}/api/hints`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, language }),
  });
  if (!res.ok) throw new Error("Failed to fetch hints");
  return res.json();
}

export async function translate(text: string, targetLanguage: string): Promise<{ translated: string }>{
  const res = await fetch(`${API_BASE}/api/translate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLanguage }),
  });
  if (!res.ok) throw new Error("Failed to translate");
  return res.json();
}

export async function tts(text: string, voice?: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error("Failed to synthesize speech");
  return res.arrayBuffer();
}

export async function stt(file: File): Promise<{ text: string }>{
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/stt`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to transcribe");
  return res.json();
}

export type FeedbackReport = {
  grammar_score: number;
  vocab_score: number;
  summary: string;
  top_mistakes: string[];
  recommendations: string[];
};

export async function getFeedback(messages: ChatMessage[], language: string): Promise<FeedbackReport> {
  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, language }),
  });
  if (!res.ok) throw new Error("Failed to generate feedback");
  return res.json();
}

export async function streamChat(body: {
  messages: ChatMessage[];
  language: string;
  scenarioId?: string;
}) {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error("Failed to start stream");
  return res.body.getReader();
}