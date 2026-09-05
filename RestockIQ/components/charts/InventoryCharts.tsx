"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReorderStatus } from "@/lib/forecast/reorder";

const STATUS_COLOR: Record<ReorderStatus, string> = {
  healthy: "#2f9e44",
  "reorder-now": "#e03131",
  overstocked: "#3b6fd9",
};

const COVER_CAP_DAYS = 120;

export type ChartRow = {
  sku: string;
  avgDailySales: number;
  daysOfCover: number;
  status: ReorderStatus;
};

export function InventoryCharts({ rows }: { rows: ChartRow[] }) {
  const velocityData = rows.map((r) => ({
    sku: r.sku,
    velocity: Number(r.avgDailySales.toFixed(2)),
    status: r.status,
  }));

  const coverData = rows.map((r) => ({
    sku: r.sku,
    cover: Number.isFinite(r.daysOfCover) ? Math.min(r.daysOfCover, COVER_CAP_DAYS) : COVER_CAP_DAYS,
    label: Number.isFinite(r.daysOfCover) ? Math.round(r.daysOfCover) : `${COVER_CAP_DAYS}+`,
    status: r.status,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sales velocity (units/day, rolling window)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#14141314" />
              <XAxis dataKey="sku" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} />
              <Tooltip />
              <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
                {velocityData.map((d) => (
                  <Cell key={d.sku} fill={STATUS_COLOR[d.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Days of cover per SKU</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coverData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#14141314" />
              <XAxis dataKey="sku" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} />
              <Tooltip formatter={((_value: number, _name: string, item: any) => [item.payload.label, "days"]) as any} />
              <Bar dataKey="cover" radius={[4, 4, 0, 0]}>
                {coverData.map((d) => (
                  <Cell key={d.sku} fill={STATUS_COLOR[d.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
