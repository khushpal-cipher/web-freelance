import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAvgDailySales,
  computeReorderPoint,
  computeDaysOfCover,
  classifyStatus,
  computeReorderRecommendation,
} from "./reorder";

const now = new Date("2026-09-04T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

test("computeAvgDailySales sums qty in window and divides by window length", () => {
  const sales = [
    { qty: 10, soldAt: daysAgo(1) },
    { qty: 20, soldAt: daysAgo(29) },
    { qty: 999, soldAt: daysAgo(31) }, // outside 30-day window, ignored
  ];
  assert.equal(computeAvgDailySales(sales, 30, now), 1); // (10+20)/30
});

test("computeReorderPoint = avg_daily_sales * lead_time + safety_stock", () => {
  assert.equal(computeReorderPoint(5, 7, 10), 45);
});

test("computeDaysOfCover divides stock by velocity, Infinity when velocity is zero and stock exists", () => {
  assert.equal(computeDaysOfCover(100, 5), 20);
  assert.equal(computeDaysOfCover(100, 0), Infinity);
  assert.equal(computeDaysOfCover(0, 0), 0);
});

test("classifyStatus: reorder-now when stock at or below reorder point", () => {
  assert.equal(classifyStatus(10, 20, 5), "reorder-now");
  assert.equal(classifyStatus(20, 20, 5), "reorder-now");
});

test("classifyStatus: overstocked when stock far above reorder point", () => {
  assert.equal(classifyStatus(100, 20, 5, 3), "overstocked");
});

test("classifyStatus: overstocked for dead stock (zero velocity, stock on hand)", () => {
  assert.equal(classifyStatus(50, 0, 0), "overstocked");
});

test("classifyStatus: healthy in between", () => {
  assert.equal(classifyStatus(30, 20, 5, 3), "healthy");
});

test("computeReorderRecommendation wires the pipeline together", () => {
  const product = { currentStock: 5, leadTimeDays: 7, safetyStock: 10 };
  const sales = [
    { qty: 2, soldAt: daysAgo(1) },
    { qty: 2, soldAt: daysAgo(2) },
  ]; // avgDailySales = 4/30 ≈ 0.133
  const result = computeReorderRecommendation(product, sales, { now });
  assert.ok(result.avgDailySales > 0);
  assert.equal(result.reorderPoint, result.avgDailySales * 7 + 10);
  assert.equal(result.status, "reorder-now"); // 5 <= reorderPoint (~10.93)
});
