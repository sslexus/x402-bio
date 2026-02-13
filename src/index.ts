import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { db } from "./db/index.js";
import { conversations } from "./db/schema.js";

const app = new Hono();

const paymentAddress = process.env.PAYMENT_ADDRESS!;
const biosApiBaseUrl = process.env.BIOS_API_BASE_URL!;
const biosApiKey = process.env.BIOS_API_KEY!;

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://www.x402.org/facilitator",
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

// ---   POST /research (x402 protected) ---
app.post("/research", async (c) => {
  // get wallet address from the verified x402 payment payload
  const paymentHeader =
    c.req.header("payment-signature") || c.req.header("x-payment");
  let walletAddr = "unknown";

  if (paymentHeader) {
    try {
      const paymentPayload = decodePaymentSignatureHeader(paymentHeader);
      const payload = paymentPayload.payload as Record<string, any>;
      walletAddr =
        payload.authorization?.from ||
        payload.permit2Authorization?.from ||
        "unknown";
    } catch {
      // If decoding fails, continue with "unknown"
    }
  }

  // Forward request to BIOS API
  const body = await c.req.json();

  const biosResponse = await fetch(`${biosApiBaseUrl}/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${biosApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!biosResponse.ok) {
    const error = await biosResponse.text();
    return c.json(
      { error: "BIOS API error", details: error },
      biosResponse.status as 500,
    );
  }

  const biosData = (await biosResponse.json()) as {
    conversationId: string;
    [key: string]: unknown;
  };

  // Store conversation in DB
  await db.insert(conversations).values({
    conversationId: biosData.conversationId,
    walletAddr,
    state: "pending",
  });

  return c.json({
    conversationId: biosData.conversationId,
  });
});

// Flow 2 — GET /research/:conversationId (no x402)
// TODO: implement

// Flow 3 — GET /conversations/:walletAddress (no x402)
// TODO: implement

app.get("/", (c) => {
  return c.json({ status: "ok", service: "bio-x402" });
});

app.get("/lol", (c) => {
  return c.json({ status: "LOL-OK", service: "bio-x402" });
});

if (process.env.NODE_ENV !== "production") {
  import("@hono/node-server").then(({ serve }) => {
    const port = Number(process.env.PORT) || 4021;
    console.log(`Server listening at http://localhost:${port}`);
    serve({ fetch: app.fetch, port });
  });
}

export default app;
