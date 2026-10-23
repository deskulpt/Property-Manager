# Optional Python ADK sidecar

Easy Rental’s **primary** Ask Easy path is in-process TypeScript (`lib/adk/`) so the Next app boots **without** Python or paid API keys.

This folder is a **thin optional sidecar** for teams that want the same Google ADK Python runner shape used in [`deskulpt/adk-okf-grounded-chat`](https://github.com/deskulpt/adk-okf-grounded-chat).

## When to use it

- Local experiments with `google-adk` + LiteLLM exactly like the OKF grounded-chat studio
- Streaming SSE prototypes before wiring back into Next

## When **not** to use it

- Default demos and CI — use Next `POST /api/ask` and `/landlord/ask-easy` instead
- Production tenant tools — keep `tenant_id` enforcement in the Next server (session cookie), never in a public sidecar

## Minimal run (optional)

```bash
cd services/adk
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# optional: export GEMINI_API_KEY=...
uvicorn sidecar:app --host 127.0.0.1 --port 8041
```

Health: `GET http://127.0.0.1:8041/health`

The sidecar does **not** open SQLite. It only echoes ADK/mock status so operators can verify Python ADK installs. Portfolio grounding stays in Next.

## Env

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Same as Next; without it the sidecar reports `mode=mock` |
| `OPENROUTER_API_KEY` | No | Optional LiteLLM route (OKF studio pattern) |

Never put keys in the browser or commit them.
