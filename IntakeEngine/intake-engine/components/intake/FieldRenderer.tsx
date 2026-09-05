"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { FieldDef } from "@/lib/forms/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type FormValues = Record<string, unknown>;

export function FieldRenderer({
  field,
  register,
  errors,
}: {
  field: FieldDef;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}) {
  const error = errors[field.id]?.message as string | undefined;
  const describedBy = error ? `${field.id}-error` : field.helpText ? `${field.id}-help` : undefined;

  return (
    <div>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className="text-accent"> *</span>}
      </Label>

      {field.type === "textarea" && (
        <Textarea id={field.id} aria-describedby={describedBy} aria-invalid={!!error} {...register(field.id)} />
      )}

      {field.type === "select" && (
        <Select id={field.id} aria-describedby={describedBy} aria-invalid={!!error} {...register(field.id)} defaultValue="">
          <option value="" disabled>
            Choose one&hellip;
          </option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}

      {field.type === "checkbox" && (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox id={field.id} aria-describedby={describedBy} {...register(field.id)} />
          <label htmlFor={field.id} className="text-sm text-ink/80">
            {field.helpText ?? "Yes"}
          </label>
        </div>
      )}

      {field.type === "multiselect" && (
        <div className="flex flex-col gap-2 pt-1">
          {field.options?.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-ink/80">
              <Checkbox value={opt.value} {...register(field.id)} />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {(field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number") && (
        <Input
          id={field.id}
          type={field.type === "number" ? "number" : field.type}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          placeholder={field.placeholder}
          {...register(field.id)}
        />
      )}

      {field.helpText && field.type !== "checkbox" && (
        <p id={`${field.id}-help`} className="mt-1 text-xs text-ink/50">
          {field.helpText}
        </p>
      )}
      {error && (
        <p id={`${field.id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
