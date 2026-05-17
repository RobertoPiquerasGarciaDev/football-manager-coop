import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import { authMiddleware } from "./auth"
import { runMigrations } from "./db/migrations"
import { authRouter } from "./routes/auth"
import { leagueRouter } from "./routes/league"

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use(authRouter)
app.use(authMiddleware, leagueRouter)

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
