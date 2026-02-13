import { Hono } from "hono";
import { db } from "./db/index.js";
import { conversations } from "./db/schema.js";

const app = new Hono();

const biosApiBaseUrl = process.env.BIOS_API_BASE_URL!;
const biosApiKey = process.env.BIOS_API_KEY!;

// --- POST /research ---
app.post("/research", async (c) => {
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

  await db.insert(conversations).values({
    conversationId: biosData.conversationId,
    walletAddr: "unknown",
    state: "pending",
  });

  return c.json({
    conversationId: biosData.conversationId,
  });
});

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
