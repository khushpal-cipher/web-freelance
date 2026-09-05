import { NextResponse } from "next/server";
import { rateLimit, rateLimitKeyFromRequest } from "./rateLimit";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns a 429 response if the caller is over budget, otherwise null. */
export function checkRateLimit(req: Request) {
  const { ok } = rateLimit(rateLimitKeyFromRequest(req));
  if (!ok) return jsonError("Too many requests", 429);
  return null;
}
