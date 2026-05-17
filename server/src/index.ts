import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import type { NextFunction, Request, Response } from "express"
import { authMiddleware } from "./auth"
import { runMigrations } from "./db/migrations"
import { authRouter } from "./routes/auth"
import { leagueRouter } from "./routes/league"

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 3001)
const requestBuckets = new Map<string, { count: number; resetAt: number }>()

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "anonymous"
  const now = Date.now()
  const bucket = requestBuckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 60_000 })
    next()
    return
  }

  if (bucket.count >= 120) {
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
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API error", error)
  res.status(500).json({ error: "Internal server error" })
})

runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`Football Manager API listening on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error("Failed to run database migrations", error)
    process.exit(1)
  })
