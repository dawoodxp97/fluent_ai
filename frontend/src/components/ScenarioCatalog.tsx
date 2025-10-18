"use client";
import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "../store/chatStore";
import type { Scenario } from "../lib/api";
import { getScenarios } from "../lib/api";

export default function ScenarioCatalog() {
  const language = useChatStore((s) => s.language);
  const setScenario = useChatStore((s) => s.setScenario);
  const scenarioId = useChatStore((s) => s.scenarioId);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const filtered = useMemo(
    () => scenarios.filter((s) => s.language.toLowerCase() === language.toLowerCase()),
    [language, scenarios]
  );

  useEffect(() => {
    getScenarios(language)
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, [language]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">Scenarios</h3>
      {filtered.length === 0 ? (
        <div className="mt-2 text-xs text-gray-500">No scenarios found</div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`rounded border p-2 text-left hover:bg-gray-50 ${
                scenarioId === s.id ? "border-blue-500" : "border-gray-200"
              }`}
            >
              <div className="text-sm font-medium">{s.title}</div>
              <div className="text-xs text-gray-500">{s.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}