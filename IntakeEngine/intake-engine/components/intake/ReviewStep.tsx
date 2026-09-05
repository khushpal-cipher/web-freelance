"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { intakeSchema, visibleSteps, type FormData, type FieldDef } from "@/lib/forms/schema";

function formatValue(field: FieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "multiselect" && Array.isArray(value)) {
    return value.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ") || "—";
  }
  if (field.type === "select") {
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

export function ReviewStep({ token, data }: { token: string; data: FormData }) {
  const router = useRouter();
  const padRef = useRef<SignaturePadHandle>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ welcomeSent: boolean } | null>(null);

  const summarySteps = visibleSteps(intakeSchema, data).filter((s) => s.id !== "review" && s.fields.length > 0);

  async function handleSign() {
    const dataUrl = padRef.current?.getDataUrl();
    if (!dataUrl) {
      setError("Please sign before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const signRes = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signatureDataUrl: dataUrl }),
      });
      if (!signRes.ok) throw new Error((await signRes.json().catch(() => null))?.error ?? "Signing failed");

      const provisionRes = await fetch("/api/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!provisionRes.ok) throw new Error((await provisionRes.json().catch(() => null))?.error ?? "Provisioning failed");
      const provisionData = await provisionRes.json();

      setResult({ welcomeSent: provisionData.welcomeSent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-accent" aria-hidden="true" />
        <h2 className="font-heading text-xl font-semibold text-ink">You&apos;re all set</h2>
        <p className="mt-2 text-sm text-ink/70">
          Your account has been provisioned{result.welcomeSent ? " and a welcome email is on its way." : "."}
        </p>
        <Button className="mt-6" onClick={() => router.push("/")}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        {summarySteps.map((step) => (
          <div key={step.id}>
            <h3 className="font-heading text-sm font-semibold text-ink/80">{step.title}</h3>
            <dl className="mt-2 divide-y divide-ink/10 rounded-md border border-ink/10">
              {step.fields
                .filter((f) => data[f.id] !== undefined)
                .map((field) => (
                  <div key={field.id} className="flex justify-between gap-4 px-3 py-2 text-sm">
                    <dt className="text-ink/50">{field.label}</dt>
                    <dd className="text-right text-ink">{formatValue(field, data[field.id])}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-ink/10 pt-6">
        <h3 className="font-heading text-sm font-semibold text-ink/80">Signature</h3>
        <p className="mb-2 mt-1 text-xs text-ink/50">By signing, you confirm the details above are accurate.</p>
        <SignaturePad ref={padRef} onChange={setHasSignature} />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSign} disabled={!hasSignature || submitting}>
          {submitting ? "Submitting…" : "Sign & complete onboarding"}
        </Button>
      </div>
    </div>
  );
}
