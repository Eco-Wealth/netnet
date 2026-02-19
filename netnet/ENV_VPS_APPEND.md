# VPS / Docker runtime env (append to your existing .env.example)

## Core
NODE_ENV=production
PORT=3000

## Kill switches (wired into API routes)
# Hard stop for agent actions (returns 503 for guarded routes)
NETNET_KILL_SWITCH=0

# Hard stop for "spend" actions (retire execution, token ops execution, trade execution if enabled)
NETNET_SPEND_KILL_SWITCH=0

# Optional: allowlist origins / host for server-generated absolute links
# PUBLIC_BASE_URL=https://your-domain-or-ip
