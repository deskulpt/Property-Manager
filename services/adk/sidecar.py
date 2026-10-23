"""
Thin health sidecar for optional Python ADK installs.

Does not touch Easy Rental SQLite or tenant data.
Grounded portfolio tools live in Next.js lib/adk/.
"""

from __future__ import annotations

import os

from fastapi import FastAPI

app = FastAPI(title="Easy Rental ADK sidecar", version="0.1.0")


def _mode() -> str:
    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_GENAI_API_KEY") or "").strip()
    return "gemini" if len(key) >= 20 else "mock"


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "easy-rental-adk-sidecar",
        "mode": _mode(),
        "note": "Portfolio tools run in Next.js (lib/adk). This process is optional.",
        "patterns_from": "https://github.com/deskulpt/adk-okf-grounded-chat",
    }


@app.post("/echo")
async def echo(payload: dict):
    """Dev-only echo — does not call Gemini or open the DB."""
    return {
        "mode": _mode(),
        "received": payload,
        "reply": "Sidecar echo only. Use Next POST /api/ask for grounded turns.",
    }
