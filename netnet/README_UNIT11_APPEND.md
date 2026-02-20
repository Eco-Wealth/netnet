## Agent operator checklist (minimal)
- Configure environment variables (Bridge + x402) before running in production.
- Keep `X402_DEV_BYPASS` disabled in production.
- Never paste private keys/seed phrases into the cockpit.
- Treat trade functionality as disabled by default; enable only with strict caps.
- Use the Agent API flow: info → projects → quote → retire(init) → operator pays → status → build proof.
