# OpenClaw Skill Packs (Vendored)

This folder vendors skill packs from the OpenClaw ecosystem so they can be used as **promptable skills** alongside netnet’s HTTP surfaces.

## Installed
- `bankr/` — BankrBot operations skill pack (token ops, trading, transfers, portfolio, automation).

## How to use
- Reference these docs when writing agent prompts.
- Prefer calling netnet’s wrapper routes (e.g. `/api/agent/bankr/*` if present) so spend limits, allowlists, and proofs apply.
- When a skill requires an irreversible action, keep it **PROPOSE_ONLY** and require explicit operator approval.

## Source
Vendored from the `BankrBot/openclaw-skills` repository (snapshot: `openclaw-skills-main.zip` provided in-chat).
