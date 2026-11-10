# Model providers

The agent asks one provider at a time, in the order below, with a 6 second timeout. The first
reply that parses as JSON wins. If every provider fails, the agent falls back to a fixed rule
(cheapest catalog item within budget), so the demo still runs with no model at all.

Keys are read at request time from files in `$SECRETS_DIR` (default `/home/box/.secrets`).
A provider whose key file is missing is skipped. Only free tiers are used.

Probe on 2026-11-10 (`npm run probe`, one tiny request each, raw results in `data/provider-probe.json`):

| Order | Provider | Model | Result |
|---|---|---|---|
| 1 | Groq | `openai/gpt-oss-20b` (`reasoning_effort: low`) | works, 0.5-2 s |
| 2 | Google AI Studio | `gemini-3.1-flash-lite` (`reasoning_effort: none`) | works, ~0.5 s. `gemini-2.5-flash(-lite)` return 404 for new keys; `gemini-flash-lite-latest` timed out |
| 3 | OpenRouter | `nvidia/nemotron-3.5-lightning:free` | works, ~3.5 s. `google/gemma-4-*:free` were rate limited upstream (429) |
| 4 | NVIDIA NIM | `nvidia/nemotron-3.5-lightning-30b-a3b` | works, ~3.7 s |
| 5 | Hugging Face | `meta-llama/Llama-3.3-70B-Instruct` | not probed; used once `HF_TOKEN` exists |
| 6 | GitHub Models | `openai/gpt-4o-mini` | unreachable from the build machine: `models.github.ai` answers `200 OK` with a plain-text stub, so it is tried last |

Not used: SambaNova and Cerebras (both require a card).
