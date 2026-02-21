# netnet-cockpit — Telegram Operator Bridge

Read/propose Telegram bridge contract for `netnet/cockpit`.

## Route ownership

- `POST /api/telegram/webhook`

## Semantics

- Accept Telegram webhook messages and append them as operator chat input.
- Generate an assistant response through the Operator engine.
- Preserve proposal metadata if a valid `skill.proposal` envelope is returned.
- Enforce read/propose-only behavior for Telegram source; execution stays UI-gated.

## Safety rules

- Webhook calls must include the shared `secret` query parameter.
- Missing/invalid secret returns `401`.
- Any execution-oriented response is replaced with:
  - `Execution requires Operator UI approval.`

## Expected output

`{ ok: true }` on successful ingest + reply dispatch, otherwise a normalized error payload.
