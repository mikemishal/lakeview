// Minimal structured logger. Swap the sink later (pino, Azure Monitor, etc.)
// without changing any call site. Output is one JSON object per line, which
// Vercel and most log services parse automatically.

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
