import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productCreateSchema } from "@/lib/validation";
import { checkRateLimit, jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);

  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) return jsonError(`SKU "${parsed.data.sku}" already exists`, 409);

  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
