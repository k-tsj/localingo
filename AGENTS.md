# AGENTS.md

## Product Overview
localingo is a browser UI that leverages a fully local LLM (Ollama gemma2:2b) to handle English proofreading, Japanese translation, and alternative English rewrites in one workflow. Opening `localingo.html` is enough to run it, and all data stays on the local machine.

## File Layout
- `localingo.html` — Main UI with five vertical panels (Context / Input / Proofread Output / Japanese Translation / English Variants). Press Cmd/Ctrl+Enter in the input box to trigger the LLM pipeline.
- `localingo.css` — Shared color tokens, spacing, and responsive layout rules.
- `localingo.js` — Frontend logic for talking to Ollama, rendering results, and handling copy/clear actions.
- `docker-compose.yml` — Defines the standalone Ollama container (gemma2:2b) that exposes the local API on port 11434.

## Setup
1. Run `docker compose up -d` to start `localingo-ollama`.
2. Make sure `ollama pull gemma2:2b` has been executed inside the Ollama container (only required once).
3. From your development environment (host shell or any local terminal), serve `/workspace` via `python -m http.server` (or similar) and open `http://localhost:8000/localingo.html` in your browser.

## Usage
1. **Context panel**: Optionally paste related conversation threads or briefs; reset with the `clear` button.
2. **English input**: Type the sentence you want to proofread, then press `Cmd/Ctrl+Enter` to launch the pipeline. `copy` / `clear` buttons are provided.
3. **Proofread output**: Shows the corrected English while preserving structure; grab it with the `copy` button.
4. **Japanese translation**: Displays a natural business-level Japanese rendering of the input, also copyable.
5. **English variants**: Generates three native-sounding English options based on the Japanese translation, each with its own `copy` control.

## Implementation Notes
- The JS layer makes three sequential POSTs to `http://localhost:11434/api/generate` with `model: "gemma2:2b"` (proofread → Japanese translation → English variants).
- Status messages keep the user informed during requests; failures show red alerts plus placeholder text in each output panel.
- `isRunning` and `rerunPending` guard against shortcut spamming—if a request is in flight, an additional Cmd/Ctrl+Enter queues exactly one rerun once the current cycle finishes.

## Future TODO Ideas
- Offer alternative triggers beyond Cmd/Ctrl+Enter (e.g., a Run button or reintroducing idle detection).
- Stream responses from Ollama and render partial output in real time.
- Externalize prompt templates for easier tuning and localization.
