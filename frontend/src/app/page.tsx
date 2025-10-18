import LanguagePicker from "../components/LanguagePicker";
import ScenarioCatalog from "../components/ScenarioCatalog";
import ChatWindow from "../components/ChatWindow";

export default function Home() {
  return (
    <div className="min-h-screen p-6 sm:p-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">FluentAI</h1>
        <div className="w-48">
          <LanguagePicker />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px_1fr]">
        <aside className="rounded border border-gray-200 bg-white p-4">
          <ScenarioCatalog />
        </aside>
        <main className="rounded border border-gray-200 bg-white p-4">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}
