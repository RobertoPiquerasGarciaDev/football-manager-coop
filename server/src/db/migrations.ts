import { readFile } from "node:fs/promises"
import path from "node:path"
import { pool } from "./pool"

export async function runMigrations(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), "src/db/schema.sql")
  const schema = await readFile(schemaPath, "utf8")
  await pool.query(schema)
}
