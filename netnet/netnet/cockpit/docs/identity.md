# Agent Identity (Unit 10)

The cockpit stores three identity fields locally in your browser (localStorage):

- display name
- agent wallet address (Base / EVM 0x…)
- optional ERC‑8004 registry ID or profile URL (stored as text)

These values are **not** sent anywhere automatically. They are only included when you build proof objects from the UI.

## Safety

- Do **not** paste private keys or seed phrases.
- This feature is intentionally local-only until we add a server-side identity registry.
