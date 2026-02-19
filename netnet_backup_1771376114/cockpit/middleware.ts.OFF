import { paymentProxy } from "@x402/next";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import type { Network } from "@x402/core/types";

const payTo = process.env.X402_PAY_TO;
if (!payTo || !payTo.startsWith("0x") || payTo.length !== 42) {
  throw new Error("X402_PAY_TO must be set to a valid 0x EVM address in .env.local");
}

// Validate network format (CAIP-2: namespace:reference)
function isValidNetwork(value: string): value is Network {
  return /^[a-z0-9]+:[a-zA-Z0-9]+$/.test(value);
}

const networkEnv = process.env.X402_NETWORK ?? "eip155:84532"; // Default: Base Sepolia
if (!isValidNetwork(networkEnv)) {
  throw new Error(`X402_NETWORK must be a valid CAIP-2 network identifier (e.g., 'eip155:84532'), got: ${networkEnv}`);
}
const network: Network = networkEnv;

const priceUsd = process.env.X402_PRICE_USD ?? "0.01";
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server, {});

export const middleware = paymentProxy(
  {
    "/api/proof-paid": {
      accepts: [
        {
          scheme: "exact",
          price: `$${priceUsd}`,
          network,
          payTo,
        },
      ],
      description: "Proof that the caller can pay x402 (Netnet cockpit)",
      mimeType: "application/json",
    },
  },
  server,
);

export const config = {
  matcher: ["/api/proof-paid"],
};
