# Bankr Wallet State (Unit 42)

This unit adds a read-only wallet state surface.

- UI: /wallet
- API: /api/bankr/wallet?action=balances|positions|history|state

If BANKR_WALLET_API_BASE_URL is not set, the API returns mock data to keep the cockpit usable in dev.
