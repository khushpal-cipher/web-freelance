export const DEFAULT_WINDOW_DAYS = 30;
export const DEFAULT_OVERSTOCK_MULTIPLIER = 3;

export type Sale = { qty: number; soldAt: Date };

export type ReorderStatus = "healthy" | "reorder-now" | "overstocked";

export type ReorderResult = {
  avgDailySales: number;
  reorderPoint: number;
  daysOfCover: number; // Infinity when there is no recent sales velocity
  status: ReorderStatus;
};

/** Average units sold per day over a fixed trailing window (zero-filled, not just days-with-sales). */
export function computeAvgDailySales(
  sales: Sale[],
  windowDays: number = DEFAULT_WINDOW_DAYS,
  now: Date = new Date(),
): number {
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const total = sales.reduce((sum, sale) => {
    if (sale.soldAt >= windowStart && sale.soldAt <= now) {
      return sum + sale.qty;
    }
    return sum;
  }, 0);
  return total / windowDays;
}

export function computeReorderPoint(
  avgDailySales: number,
  leadTimeDays: number,
  safetyStock: number,
): number {
  return avgDailySales * leadTimeDays + safetyStock;
}

export function computeDaysOfCover(currentStock: number, avgDailySales: number): number {
  if (avgDailySales <= 0) return currentStock > 0 ? Infinity : 0;
  return currentStock / avgDailySales;
}

export function classifyStatus(
  currentStock: number,
  reorderPoint: number,
  avgDailySales: number,
  overstockMultiplier: number = DEFAULT_OVERSTOCK_MULTIPLIER,
): ReorderStatus {
  if (currentStock <= reorderPoint) return "reorder-now";
  if (avgDailySales <= 0) return "overstocked"; // dead stock: sitting inventory, zero velocity
  if (currentStock > reorderPoint * overstockMultiplier) return "overstocked";
  return "healthy";
}

export function computeReorderRecommendation(
  product: { currentStock: number; leadTimeDays: number; safetyStock: number },
  sales: Sale[],
  options: { windowDays?: number; overstockMultiplier?: number; now?: Date } = {},
): ReorderResult {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const overstockMultiplier = options.overstockMultiplier ?? DEFAULT_OVERSTOCK_MULTIPLIER;
  const now = options.now ?? new Date();

  const avgDailySales = computeAvgDailySales(sales, windowDays, now);
  const reorderPoint = computeReorderPoint(avgDailySales, product.leadTimeDays, product.safetyStock);
  const daysOfCover = computeDaysOfCover(product.currentStock, avgDailySales);
  const status = classifyStatus(product.currentStock, reorderPoint, avgDailySales, overstockMultiplier);

  return { avgDailySales, reorderPoint, daysOfCover, status };
}
