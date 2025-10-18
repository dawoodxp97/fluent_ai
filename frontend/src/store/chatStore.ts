import { create } from "zustand";
import { streamChat, ChatMessage, getHints, translate } from "../lib/api";

// Define explicit Role type to satisfy TS literal unions
type Role = "user" | "assistant" | "system";

type ChatState = {
  language: string;
  scenarioId?: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  hints: { items: { text: string; politeness: "casual" | "neutral" | "formal" }[]; visible: boolean };
  setLanguage: (lang: string) => void;
  setScenario: (id?: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  startStream: () => Promise<void>;
  stopStream: () => void;
  requestHints: () => Promise<void>;
  translateText: (text: string) => Promise<string>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  language: "Spanish",
  scenarioId: undefined,
  messages: [],
  isStreaming: false,
  hints: { items: [], visible: false },
  setLanguage: (lang) => set({ language: lang }),
  setScenario: (id) => set({ scenarioId: id }),
  addMessage: (msg) => set({ messages: [...get().messages, { ...msg, ts: Date.now() }] }),
  setMessages: (msgs) => set({ messages: msgs.map((m) => ({ ...m, ts: m.ts ?? Date.now() })) }),
  startStream: async () => {
    const { messages, language, scenarioId } = get();
    set({ isStreaming: true });
    try {
      const reader = await streamChat({ messages, language, scenarioId });
      let assistantBuffer = "";
      // Add a placeholder assistant message to update incrementally
      set({ messages: [...messages, { role: "assistant" as Role, content: "", ts: Date.now() }] });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        assistantBuffer += chunk;
        const updated = [...messages, { role: "assistant" as Role, content: assistantBuffer, ts: Date.now() }];
        set({ messages: updated });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isStreaming: false });
    }
  },
  stopStream: () => set({ isStreaming: false }),
  requestHints: async () => {
    const { language, messages } = get();
    try {
      const items = await getHints(messages, language);
      set({ hints: { items, visible: true } });
    } catch (e) {
      console.error(e);
    }
  },
  translateText: async (text: string) => {
    const { language } = get();
    try {
      const res = await translate(text, language);
      return res.translated;
    } catch (e) {
      console.error(e);
      return text;
    }
  },
}));