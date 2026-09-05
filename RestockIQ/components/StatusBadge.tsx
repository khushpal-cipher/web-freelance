import { Badge } from "@/components/ui/badge";
import type { ReorderStatus } from "@/lib/forecast/reorder";

const LABEL: Record<ReorderStatus, string> = {
  healthy: "Healthy",
  "reorder-now": "Reorder now",
  overstocked: "Overstocked",
};

const VARIANT: Record<ReorderStatus, "healthy" | "reorder" | "overstocked"> = {
  healthy: "healthy",
  "reorder-now": "reorder",
  overstocked: "overstocked",
};

export function StatusBadge({ status }: { status: ReorderStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
