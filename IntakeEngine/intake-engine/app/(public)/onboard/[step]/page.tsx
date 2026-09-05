import { notFound } from "next/navigation";
import { IntakeWizard } from "@/components/intake/IntakeWizard";
import { getStep, intakeSchema } from "@/lib/forms/schema";

export default function OnboardStepPage({
  params,
  searchParams,
}: {
  params: { step: string };
  searchParams: { t?: string };
}) {
  if (!getStep(intakeSchema, params.step)) notFound();

  return <IntakeWizard stepId={params.step} initialToken={searchParams.t ?? null} />;
}
