# Bankr Skill Pack ↔ netnet integration notes

The Bankr OpenClaw skill pack is documentation-first: it describes how an agent should reason, what inputs to gather,
and which Bankr endpoints / workflows to call.

In netnet, the intended pattern is:

1) Agent reads the relevant Bankr skill doc (e.g. `bankr/SKILL.md`, `bankr/references/token-deployment.md`).
2) Agent produces a **proposal** (what will happen / estimated costs / requires approval).
3) Operator approves.
4) netnet executes via its Bankr wrapper routes (if enabled) so we get:
   - allowlists & caps
   - audit logs
   - proof-of-action objects
   - optional micro-retire intent packets

If you do not yet have wrapper routes for a referenced capability, treat the skill as PROPOSE_ONLY until the wrapper exists.
