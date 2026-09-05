import { prisma } from "@/lib/db";
import { computeReorderRecommendation, type ReorderStatus } from "@/lib/forecast/reorder";
import { StatusBadge } from "@/components/StatusBadge";
import { InventoryCharts } from "@/components/charts/InventoryCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Row = ReturnType<typeof buildRow>;

function buildRow(
  product: { id: string; sku: string; name: string; currentStock: number; leadTimeDays: number; safetyStock: number },
  sales: { qty: number; soldAt: Date }[],
) {
  const rec = computeReorderRecommendation(product, sales);
  return { ...product, ...rec };
}

const STATUS_ORDER: ReorderStatus[] = ["reorder-now", "overstocked", "healthy"];

export default async function InventoryPage() {
  let rows: Row[] = [];
  let loadError: string | null = null;

  try {
    const products = await prisma.product.findMany({
      include: { sales: { select: { qty: true, soldAt: true } } },
      orderBy: { name: "asc" },
    });
    rows = products
      .map(({ sales, ...product }) => buildRow(product, sales))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  } catch {
    loadError = "Could not reach the database. Check DATABASE_URL and that Postgres is running.";
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <Card className="border-status-reorder/30 bg-status-reorder/5">
          <CardContent className="py-6 text-status-reorder">{loadError}</CardContent>
        </Card>
      </main>
    );
  }

  const counts = {
    "reorder-now": rows.filter((r) => r.status === "reorder-now").length,
    overstocked: rows.filter((r) => r.status === "overstocked").length,
    healthy: rows.filter((r) => r.status === "healthy").length,
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold">RestockIQ</h1>
        <p className="mt-1 text-sm text-ink/60">
          Reorder points computed from rolling sales velocity — flags stockout risk and dead stock before either costs you.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Reorder now" count={counts["reorder-now"]} variant="reorder" />
        <SummaryCard label="Overstocked" count={counts.overstocked} variant="overstocked" />
        <SummaryCard label="Healthy" count={counts.healthy} variant="healthy" />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-ink/60">
            No products yet. Run <code className="rounded bg-black/5 px-1.5 py-0.5">npm run db:seed</code> to load demo
            data, or add products via the API.
          </CardContent>
        </Card>
      ) : (
        <>
          <InventoryCharts rows={rows} />

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-ink/50">
                    <th className="py-2 pr-4 font-medium">SKU</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium text-right">Stock</th>
                    <th className="py-2 pr-4 font-medium text-right">Avg/day</th>
                    <th className="py-2 pr-4 font-medium text-right">Reorder point</th>
                    <th className="py-2 pr-4 font-medium text-right">Days of cover</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{r.sku}</td>
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4 text-right">{r.currentStock}</td>
                      <td className="py-2 pr-4 text-right">{r.avgDailySales.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right">{r.reorderPoint.toFixed(1)}</td>
                      <td className="py-2 pr-4 text-right">
                        {Number.isFinite(r.daysOfCover) ? Math.round(r.daysOfCover) : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "healthy" | "reorder" | "overstocked";
}) {
  const color = {
    healthy: "text-status-healthy",
    reorder: "text-status-reorder",
    overstocked: "text-status-overstocked",
  }[variant];

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-ink/50">{label}</p>
        <p className={`font-heading text-3xl font-semibold ${color}`}>{count}</p>
      </CardContent>
    </Card>
  );
}
