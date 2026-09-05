import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intakeSchema,
  visibleSteps,
  stepOrder,
  nextStepId,
  prevStepId,
  zodForStep,
  getStep,
  type FormData,
} from "../lib/forms/schema.ts";

test("clinic + hipaa reveals the compliance step; ecommerce never sees it", () => {
  const clinicData: FormData = { businessType: "clinic", hipaaRequired: true };
  const clinicOrder = stepOrder(intakeSchema, clinicData);
  assert.ok(clinicOrder.includes("clinic-compliance"));
  assert.ok(clinicOrder.includes("clinic-details"));
  assert.ok(!clinicOrder.includes("ecommerce-details"));

  const ecommerceData: FormData = { businessType: "ecommerce" };
  const ecommerceOrder = stepOrder(intakeSchema, ecommerceData);
  assert.ok(!ecommerceOrder.includes("clinic-compliance"));
  assert.ok(!ecommerceOrder.includes("clinic-details"));
  assert.ok(ecommerceOrder.includes("ecommerce-details"));
});

test("clinic without hipaa does not see the compliance step", () => {
  const data: FormData = { businessType: "clinic", hipaaRequired: false };
  const order = stepOrder(intakeSchema, data);
  assert.ok(order.includes("clinic-details"));
  assert.ok(!order.includes("clinic-compliance"));
});

test("nextStepId skips hidden steps and lands on scope for ecommerce", () => {
  const data: FormData = { businessType: "ecommerce" };
  const next = nextStepId(intakeSchema, "business-info", data);
  assert.equal(next, "ecommerce-details");
  const afterDetails = nextStepId(intakeSchema, "ecommerce-details", data);
  assert.equal(afterDetails, "scope");
});

test("prevStepId walks back over hidden branches, not just array order", () => {
  const data: FormData = { businessType: "agency" };
  const prev = prevStepId(intakeSchema, "scope", data);
  assert.equal(prev, "agency-details");
});

test("toggling hipaaRequired mid-flow changes the reachable step order", () => {
  const withoutHipaa: FormData = { businessType: "clinic", hipaaRequired: false };
  assert.equal(nextStepId(intakeSchema, "clinic-details", withoutHipaa), "scope");

  const withHipaa: FormData = { businessType: "clinic", hipaaRequired: true };
  assert.equal(nextStepId(intakeSchema, "clinic-details", withHipaa), "clinic-compliance");
});

test("zodForStep only validates currently-visible fields", () => {
  const businessInfoStep = getStep(intakeSchema, "business-info")!;
  const schema = zodForStep(businessInfoStep, {});
  const result = schema.safeParse({ businessName: "Acme", contactEmail: "not-an-email", businessType: "clinic" });
  assert.equal(result.success, false);

  const valid = schema.safeParse({ businessName: "Acme", contactEmail: "a@acme.com", businessType: "clinic" });
  assert.equal(valid.success, true);
});

test("compliance step schema requires baaSigner only when the step is actually shown", () => {
  const complianceStep = getStep(intakeSchema, "clinic-compliance")!;
  const schema = zodForStep(complianceStep, { businessType: "clinic", hipaaRequired: true });
  const missing = schema.safeParse({});
  assert.equal(missing.success, false);
  const ok = schema.safeParse({ baaSigner: "Dr. Lee", dataRetentionPolicy: "7yr" });
  assert.equal(ok.success, true);
});

test("resume: reconstructing order from partial data (simulated mid-flow save) is consistent", () => {
  // Simulates what /api/intake does: merge new answers into stored data, then
  // recompute the step order. A client resuming via token gets this same
  // recomputed order — not a stale one baked in at submission time.
  let data: FormData = {};
  data = { ...data, businessName: "Acme", contactEmail: "a@acme.com", businessType: "clinic" };
  assert.equal(nextStepId(intakeSchema, "business-info", data), "clinic-details");

  data = { ...data, practiceType: "medical", patientVolume: 50, hipaaRequired: true };
  const resumedOrder = stepOrder(intakeSchema, data);
  assert.deepEqual(resumedOrder.slice(0, 3), ["business-info", "clinic-details", "clinic-compliance"]);

  // Visible steps for a full clinic+hipaa run in schema declaration order.
  const visible = visibleSteps(intakeSchema, data).map((s) => s.id);
  assert.deepEqual(visible, ["business-info", "clinic-details", "clinic-compliance", "scope", "review"]);
});
