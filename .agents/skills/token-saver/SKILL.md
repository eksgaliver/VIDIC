---
name: token-saver
description: Techniques and rules for minimizing token consumption, eliminating unnecessary generation, and performing surgical code edits. Use when working on token-sensitive tasks, large diffs, or aiming for maximum execution speed and cost efficiency.
---

# Token Saver

Maximize token efficiency across prompts, tool calls, and assistant replies without sacrificing code correctness or robustness.

## Rules of Engagement

1. **Surgical Diffs Over File Rewrites**:
   - Always prefer targeted line replacements via `edit_file` over overwriting entire multi-hundred line files.
   - Never print whole files in assistant messages when a 5-line diff or targeted explanation suffices.
2. **Lean Tool Invocations**:
   - Narrow command outputs: pipe terminal commands to `head`, `tail`, `Select-Object -First`, or grep for relevant lines rather than letting commands emit thousands of lines.
   - Read files by targeting specific line ranges (`StartLine`, `EndLine`) when the location is known.
3. **No Fluff & Zero Throat-Clearing**:
   - Eliminate filler openings ("Sure, I can help you with that!", "Here is the code you requested:").
   - Deliver answers directly: code, diff, explanation, or direct confirmation.
4. **Compact Code Formatting**:
   - Write clean, idiomatic code without bloated redundant comments explaining obvious language syntax.
   - Preserve existing project formatting without adding decorative ASCII banners.
5. **High-Signal Reporting**:
   - In responses, summarize:
     - What changed (1-2 sentences).
     - Files modified (with clickable links).
     - Verification status (test results or execution output).

