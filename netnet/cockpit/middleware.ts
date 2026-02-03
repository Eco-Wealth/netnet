import { paymentProxy, x402ResourceServer } from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const payTo = process.env.X402_PAY_TO;
if (!payTo || !payTo.startsWith("0x") || payTo.length !== 42) {
  throw new Error("X402_PAY_TO must be set to a valid 0x EVM address in .env.local");
}

const network = process.env.X402_NETWORK ?? "eip155:84532"; // Base Sepolia
const priceUsd = process.env.X402_PRICE_USD ?? "0.01";
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitatorClient).register(network, new ExactEvmScheme());

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
