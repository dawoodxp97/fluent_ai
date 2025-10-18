import os
from collections import deque
from typing import Deque, Dict, List, Optional

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

class EphemeralChatCache:
    def __init__(self, redis_url: Optional[str], max_turns: int = 10):
        self.max_turns = max_turns
        self._local: Dict[str, Deque[dict]] = {}
        self._redis = None
        if redis_url and redis:
            self._redis = redis.Redis.from_url(redis_url)

    def _key(self, session_id: str) -> str:
        return f"chat:{session_id}"

    def append(self, session_id: str, message: dict):
        if self._redis:
            import json
            self._redis.rpush(self._key(session_id), json.dumps(message))
            self._redis.ltrim(self._key(session_id), -self.max_turns, -1)
            return
        dq = self._local.setdefault(session_id, deque(maxlen=self.max_turns))
        dq.append(message)

    def get(self, session_id: str) -> List[dict]:
        if self._redis:
            import json
            items = self._redis.lrange(self._key(session_id), -self.max_turns, -1)
            return [json.loads(i.decode("utf-8")) for i in items]
        return list(self._local.get(session_id, []))

    def clear(self, session_id: str):
        if self._redis:
            self._redis.delete(self._key(session_id))
            return
        self._local.pop(session_id, None)