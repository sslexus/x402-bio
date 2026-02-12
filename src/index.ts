import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = new Hono();

const paymentAddress = process.env.PAYMENT_ADDRESS!;
const biosApiBaseUrl = process.env.BIOS_API_BASE_URL!;
const biosApiKey = process.env.BIOS_API_KEY!;

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitatorClient).register(
  "eip155:84532",
  new ExactEvmScheme(),
);

app.use(
  paymentMiddleware(
    {
      "POST /research": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.10",
            network: "eip155:84532",
            payTo: paymentAddress,
          },
        ],
        description: "Start a BioAgent deep research job",
        mimeType: "application/json",
      },
    },
    server,
  ),
);

// Flow 1 — POST /research (x402 protected)
// TODO: implement

// Flow 2 — GET /research/:conversationId (no x402)
// TODO: implement

// Flow 3 — GET /conversations/:walletAddress (no x402)
// TODO: implement

app.get("/", (c) => {
  return c.json({ status: "ok", service: "bio-x402" });
});

if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT) || 4021;
  console.log(`Server listening at http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}

export default app;
