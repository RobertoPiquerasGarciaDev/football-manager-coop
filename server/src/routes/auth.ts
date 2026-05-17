import { scrypt, timingSafeEqual, randomBytes } from "node:crypto"
import { promisify } from "node:util"
import { Router, type Request, type Response } from "express"
import { signAuthToken } from "../auth"
import { pool } from "../db/pool"

const scryptAsync = promisify(scrypt)

type UserRow = {
  id: string
  email: string
  display_name: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

export const authRouter = Router()

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

function normalizeDisplayName(displayName: unknown, email: string): string {
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim()
  }
  return email.split("@")[0] || "Manager"
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString("hex")}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":")
  if (!salt || !key) return false

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  const storedKey = Buffer.from(key, "hex")
  if (storedKey.length !== derivedKey.length) return false

  return timingSafeEqual(storedKey, derivedKey)
}

authRouter.post("/auth/register", async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email)
  const password = typeof req.body?.password === "string" ? req.body.password : ""
  const displayName = normalizeDisplayName(req.body?.displayName ?? req.body?.display_name, email)

  if (!email || !email.includes("@") || password.length < 8) {
    res.status(400).json({ error: "Valid email and password with at least 8 characters are required" })
    return
  }

  try {
    const passwordHash = await hashPassword(password)
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, displayName, passwordHash],
    )
    const user = mapUser(result.rows[0])
    const token = signAuthToken({ id: user.id, email: user.email })

    res.status(201).json({ user, token })
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "Email is already registered" })
      return
    }

    res.status(500).json({ error: "Failed to register user" })
  }
})

authRouter.post("/auth/login", async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email)
  const password = typeof req.body?.password === "string" ? req.body.password : ""

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" })
    return
  }

  const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email])
  const row = result.rows[0]
  if (!row || !row.password_hash || !(await verifyPassword(password, row.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" })
    return
  }

  const user = mapUser(row)
  const token = signAuthToken({ id: user.id, email: user.email })
  res.json({ user, token })
})
