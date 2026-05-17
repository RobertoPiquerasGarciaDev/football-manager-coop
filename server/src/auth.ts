import type { NextFunction, Request, Response } from "express"
import jwt, { type JwtPayload } from "jsonwebtoken"

export type AuthenticatedUser = {
  id: string
  email: string
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is required")
  }
  return secret
}

export function signAuthToken(user: AuthenticatedUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, getJwtSecret(), { expiresIn: "7d" })
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null

  if (!token) {
    res.status(401).json({ error: "Missing bearer token" })
    return
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      res.status(401).json({ error: "Invalid token" })
      return
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    }
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}
