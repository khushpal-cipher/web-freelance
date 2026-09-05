import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8", className)} {...props} />;
}
