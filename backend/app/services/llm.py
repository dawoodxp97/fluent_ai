from typing import Iterable, List, Dict
from ..config import Config
from ..models import ChatMessage

class LLMService:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.provider = cfg.PROVIDER
        self.model = cfg.MODEL
        self.openai_client = None
        self.groq_client = None
        self.anthropic_client = None
        try:
            if cfg.OPENAI_API_KEY:
                import openai
                self.openai_client = openai.OpenAI(api_key=cfg.OPENAI_API_KEY)
        except Exception:
            self.openai_client = None
        try:
            if cfg.GROQ_API_KEY:
                from groq import Groq
                self.groq_client = Groq(api_key=cfg.GROQ_API_KEY)
        except Exception:
            self.groq_client = None
        try:
            if cfg.ANTHROPIC_API_KEY:
                import anthropic
                self.anthropic_client = anthropic.Anthropic(api_key=cfg.ANTHROPIC_API_KEY)
        except Exception:
            self.anthropic_client = None

    def _system_prompt(self, language: str) -> str:
        return (
            f"You are a patient native speaker helping a learner practice {language}. "
            f"Be concise and encouraging. Keep replies short (1-2 sentences). "
            f"Maintain the scenario context if provided."
        )

    def _to_openai_messages(self, messages: List[ChatMessage], language: str) -> List[Dict]:
        sys = {"role": "system", "content": self._system_prompt(language)}
        return [sys] + [m.model_dump() for m in messages]

    def generate_stream(self, messages: List[ChatMessage], language: str) -> Iterable[str]:
        # Prefer selected provider but gracefully fall back
        if self.provider == "openai" and self.openai_client:
            try:
                stream = self.openai_client.chat.completions.create(
                    model=self.model,
                    messages=self._to_openai_messages(messages, language),
                    max_tokens=self.cfg.MAX_TOKENS,
                    stream=True,
                )
                for event in stream:
                    if event.choices and event.choices[0].delta and event.choices[0].delta.content:
                        yield event.choices[0].delta.content
                return
            except Exception:
                pass
        if self.provider == "groq" and self.groq_client:
            try:
                stream = self.groq_client.chat.completions.create(
                    model=self.model,
                    messages=self._to_openai_messages(messages, language),
                    stream=True,
                )
                for event in stream:
                    if event.choices and event.choices[0].delta and event.choices[0].delta.content:
                        yield event.choices[0].delta.content
                return
            except Exception:
                pass
        if self.provider == "anthropic" and self.anthropic_client:
            try:
                with self.anthropic_client.messages.stream(
                    model=self.model,
                    max_tokens=self.cfg.MAX_TOKENS,
                    messages=[{"role": "user", "content": self._system_prompt(language)}]
                ) as stream:
                    for text in stream.text_stream:
                        yield text
                return
            except Exception:
                pass
        # Mock fallback: echo last user message with polite prefix
        last_user = next((m.content for m in reversed(messages) if m.role == "user"), "" )
        fallback = f"Entendido. {last_user}" if language.lower().startswith("span") else f"Compris. {last_user}"
        for ch in fallback:
            yield ch