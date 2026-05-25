import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import type { NextFunction, Request, Response } from "express"
import { authMiddleware } from "./auth"
import { runMigrations } from "./db/migrations"
import { logger } from "./lib/logger"
import { authRouter } from "./routes/auth"
import { gameSystemsRouter } from "./routes/game-systems"
import { leagueRouter } from "./routes/league"

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 3001)
const requestBuckets = new Map<string, { count: number; resetAt: number }>()

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.header("authorization") ?? req.ip ?? "anonymous"
  const now = Date.now()
  const bucket = requestBuckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 60_000 })
    next()
    return
  }

  if (bucket.count >= 100) {
    res.status(429).json({ error: "Too many requests" })
    return
  }

  bucket.count += 1
  next()
}

app.use(
  cors({
    origin: ["https://football-manager-ui.vercel.app", "http://localhost:3000"],
  }),
)
app.use(rateLimit)
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use(authRouter)
app.use(authMiddleware, leagueRouter)
app.use(authMiddleware, gameSystemsRouter)
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled API error", {
    method: req.method,
    path: req.originalUrl,
    error: error.message,
    stack: error.stack,
  })
  res.status(500).json({ error: "Internal server error" })
})

// Request logging middleware (mounted last so it captures the full chain)
app.use((req, _res, next) => {
  logger.debug("request", { method: req.method, path: req.originalUrl })
  next()
})

runMigrations()
  .then(() => {
    app.listen(port, () => {
      logger.info("API listening", { port, url: `http://localhost:${port}` })
    })
  })
  .catch((error) => {
    logger.error("Failed to run database migrations", { error: String(error) })
    process.exit(1)
  })
