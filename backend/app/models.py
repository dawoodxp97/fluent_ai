from pydantic import BaseModel, Field
from typing import List, Literal, Optional

Role = Literal["user", "assistant", "system"]

class ChatMessage(BaseModel):
    role: Role
    content: str
    ts: Optional[int] = None

class ChatStreamRequest(BaseModel):
    messages: List[ChatMessage]
    language: str
    scenarioId: Optional[str] = None

class Hint(BaseModel):
    text: str
    politeness: Literal["casual", "neutral", "formal"]

class FeedbackReport(BaseModel):
    grammar_score: int = Field(ge=0, le=100)
    vocab_score: int = Field(ge=0, le=100)
    summary: str
    top_mistakes: List[str]
    recommendations: List[str]