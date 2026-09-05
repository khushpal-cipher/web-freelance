import { z } from "zod";

/**
 * Conditional intake form engine.
 *
 * A form is a flat list of steps. Each step and each field within a step
 * carries an optional `showIf` predicate evaluated against the accumulated
 * submission data. Nothing here is a function stored on disk — predicates
 * are plain JSON so the schema stays serializable and inspectable.
 */

export type FieldValue = string | number | boolean | string[] | undefined;
export type FormData = Record<string, FieldValue>;

export type Condition =
  | { field: string; equals: string | number | boolean }
  | { field: string; oneOf: (string | number | boolean)[] }
  | { field: string; truthy: true }
  | { and: Condition[] }
  | { or: Condition[] };

export function evalCondition(condition: Condition, data: FormData): boolean {
  if ("and" in condition) return condition.and.every((c) => evalCondition(c, data));
  if ("or" in condition) return condition.or.some((c) => evalCondition(c, data));
  const value = data[condition.field];
  if ("equals" in condition) return value === condition.equals;
  if ("oneOf" in condition) return condition.oneOf.includes(value as string | number | boolean);
  if ("truthy" in condition) return Boolean(value);
  return false;
}

export type FieldType = "text" | "email" | "tel" | "number" | "textarea" | "select" | "checkbox" | "multiselect";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  showIf?: Condition;
}

export interface StepDef {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  showIf?: Condition;
}

export interface FormSchema {
  id: string;
  title: string;
  steps: StepDef[];
}

/** Fields on a step whose `showIf` (if any) currently evaluates true. */
export function visibleFields(step: StepDef, data: FormData): FieldDef[] {
  return step.fields.filter((f) => !f.showIf || evalCondition(f.showIf, data));
}

/** Steps in the schema whose `showIf` (if any) currently evaluates true. */
export function visibleSteps(schema: FormSchema, data: FormData): StepDef[] {
  return schema.steps.filter((s) => !s.showIf || evalCondition(s.showIf, data));
}

/** Build a zod object schema for exactly the fields currently visible on a step. */
export function zodForStep(step: StepDef, data: FormData) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of visibleFields(step, data)) {
    shape[field.id] = zodForField(field);
  }
  return z.object(shape);
}

function zodForField(field: FieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "email":
      schema = z.string().email("Enter a valid email address");
      break;
    case "number": {
      let num = z.coerce.number();
      if (field.min !== undefined) num = num.min(field.min, `Must be at least ${field.min}`);
      if (field.max !== undefined) num = num.max(field.max, `Must be at most ${field.max}`);
      schema = num;
      break;
    }
    case "checkbox":
      schema = z.boolean();
      break;
    case "multiselect":
      schema = z.array(z.string());
      if (field.required) schema = (schema as z.ZodArray<z.ZodString>).min(1, "Select at least one option");
      return schema;
    case "select": {
      const values = (field.options ?? []).map((o) => o.value);
      schema = values.length ? z.enum(values as [string, ...string[]]) : z.string();
      break;
    }
    case "text":
    case "tel":
    case "textarea":
    default: {
      let str = z.string();
      if (field.minLength !== undefined) str = str.min(field.minLength, `Must be at least ${field.minLength} characters`);
      if (field.maxLength !== undefined) str = str.max(field.maxLength, `Must be at most ${field.maxLength} characters`);
      schema = str;
      break;
    }
  }

  if (field.type === "checkbox") {
    return field.required ? (schema as z.ZodBoolean).refine((v) => v === true, "Required") : schema.optional();
  }

  return field.required ? schema : schema.optional().or(z.literal(""));
}

/** Step order accounting for branching — used for resume, next/prev, and progress. */
export function stepOrder(schema: FormSchema, data: FormData): string[] {
  return visibleSteps(schema, data).map((s) => s.id);
}

