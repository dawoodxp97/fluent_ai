from flask import Blueprint, request, Response, jsonify, make_response
import uuid
from .config import Config
from .models import ChatStreamRequest, ChatMessage, Hint
from .services.llm import LLMService
from .cache import EphemeralChatCache
import json

bp = Blueprint("api", __name__)

_cfg = Config()
_llm = LLMService(_cfg)
_cache = EphemeralChatCache(_cfg.REDIS_URL, _cfg.SLIDING_WINDOW_TURNS)

SCENARIOS = [
    {"id": "cafe-order", "title": "At a Café", "language": "Spanish", "description": "Order coffee and pastries", "starter": "Hola, ¿me puede dar un café con leche?"},
    {"id": "hotel-checkin", "title": "Hotel Check-in", "language": "Spanish", "description": "Check into a hotel", "starter": "Buenas tardes, tengo una reserva."},
    {"id": "airport-security", "title": "Airport Security", "language": "Spanish", "description": "Pass through security politely"},
    {"id": "small-talk", "title": "Small Talk", "language": "Spanish", "description": "Casual conversation at a conference"},
    {"id": "restaurant-reservation", "title": "Restaurant Reservation", "language": "Spanish", "description": "Book a table by phone"},
    {"id": "directions", "title": "Asking for Directions", "language": "Spanish", "description": "Find your way in a city"},
    {"id": "shopping", "title": "Shopping", "language": "Spanish", "description": "Ask about sizes and prices"},
    {"id": "pharmacy", "title": "At the Pharmacy", "language": "Spanish", "description": "Ask for common medicine"},
    {"id": "train-ticket", "title": "Train Tickets", "language": "Spanish", "description": "Buy tickets and ask schedules"},
    {"id": "apartment-viewing", "title": "Apartment Viewing", "language": "Spanish", "description": "Discuss rental terms"},
    {"id": "job-interview", "title": "Job Interview", "language": "Spanish", "description": "Practice common interview questions"},
    {"id": "sales-pitch", "title": "Sales Pitch", "language": "German", "description": "Present a product to a client"},
    {"id": "meeting-lead", "title": "Leading a Meeting", "language": "German", "description": "Set agenda and drive outcomes"},
    {"id": "introductions", "title": "Introductions", "language": "French", "description": "Meet new people politely"},
    {"id": "bakery-order", "title": "At the Bakery", "language": "French", "description": "Order baguettes and pastries", "starter": "Bonjour, je voudrais deux baguettes, s'il vous plaît."},
]

@bp.post("/session/start")
def start_session():
    data = request.get_json(force=True)
    language = data.get("language", "Spanish")
    session_id = str(uuid.uuid4())
    resp = make_response({"sessionId": session_id})
    resp.set_cookie(_cfg.SESSION_COOKIE_NAME, session_id, httponly=True, samesite="Lax")
    return resp

@bp.get("/scenarios")
def scenarios():
    lang = request.args.get("language")
    items = [s for s in SCENARIOS if not lang or s["language"].lower() == lang.lower()]
    return jsonify(items)

@bp.post("/chat/stream")
def chat_stream():
    session_id = request.cookies.get(_cfg.SESSION_COOKIE_NAME) or str(uuid.uuid4())
    req = ChatStreamRequest.model_validate(request.get_json(force=True))

    # Append incoming messages to cache for context window management
    for m in req.messages:
        _cache.append(session_id, m.model_dump())

    # Build a sliding window from cache + current messages
    cached = _cache.get(session_id)
    cached_msgs = [ChatMessage.model_validate(x) for x in cached]
    combined = cached_msgs + req.messages
    window = combined[-_cfg.SLIDING_WINDOW_TURNS :]

    def generate():
        for chunk in _llm.generate_stream(window, req.language):
            yield chunk
    return Response(generate(), mimetype="text/plain")

@bp.post("/hints")
def hints():
    data = request.get_json(force=True)
    messages = [ChatMessage.model_validate(m) for m in data.get("messages", [])]
    language = data.get("language", "Spanish")
    last_user = next((m.content for m in reversed(messages) if m.role == "user"), "")
    prompt = (
        f"Provide three helpful possible replies in {language} for this learner input: '{last_user}'. "
        f"Return JSON with fields: text and politeness (casual, neutral, formal). Keep replies simple."
    )
    # Reuse LLM in non-streaming fashion via accumulating chunks
    acc = ""
    for ch in _llm.generate_stream([ChatMessage(role="user", content=prompt)], language):
        acc += ch
    try:
        payload = json.loads(acc)
        items = [Hint.model_validate(i).model_dump() for i in payload]
    except Exception:
        # Fallback simple hints
        items = [
            {"text": f"Sí, por favor. {last_user}", "politeness": "neutral"},
            {"text": f"Claro, gracias. {last_user}", "politeness": "casual"},
            {"text": f"Por favor, {last_user}", "politeness": "formal"},
        ]
    return jsonify(items)

