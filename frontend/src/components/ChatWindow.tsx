"use client";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import toast, { Toaster } from "react-hot-toast";
import { tts, startSession } from "../lib/api";
import { Volume2, Lightbulb, Languages, Mic, ChevronDown } from "lucide-react";

export default function ChatWindow() {
  const { messages, addMessage, startStream, isStreaming, requestHints, hints, translateText } = useChatStore();
  const language = useChatStore((s) => s.language);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  // Feedback state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    grammar_score: number;
    vocab_score: number;
    summary: string;
    recommendations: string[];
  } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    // Start a session whenever language changes (sets cookie)
    startSession(language).catch(() => {});
  }, [language]);

  const send = async () => {
    if (!input.trim()) return;
    addMessage({ role: "user", content: input });
    setInput("");
    // Immediately request feedback after user submission
    try {
      const { getFeedback } = await import("../lib/api");
      const currentMsgs = useChatStore.getState().messages;
      const report = await getFeedback(currentMsgs, language);
      setFeedback({
        grammar_score: report.grammar_score,
        vocab_score: report.vocab_score,
        summary: report.summary,
        recommendations: report.recommendations,
      });
      setFeedbackOpen(true);
      toast.success(`Grammar ${report.grammar_score}/100 · Vocab ${report.vocab_score}/100`, { duration: 3000 });
    } catch (err) {
      console.error(err);
    }
    await startStream();
  };

  const speakLastAssistant = async () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return toast("No assistant message yet");
    try {
      const audio = await tts(last.content);
      const blob = new Blob([audio], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audioEl = new Audio(url);
      audioEl.play();
    } catch (err) {
      console.error(err);
      if (process.env.NEXT_PUBLIC_ENABLE_TTS_FALLBACK === "true" && typeof window !== "undefined") {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(last.content);
        synth.speak(utter);
      } else {
        toast.error("TTS unavailable");
      }
    }
  };

  const handleHint = async () => {
    await requestHints();
  };

  const handleTranslateSelection = async () => {
    const sel = window.getSelection()?.toString();
    if (!sel) return toast("Select text to translate");
    const translated = await translateText(sel);
    toast.success(translated, { duration: 4000 });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        // Show a toast while we process
        toast.loading("Transcribing…", { id: "stt" });
        try {
          const file = new File([blob], "input.webm", { type: "audio/webm" });
          const { stt } = await import("../lib/api");
          const res = await stt(file);
          toast.dismiss("stt");
          if (res.text) {
            setInput(res.text);
            toast.success("Transcribed");
          } else {
            toast("No speech detected");
          }
        } catch (err) {
          console.error(err);
          toast.dismiss("stt");
          toast.error("STT failed");
        }
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      setRecording(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto rounded border border-gray-200 bg-white p-4">
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block max-w-[80%] rounded px-3 py-2 text-sm ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type your message…"
          className="flex-1 rounded border border-gray-300 bg-white p-2 text-sm"
        />
        <button
          onClick={send}
          disabled={isStreaming}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
        <button
          onClick={handleHint}
          title="Hints"
          className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50"
        >
          <Lightbulb className="h-4 w-4" />
        </button>
        <button
          onClick={handleTranslateSelection}
          title="Translate selection"
          className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50"
        >
          <Languages className="h-4 w-4" />
        </button>
        <button
          onClick={speakLastAssistant}
          title="Play response"
          className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50"
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          title={recording ? "Recording…" : "Hold to record"}
          className={`rounded border border-gray-300 bg-white p-2 hover:bg-gray-50 ${recording ? "bg-red-100" : ""}`}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      {hints.visible && hints.items.length > 0 && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm">
          <div className="mb-2 font-medium">Hints</div>
          <div className="grid grid-cols-3 gap-2">
            {hints.items.map((h, idx) => (
              <button
                key={idx}
                onClick={() => {
                  addMessage({ role: "user", content: h.text });
                  startStream();
                }}
                className="rounded border border-amber-200 bg-white px-2 py-1 text-left hover:bg-amber-100"
              >
                <div className="text-[11px] uppercase text-amber-700">{h.politeness}</div>
                <div>{h.text}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Panel */}
      {feedback && (
        <div className="mt-3 rounded border border-blue-300 bg-blue-50 p-2 text-sm">
          <button
            onClick={() => setFeedbackOpen((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <div className="font-medium">Feedback</div>
            <ChevronDown className={`h-4 w-4 transition-transform ${feedbackOpen ? "rotate-180" : "rotate-0"}`} />
          </button>
          {feedbackOpen && (
            <div className="mt-2 space-y-2">
              <div className="text-sm text-gray-700">{feedback.summary}</div>
              <div className="flex gap-2">
                <span className="inline-block rounded bg-white px-2 py-1 text-xs text-blue-700 border border-blue-200">Grammar {feedback.grammar_score}/100</span>
                <span className="inline-block rounded bg-white px-2 py-1 text-xs text-blue-700 border border-blue-200">Vocab {feedback.vocab_score}/100</span>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-800">Recommendations</div>
                <ul className="mt-1 list-disc pl-5 text-xs text-blue-900">
                  {feedback.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      <Toaster />
    </div>
  );
}