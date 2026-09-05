import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HISTORY_DAYS = 45;

type SeedProduct = {
  sku: string;
  name: string;
  currentStock: number;
  leadTimeDays: number;
  safetyStock: number;
  avgDailyQty: number; // target average for generated sales history; 0 = no sales at all
};

const PRODUCTS: SeedProduct[] = [
  { sku: "MUG-WHT-01", name: "Ceramic Mug — White", currentStock: 15, leadTimeDays: 14, safetyStock: 20, avgDailyQty: 3 },
  { sku: "TOT-CAN-04", name: "Tote Bag — Canvas", currentStock: 3, leadTimeDays: 10, safetyStock: 5, avgDailyQty: 1 },
  { sku: "CDL-VAN-03", name: "Candle — Vanilla", currentStock: 80, leadTimeDays: 7, safetyStock: 15, avgDailyQty: 2 },
  { sku: "BLK-GRY-02", name: "Wool Blanket — Grey", currentStock: 400, leadTimeDays: 21, safetyStock: 10, avgDailyQty: 0.1 },
  { sku: "BTL-STL-06", name: "Water Bottle — Steel", currentStock: 500, leadTimeDays: 12, safetyStock: 25, avgDailyQty: 0 },
  { sku: "NBK-KFT-05", name: "Notebook — Kraft", currentStock: 10, leadTimeDays: 5, safetyStock: 10, avgDailyQty: 0 },
];

function poissonish(mean: number): number {
  if (mean <= 0) return 0;
  if (mean < 1) return Math.random() < mean ? 1 : 0; // sparse: occasional single-unit sale
  // non-negative jitter around the mean, integer units sold that day
  const value = Math.round(mean + (Math.random() - 0.5) * mean * 1.5);
  return Math.max(0, value);
}

async function main() {
  await prisma.saleRecord.deleteMany();
  await prisma.product.deleteMany();

  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        currentStock: p.currentStock,
        leadTimeDays: p.leadTimeDays,
        safetyStock: p.safetyStock,
      },
    });

    if (p.avgDailyQty === 0) continue; // dead-stock / brand-new SKU: no sales history

    const sales = [];
    for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo--) {
      const qty = poissonish(p.avgDailyQty);
      if (qty === 0) continue;
      const soldAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      sales.push({ productId: product.id, qty, soldAt });
    }
    if (sales.length > 0) {
      await prisma.saleRecord.createMany({ data: sales });
    }
  }

  console.log(`Seeded ${PRODUCTS.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
