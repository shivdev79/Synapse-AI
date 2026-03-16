"""
Firestore-backed Memory Manager for VisionMate AI.
Stores conversation history and user preferences.
Falls back to in-memory dict when Firestore is unavailable (local dev).
"""
import os
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ---------- try importing Firestore ----------
try:
    from google.cloud import firestore

    _FIRESTORE_AVAILABLE = True
except ImportError:
    _FIRESTORE_AVAILABLE = False
    logger.warning("google-cloud-firestore not installed – using in-memory fallback.")


class MemoryManager:
    """Persist chat history + user preferences in Firestore (or in-memory)."""

    def __init__(self):
        self._local_sessions: dict = {}   # fallback store
        self._local_prefs: dict = {}
        self.db = None

        if _FIRESTORE_AVAILABLE:
            try:
                self.db = firestore.Client()
                logger.info("Firestore client initialised.")
            except Exception as exc:
                logger.warning("Firestore unavailable (%s) – running transient.", exc)

    # ------------------------------------------------------------------ history
    def save_chat(self, session_id: str, role: str, text: str):
        entry = {
            "id": str(uuid.uuid4()),
            "role": role,
            "text": text,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        if self.db:
            self.db.collection("sessions").document(session_id).set(
                {"history": firestore.ArrayUnion([entry]),
                 "updated_at": datetime.now(timezone.utc).isoformat()},
                merge=True,
            )
        else:
            self._local_sessions.setdefault(session_id, []).append(entry)

    def get_history(self, session_id: str) -> list:
        if self.db:
            doc = self.db.collection("sessions").document(session_id).get()
            return doc.to_dict().get("history", []) if doc.exists else []
        return self._local_sessions.get(session_id, [])

    def clear_history(self, session_id: str):
        if self.db:
            self.db.collection("sessions").document(session_id).delete()
        else:
            self._local_sessions.pop(session_id, None)

    # -------------------------------------------------------------- preferences
    def save_preferences(self, user_id: str, prefs: dict):
        if self.db:
            self.db.collection("users").document(user_id).set(
                {"preferences": prefs, "updated_at": datetime.now(timezone.utc).isoformat()},
                merge=True,
            )
        else:
            self._local_prefs[user_id] = prefs

    def get_preferences(self, user_id: str) -> dict:
        if self.db:
            doc = self.db.collection("users").document(user_id).get()
            return doc.to_dict().get("preferences", {}) if doc.exists else {}
        return self._local_prefs.get(user_id, {})