@bp.post("/translate")
def translate():
    data = request.get_json(force=True)
    text = data.get("text", "")
    target = data.get("targetLanguage", "Spanish")
    # Simple LLM-driven translation
    acc = ""
    for ch in _llm.generate_stream([ChatMessage(role="user", content=f"Translate to {target}: {text}")], target):
        acc += ch
    return jsonify({"translated": acc})

@bp.post("/tts")
def tts():
    data = request.get_json(force=True)
    text = data.get("text", "")
    voice = data.get("voice") or ("Bella" if _cfg.MODEL else "")
    if _cfg.ELEVENLABS_API_KEY:
        try:
            import requests
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice or 'Bella'}"
            headers = {
                "xi-api-key": _cfg.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            }
            payload = {"text": text, "voice_settings": {"stability": 0.5, "similarity_boost": 0.5}}
            r = requests.post(url, headers=headers, json=payload)
            if r.status_code == 200:
                resp = make_response(r.content)
                resp.headers["Content-Type"] = "audio/mpeg"
                return resp
        except Exception:
            pass
    # Fallback empty audio
    return Response(b"", mimetype="audio/mpeg")

@bp.post("/stt")
def stt():
    f = request.files.get("file")
    if not f:
        return jsonify({"text": ""})
    if _cfg.OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=_cfg.OPENAI_API_KEY)
            transcription = client.audio.transcriptions.create(model="whisper-1", file=f)
            return jsonify({"text": transcription.text})
        except Exception:
            pass
    return jsonify({"text": ""})

@bp.post("/feedback")
def feedback():
    data = request.get_json(force=True)
    messages = [ChatMessage.model_validate(m) for m in data.get("messages", [])]
    language = data.get("language", "Spanish")

    # Heuristic scoring focused on learner (user) messages
    user_texts = [m.content for m in messages if m.role == "user"]
    text = " ".join(user_texts[-10:]).strip()

    import re, statistics
    words = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ']+", text)
    total = len(words)
    unique = len({w.lower() for w in words})
    ttr = (unique / total) if total else 0.0  # type-token ratio
    long_words = [w for w in words if len(w) >= 6]
    long_ratio = (len(long_words) / total) if total else 0.0

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    avg_len = statistics.mean([len(s.split()) for s in sentences]) if sentences else 0.0
    punct_endings = re.findall(r"[.!?]", text)
    punct_rate = (len(punct_endings) / max(len(sentences), 1)) if sentences else 0.0

    # Grammar score: sentence length and punctuation consistency
    grammar = 60
    grammar += 10 if avg_len >= 7 else -5
    grammar += 10 if punct_rate >= 0.6 else -10
    grammar = max(0, min(100, int(round(grammar))))

    # Vocabulary score: variety and longer word usage
    vocab = 55 + int(round(ttr * 30)) + int(round(long_ratio * 15))
    vocab = max(0, min(100, vocab))

    top_mistakes = []
    if punct_rate < 0.5:
        top_mistakes.append("Missing punctuation at sentence ends")
    if avg_len < 6:
        top_mistakes.append("Very short utterances; expand with details")
    if ttr < 0.45:
        top_mistakes.append("Low variety; repeated words")

    lang_lower = language.lower()
    if "span" in lang_lower:
        recommendations = [
            "Use connectors like 'pero', 'porque', 'entonces', 'además'",
            "Practice verb conjugations in present and past",
            "Aim for punctuation at sentence ends",
        ]
    elif "french" in lang_lower:
        recommendations = [
            "Use connectors like 'mais', 'parce que', 'alors', 'ensuite'",
            "Review gender and articles (le/la/les)",
            "Add punctuation and accents where needed",
        ]
    elif "german" in lang_lower:
        recommendations = [
            "Use connectors like 'aber', 'weil', 'also', 'außerdem'",
            "Practice verb position and separable verbs",
            "End sentences with punctuation consistently",
        ]
    else:
        recommendations = [
            "Use basic connectors to link ideas",
            "Practice common verb tenses",
            "End sentences with punctuation",
        ]

    summary_parts = []
    summary_parts.append("Grammar is solid" if grammar >= 80 else ("Grammar is decent with a few issues" if grammar >= 60 else "Grammar needs attention"))
    summary_parts.append("vocabulary is strong" if vocab >= 80 else ("vocabulary is okay" if vocab >= 60 else "vocabulary range is limited"))
    summary = "; ".join(summary_parts) + "."

    payload = {
        "grammar_score": grammar,
        "vocab_score": vocab,
        "summary": summary,
        "top_mistakes": top_mistakes or ["Focus on sentence structure and variety"],
        "recommendations": recommendations,
    }
    return jsonify(payload)