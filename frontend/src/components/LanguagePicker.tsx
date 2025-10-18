"use client";
import { useChatStore } from "../store/chatStore";

const LANGS = ["Spanish", "French", "German"] as const;

type Props = { className?: string };

export default function LanguagePicker({ className }: Props) {
  const language = useChatStore((s) => s.language);
  const setLanguage = useChatStore((s) => s.setLanguage);
  return (
    <div className={className}>
      <label className="block text-sm text-gray-600 mb-1">Target language</label>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white p-2 text-sm"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}