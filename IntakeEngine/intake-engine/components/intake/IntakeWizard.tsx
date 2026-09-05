"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FieldRenderer } from "./FieldRenderer";
import { ReviewStep } from "./ReviewStep";
import {
  intakeSchema,
  getStep,
  visibleFields,
  zodForStep,
  progress as computeProgress,
  prevStepId,
  type FormData,
} from "@/lib/forms/schema";

export function IntakeWizard({ stepId, initialToken }: { stepId: string; initialToken: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(initialToken);
  const [data, setData] = useState<FormData>({});
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("IN_PROGRESS");

  const step = getStep(intakeSchema, stepId);

  const hydrate = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/intake?token=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error("not found");
      const json = await res.json();
      setData(json.data ?? {});
      setStatus(json.status);
      if (json.currentStep && json.currentStep !== stepId && json.status === "IN_PROGRESS") {
        router.replace(`/onboard/${json.currentStep}?t=${t}`);
      }
    } catch {
      setSubmitError("We couldn't find that session. Starting fresh.");
      setToken(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  useEffect(() => {
    if (initialToken) hydrate(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const fields = step ? visibleFields(step, data) : [];
  const resolver = step ? zodResolver(zodForStep(step, data)) : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Record<string, unknown>>({ resolver, defaultValues: pickDefaults(fields.map((f) => f.id), data) });

  useEffect(() => {
    reset(pickDefaults(fields.map((f) => f.id), data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, loading]);

  if (!step) {
    return <p className="text-center text-sm text-ink/60">Unknown step.</p>;
  }

  if (loading) {
    return <p className="text-center text-sm text-ink/60">Loading your progress&hellip;</p>;
  }

  if (status !== "IN_PROGRESS" && step.id !== "review") {
    return (
      <p className="text-center text-sm text-ink/60">
        This onboarding has already been {status === "SIGNED" ? "signed" : "completed"}.
      </p>
    );
  }

  const { index, total } = computeProgress(intakeSchema, stepId, data);
  const percent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const prev = prevStepId(intakeSchema, stepId, data);

  async function onSubmit(values: Record<string, unknown>) {
    setSubmitError(null);
    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, stepId, data: values }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error ?? "Something went wrong. Please try again.");
      return;
    }
    const json = await res.json();
    setToken(json.token);
    setData((prevData) => ({ ...prevData, ...(values as FormData) }));
    router.push(`/onboard/${json.nextStep}?t=${json.token}`);
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink/50">
          <span>
            Step {index + 1} of {total}
          </span>
          <span>{percent}%</span>
        </div>
        <Progress value={percent} />
      </div>

      <Card>
        <h1 className="font-heading text-xl font-semibold text-ink">{step.title}</h1>
        {step.description && <p className="mt-1 text-sm text-ink/60">{step.description}</p>}

        <div className="mt-6">
          {step.id === "review" ? (
            token && <ReviewStep token={token} data={data} />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {fields.map((field) => (
                <FieldRenderer key={field.id} field={field} register={register} errors={errors} />
              ))}

              {submitError && (
                <p role="alert" className="text-sm text-red-600">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                {prev ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(`/onboard/${prev}${token ? `?t=${token}` : ""}`)}
                  >
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Continue"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {token && step.id !== "review" && (
        <p className="mt-4 text-center text-xs text-ink/40">
          Save this link to resume later:{" "}
          <span className="font-mono text-ink/60">
            {typeof window !== "undefined" ? window.location.href : ""}
          </span>
        </p>
      )}
    </div>
  );
}

function pickDefaults(ids: string[], data: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const id of ids) {
    out[id] = data[id] ?? "";
  }
  return out;
}
