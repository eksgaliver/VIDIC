---
name: memory-saver
description: Strategies and workflows to preserve, compact, and manage memory and project context efficiently. Use when handling complex multi-step sessions, large codebases, or when context retention and memory persistence are critical.
---

# Memory Saver with Context

This skill instructs the agent on how to manage context and conversation memory with maximum efficiency and high fidelity over extended workflows.

## Core Principles

1. **Externalize Durable State**:
   - Never rely solely on chat conversation history for critical project state.
   - Maintain a concise `docs/CONTEXT.md` or `ARCHITECTURE.md` in the workspace summarizing:
     - Architecture decisions and tech stack.
     - Active feature state and module boundaries.
     - Known invariants, gotchas, and unresolved bugs.
2. **Progressive Disclosure**:
   - Do not dump entire files into conversation context unless explicitly required.
   - Read specific line ranges or grep target symbols instead of reading whole multi-thousand line files.
   - Summarize findings before taking actions, linking to exact file paths.
3. **Session Anchoring & Working Memory**:
   - At the beginning of long multi-step tasks, record a concise checklist of deliverables.
   - Check off items as they complete to keep a clear mental snapshot of progress.
   - Discard transient exploratory logs and temporary outputs once synthesized.
4. **Context Compaction Recommendations**:
   - When context grows large or reaches saturation, summarize the current session state into a structured note.
   - Suggest running the `/compact` command to consolidate context while retaining critical decisions.
5. **Deduplication of Information**:
   - Avoid re-quoting long code snippets or restating user requirements verbatim.
   - Refer to file paths with line numbers (e.g. `src/server.ts#L45-L60`).

