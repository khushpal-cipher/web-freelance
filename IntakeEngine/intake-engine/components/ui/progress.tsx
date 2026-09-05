import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-ink/10", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}
