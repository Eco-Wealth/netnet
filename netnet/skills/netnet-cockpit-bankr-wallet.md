# netnet-cockpit — Bankr Wallet State (Read-only)

Purpose: expose a safe, read-only surface for an agent (or operator) to inspect wallet state before proposing actions.

## Endpoints

GET /api/bankr/wallet?action=state&wallet=<optional>
- Returns a combined snapshot if the upstream supports it (balances/positions/history). If not, use the specific actions below.

GET /api/bankr/wallet?action=balances&wallet=<optional>
- Returns balances by chain + symbol.

GET /api/bankr/wallet?action=positions&wallet=<optional>
- Returns open positions (LP/spot/perps) if available.

GET /api/bankr/wallet?action=history&wallet=<optional>&limit=50
- Returns recent activity items (transfers/swaps/fees/etc).

## Safety

- Read-only only.
- No private keys required.
- No caching of results (no-store).

## Configuration

- BANKR_WALLET_ADDRESS (default wallet if none provided)
- BANKR_WALLET_API_BASE_URL (optional; if missing, returns mock data)
- BANKR_WALLET_API_KEY (optional; Authorization: Bearer)
- BANKR_WALLET_MOCK=1 forces mock data.

## UI

- Visit /wallet for Balances / Positions / History.
