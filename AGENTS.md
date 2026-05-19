# AI Agent Rules (Canonical)

## Priority (lower number wins)

1. User request in the active session.
2. This file.
3. `.agents/rules/karpathy-rules.md` (behavioral defaults: think first, simplicity, surgical changes, goal-driven execution).
4. Project knowledge base.
5. Tool/platform safety constraints.

## Communication

- Lead with the result or action. Add context only when it adds value.
- Concise output, thorough reasoning. No openers, preambles, or closers.
- Comments in code: English. Chat with the user: language of the user's last message.

## Output formatting

- Hyphens only in compound words and numeric ranges. Never use `--`, ` - `, em-dash, or en-dash as a stylistic break.
- Avoid parenthetical asides; rewrite linearly.
