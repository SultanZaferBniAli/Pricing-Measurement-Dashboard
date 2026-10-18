/**
 * TAM Pricing Platform API.
 *
 * In development it runs beside the Vite dev server (which proxies /api here).
 * In production it also serves the built frontend from dist/.
 */
import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { pruneSessions, seedUsers } from "./auth";
import { config } from "./config";
import { closeStore, openStore, store } from "./db/store";
import { catalogMeta } from "./pricing/catalog";
import { providerStatus } from "./pricing/pipeline";
import { adminRouter } from "./routes/admin";
import { aiRouter } from "./routes/ai";
import { authRouter } from "./routes/auth";
import { budgetsRouter } from "./routes/budgets";
import { catalogRouter } from "./routes/catalog";
import { devRouter } from "./routes/dev";

const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: config.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "60mb" }));
app.use(cookieParser());

/** 200 when the app is up and the database answers; 503 otherwise. */
app.get("/api/health", async (_req, res) => {
  try {
    await store().collection("users").get("health-probe");
    res.json({ ok: true, db: store().kind, llm: providerStatus().ready ? "ready" : "no-key", builtOn: catalogMeta.builtOn });
  } catch (err) {
    res.status(503).json({ ok: false, error: (err as Error).message });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/ai", aiRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/dev", devRouter);

if (config.NODE_ENV === "production") {
  const dist = path.resolve(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({ level: "error", msg: err.message }));
  res.status(500).json({ error: "Something went wrong" });
});

async function main() {
  const db = await openStore();
  await seedUsers();
  await pruneSessions();
  setInterval(() => pruneSessions().catch(() => undefined), 60 * 60 * 1000).unref();

  const server = app.listen(config.PORT, config.HOST, () => {
    const s = providerStatus();
    console.log(
      JSON.stringify({
        level: "info",
        msg: `API listening on http://${config.HOST}:${config.PORT}`,
        db: db.kind,
        dbTarget: db.description,
        provider: s.provider,
        model: s.model,
        llmReady: s.ready,
        catalog: catalogMeta.counts,
      })
    );
  });

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      console.log(JSON.stringify({ level: "info", msg: `${sig} received, shutting down` }));
      server.close(() => {
        closeStore().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "fatal", msg: "startup failed", error: (err as Error).message }));
  process.exit(1);
});
