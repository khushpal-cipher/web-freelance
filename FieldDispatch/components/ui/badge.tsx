import { cn } from "@/lib/utils";

const VARIANT_CLASSES: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800 border-emerald-200",
  tight: "bg-warning/15 text-warning-foreground border-warning/40",
  conflict: "bg-destructive/10 text-destructive border-destructive/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
