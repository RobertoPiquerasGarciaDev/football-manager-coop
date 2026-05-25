type Level = "info" | "warn" | "error" | "debug"

type LogContext = Record<string, unknown>

const enabled = (process.env.LOG_LEVEL ?? "info").toLowerCase()
const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const minLevel = levelOrder[enabled as Level] ?? 20

function emit(level: Level, message: string, ctx: LogContext = {}) {
  if (levelOrder[level] < minLevel) return
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...ctx,
  }
  const channel = level === "error" || level === "warn" ? "stderr" : "stdout"
  const line = JSON.stringify(entry)
  if (channel === "stderr") process.stderr.write(line + "\n")
  else process.stdout.write(line + "\n")
}

export const logger = {
  info: (message: string, ctx?: LogContext) => emit("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => emit("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => emit("error", message, ctx),
  debug: (message: string, ctx?: LogContext) => emit("debug", message, ctx),
  child: (defaults: LogContext) => ({
    info: (m: string, c?: LogContext) => emit("info", m, { ...defaults, ...c }),
    warn: (m: string, c?: LogContext) => emit("warn", m, { ...defaults, ...c }),
    error: (m: string, c?: LogContext) => emit("error", m, { ...defaults, ...c }),
    debug: (m: string, c?: LogContext) => emit("debug", m, { ...defaults, ...c }),
  }),
}
