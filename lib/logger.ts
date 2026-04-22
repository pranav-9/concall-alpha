type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type LogPayload = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
};

const isProd = process.env.NODE_ENV === "production";

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value && typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
}

function normalizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = serializeError(value);
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: normalizeContext(context),
  };

  const line = isProd ? JSON.stringify(payload) : payload;
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
