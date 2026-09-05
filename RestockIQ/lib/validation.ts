import { z } from "zod";

export const productCreateSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  currentStock: z.number().int().min(0),
  leadTimeDays: z.number().int().min(0),
  safetyStock: z.number().int().min(0),
});

export const productUpdateSchema = productCreateSchema.partial();

export const saleCreateSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  soldAt: z.coerce.date().optional(),
});
