/**
 * Structured logging that never carries submission field values or PII.
 * Only ids, statuses, step names, and counts are safe to pass in `meta`.
 */
type Meta = Record<string, string | number | boolean | null | undefined>;

function log(level: "info" | "warn" | "error", event: string, meta?: Meta) {
  const entry = { level, event, ts: new Date().toISOString(), ...meta };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, meta?: Meta) => log("info", event, meta),
  warn: (event: string, meta?: Meta) => log("warn", event, meta),
  error: (event: string, meta?: Meta) => log("error", event, meta),
};
