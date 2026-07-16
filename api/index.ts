import express, { type Request, Response, NextFunction } from "express";
import nodePath from "path";
import { registerRoutes } from "../server/routes";
import { registerCronRoutes } from "../server/cronRoutes";
import { isS3Enabled, getPresignedUrl, getS3KeyForFile } from "../server/s3Storage";
import { WebhookHandlers } from "../server/webhookHandlers";

const app = express();

// Stripe webhook needs the raw request body for signature verification, so it
// must be registered BEFORE the global express.json() parser below.
// NOTE: signature verification itself happens inside stripe-replit-sync's
// processWebhook (via WebhookHandlers), which is expected to read
// STRIPE_WEBHOOK_SECRET from the environment — this hasn't been exercised
// against a live Stripe account, verify with a real webhook once deployed.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ message: "Missing Stripe signature" });
    }
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook processing failed:", error);
      res.status(400).json({ message: error.message || "Webhook processing failed" });
    }
  },
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Serve uploads: redirect to S3 pre-signed URL when S3 is configured, otherwise
// serve from disk (only meaningful for local/non-serverless dev — Vercel's
// filesystem is ephemeral, so S3 must be configured in production).
app.use("/uploads", async (req: Request, res: Response, next: NextFunction) => {
  if (!isS3Enabled()) {
    return express.static(nodePath.join(process.cwd(), "uploads"))(req, res, next);
  }
  try {
    const s3Key = getS3KeyForFile(req.path.replace(/^\//, ""), "uploads");
    const url = await getPresignedUrl(s3Key);
    return res.redirect(url);
  } catch {
    return res.status(404).send("Not found");
  }
});

registerCronRoutes(app);

// No server.listen(), no startScheduledJobs(), no setupVite/serveStatic —
// Vercel invokes this exported app per-request and serves the built static
// frontend (dist/public) itself per vercel.json.
await registerRoutes(app);

export default app;
