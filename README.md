# Threadlink

**Portable context infrastructure for stateless LLM systems.**

Threadlink transforms long AI chat sessions into dense, structured context cards that can be reused across platforms. It addresses a core limitation of commercial LLMs: conversation state does not persist between sessions.

Built for the Bolt.new 2025 Hackathon.

---

## Problem

LLMs are stateless by design. Every new session begins without prior context. For users working on long-running ideas, research threads, or multi-session projects, this creates friction:

- Repeating context manually  
- Losing narrative continuity  
- Fragmented workflows across platforms  

Threadlink introduces an external memory layer by compressing full conversations into portable context artifacts that can be dropped into any new session.

---

## What It Does

- Converts large chat transcripts into structured, dense summaries  
- Preserves chronological and conceptual flow  
- Generates reusable “context cards” for cross-session continuity  
- Runs entirely client-side using user-provided API keys  

---

## Design Principles

### Client-Side Only
All processing happens in the browser. No transcripts are stored, proxied, or logged by any server.

### BYOK (Bring Your Own Key)
Supports OpenAI, Gemini, Mistral, and Groq. API keys are session-scoped and never persisted.

### Failure-Tolerant Pipeline
Chunk-level failures are surfaced explicitly. Partial results are preserved instead of discarded.

### Vendor-Agnostic
Threadlink is infrastructure-oriented and not tied to a single LLM ecosystem.

---

## How It Works

1. **Token-Aware Chunking**  
   The conversation is segmented into sequential, size-bounded chunks.

2. **Parallel Summarization**  
   Independent LLM instances process chunks concurrently to reduce latency.

3. **Deterministic Stitching**  
   Outputs are reassembled in order, with explicit markers for failed segments if applicable.

4. **Context Card Emission**  
   The final artifact is compact, portable, and reusable across sessions and platforms.

---

## Architecture

Threadlink is implemented as a fully client-side, serverless application.

### Core Pipeline (TypeScript)

- **Cleaner** – Removes platform boilerplate  
- **Splicer** – Chunk segmentation engine  
- **Batcher** – Prepares chunks for concurrent processing  
- **Orchestrator** – Concurrency control, retry logic, and failure handling  

### Frontend

- React (Bolt.new scaffold)  
- Vite  
- TailwindCSS  

### Testing

- Playwright (end-to-end testing)  
- Jest / Vitest (unit and integration testing)  

### Deployment

- Netlify  

---

## Live Demo

https://threadlink.xyz  
Demo video: https://youtu.be/WNVgECm5cVc?si=yFYXMJxF6GBB0DAY

---

## Why This Project Matters

Most tools build on top of LLMs.

Threadlink addresses the structural weakness between sessions. As LLM workflows become longer and more complex, context portability becomes infrastructure — not convenience.

---

## Author

https://github.com/skragus