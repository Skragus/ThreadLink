# 🧵 Threadlink

**A portable memory layer for the stateless world of LLMs.**

Threadlink transforms long, chaotic AI chat transcripts into dense, structured, and portable context cards, solving the critical problem of conversation amnesia.

---

### 🎯 Why It Matters

Commercial LLMs are fundamentally stateless. Every session starts from zero, forcing users to repeat context and lose valuable narrative flow. Threadlink fixes this by creating an **external, portable memory layer**, enabling true continuity and stateful interaction across any platform or session.

---

### 🛠 Features

-   **Parallel Processing Pipeline:** Deploys multiple "summarizer drones" to process conversation chunks concurrently for speed and efficiency.
-   **Drone Failure Traces:** Instead of failing, the pipeline gracefully handles errors by inserting diagnostic markers (`[⚠ Drone X failed]`), ensuring a resilient and predictable output every time.
-   **BYOK (Bring Your Own Key):** Natively supports OpenAI, Google Gemini, and Anthropic Claude models.
-   **Zero-Trust Privacy Architecture:** All processing and API calls happen **entirely in the user's browser**. No data ever touches our servers, ensuring absolute privacy and security.
-   **Live & Deployed:** Try it now at [**threadlink.xyz**](https://threadlink.xyz)

---

### ⚙️ How It Works

1.  **Semantic Chunking:** The input conversation is split into token-aware, sequential chunks.
2.  **Parallel Drone Summarization:** Each chunk is assigned to a drone (an independent LLM instance) that summarizes it based on a core set of instructions.
3.  **Resilient Stitching:** The outputs from all drones are stitched together in the correct order. Any drone failures are explicitly marked, preserving the integrity of the output.
4.  **Context Card Generation:** The final, dense summary is presented as a portable context card, ready to be used anywhere.

---

### 🛠️ Architecture & Tech Stack

This project is built on a **100% client-side, serverless architecture** to guarantee user privacy and eliminate backend infrastructure.

* **Core Summarization Pipeline:** A custom-built, multi-stage processing engine written in TypeScript/JavaScript, featuring:
    * A content **Cleaner** to clean some boilerplate.
    * A semantic **Splicer** to deconstruct conversations.
    * A parallel **Batcher** to prepare chunks for concurrent processing.
    * A resilient **Orchestrator** to manage the drone fleet, handle errors, and stitch the final output.

* **Front-End:**
    * **React** for the user interface.
    * **Vite** for a high-performance build process.
    * **TailwindCSS** for utility-first styling.

* **API Integrations:**
    * Direct, client-side integrations with **OpenAI, Google Gemini, and Anthropic Claude**.

* **Testing, Tooling & Deployment:**
    * **Playwright** for comprehensive end-to-end testing across all major browsers.
    * **Jest & Vitest** for unit and integration testing.
    * **Netlify** for continuous deployment.
    * Includes custom repository analysis tooling (**QuickMap.py**) for automated code auditing.

---

### 🧪 Demo

[Link to Live Demo / GIF]

---

### 🧠 Author

https://github.com/skragus

---

### 🏁 Hackathon Entry

This project was built for the **Bolt.new 2025 Hackathon**. It targets the following categories by design:

-   🧠 **Most Useful Tool:** It solves a universal, daily pain point for anyone who uses LLMs seriously, directly improving workflow efficiency.
-   ⚡ **Sharpest Problem Fit:** The solution (a client-side, BYOK summarization pipeline) is precisely tailored to solve the problem (LLM context amnesia) without over-engineering or introducing unnecessary complexity like databases or user accounts.
-   🎯 **"We Didn't Know We Needed This":** While many focus on building on top of LLMs, Threadlink addresses the meta-problem of *state management between them*, a subtle but critical piece of missing infrastructure for power users.