export function nextStepId(schema: FormSchema, currentStepId: string, data: FormData): string | null {
  const order = stepOrder(schema, data);
  const idx = order.indexOf(currentStepId);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

export function prevStepId(schema: FormSchema, currentStepId: string, data: FormData): string | null {
  const order = stepOrder(schema, data);
  const idx = order.indexOf(currentStepId);
  if (idx <= 0) return null;
  return order[idx - 1];
}

export function progress(schema: FormSchema, currentStepId: string, data: FormData): { index: number; total: number } {
  const order = stepOrder(schema, data);
  const idx = order.indexOf(currentStepId);
  return { index: idx === -1 ? 0 : idx, total: order.length };
}

export function getStep(schema: FormSchema, stepId: string): StepDef | undefined {
  return schema.steps.find((s) => s.id === stepId);
}

// ---------------------------------------------------------------------------
// Demo schema: client onboarding for a services business, branching on the
// prospect's business type. Clinics that require HIPAA compliance get an
// extra step nobody else sees — that's the conditional engine in action.
// ---------------------------------------------------------------------------

export const intakeSchema: FormSchema = {
  id: "client-onboarding",
  title: "Client Onboarding",
  steps: [
    {
      id: "business-info",
      title: "Your business",
      description: "Tell us who we're working with.",
      fields: [
        { id: "businessName", label: "Business name", type: "text", required: true, maxLength: 120 },
        { id: "contactEmail", label: "Contact email", type: "email", required: true },
        { id: "contactPhone", label: "Phone", type: "tel", required: false },
        {
          id: "businessType",
          label: "Business type",
          type: "select",
          required: true,
          options: [
            { value: "clinic", label: "Clinic / healthcare practice" },
            { value: "ecommerce", label: "E-commerce" },
            { value: "agency", label: "Agency / professional services" },
          ],
        },
      ],
    },
    {
      id: "clinic-details",
      title: "Practice details",
      description: "A few specifics about your practice.",
      showIf: { field: "businessType", equals: "clinic" },
      fields: [
        {
          id: "practiceType",
          label: "Practice type",
          type: "select",
          required: true,
          options: [
            { value: "dental", label: "Dental" },
            { value: "medical", label: "Medical" },
            { value: "mental-health", label: "Mental health" },
            { value: "chiropractic", label: "Chiropractic" },
          ],
        },
        { id: "patientVolume", label: "Patients seen per month", type: "number", required: true, min: 1, max: 100000 },
        {
          id: "hipaaRequired",
          label: "We handle protected health information (HIPAA applies)",
          type: "checkbox",
          required: false,
        },
      ],
    },
    {
      id: "clinic-compliance",
      title: "Compliance",
      description: "Since HIPAA applies, we need a couple more details for the Business Associate Agreement.",
      showIf: { and: [{ field: "businessType", equals: "clinic" }, { field: "hipaaRequired", truthy: true }] },
      fields: [
        { id: "baaSigner", label: "Name of person authorized to sign the BAA", type: "text", required: true, maxLength: 120 },
        {
          id: "dataRetentionPolicy",
          label: "Preferred data retention period",
          type: "select",
          required: true,
          options: [
            { value: "30days", label: "30 days" },
            { value: "1yr", label: "1 year" },
            { value: "7yr", label: "7 years" },
          ],
        },
      ],
    },
    {
      id: "ecommerce-details",
      title: "Store details",
      description: "Tell us about your storefront.",
      showIf: { field: "businessType", equals: "ecommerce" },
      fields: [
        {
          id: "platform",
          label: "Platform",
          type: "select",
          required: true,
          options: [
            { value: "shopify", label: "Shopify" },
            { value: "woocommerce", label: "WooCommerce" },
            { value: "custom", label: "Custom / other" },
          ],
        },
        { id: "monthlyOrders", label: "Orders per month", type: "number", required: true, min: 0, max: 1000000 },
        { id: "handlesPayments", label: "We need help with payment processing", type: "checkbox", required: false },
      ],
    },
    {
      id: "agency-details",
      title: "Agency details",
      description: "Tell us about your client base.",
      showIf: { field: "businessType", equals: "agency" },
      fields: [
        { id: "clientCount", label: "Active clients", type: "number", required: true, min: 0, max: 100000 },
        { id: "servicesOffered", label: "Services you offer", type: "textarea", required: true, maxLength: 500 },
      ],
    },
    {
      id: "scope",
      title: "Project scope",
      description: "What are you looking for?",
      fields: [
        {
          id: "servicesNeeded",
          label: "Services needed",
          type: "multiselect",
          required: true,
          options: [
            { value: "onboarding-setup", label: "Onboarding setup" },
            { value: "integration", label: "System integration" },
            { value: "training", label: "Team training" },
            { value: "support", label: "Ongoing support" },
          ],
        },
        {
          id: "budgetRange",
          label: "Budget range",
          type: "select",
          required: true,
          options: [
            { value: "<5k", label: "Under $5,000" },
            { value: "5-15k", label: "$5,000 – $15,000" },
            { value: "15-50k", label: "$15,000 – $50,000" },
            { value: "50k+", label: "$50,000+" },
          ],
        },
        {
          id: "timeline",
          label: "Timeline",
          type: "select",
          required: true,
          options: [
            { value: "immediate", label: "Immediate" },
            { value: "1-3mo", label: "1–3 months" },
            { value: "3-6mo", label: "3–6 months" },
            { value: "flexible", label: "Flexible" },
          ],
        },
      ],
    },
    {
      id: "review",
      title: "Review & sign",
      description: "Confirm your details and sign to complete onboarding.",
      fields: [],
    },
  ],
};
