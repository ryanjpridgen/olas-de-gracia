"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import { createTranslation, type TranslationFormState } from "../actions";

const initialState: TranslationFormState = {};

export default function TranslationForm() {
  const [state, formAction, pending] = useActionState(
    createTranslation,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="language">Language</FieldLabel>
          <select
            id="language"
            name="language"
            required
            defaultValue="en"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
          <FieldError>{state.errors?.language?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            placeholder="King James Version"
          />
          <FieldError>{state.errors?.name?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="abbreviation">Abbreviation</FieldLabel>
          <Input
            id="abbreviation"
            name="abbreviation"
            required
            placeholder="KJV"
          />
          <FieldError>{state.errors?.abbreviation?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="license">License</FieldLabel>
          <Input
            id="license"
            name="license"
            required
            placeholder="Public domain"
          />
          <FieldError>{state.errors?.license?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="sourceUrl">Source URL (optional)</FieldLabel>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            placeholder="https://example.com/bible"
          />
          <FieldError>{state.errors?.sourceUrl?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="version">Version</FieldLabel>
          <Input
            id="version"
            name="version"
            type="number"
            min="1"
            step="1"
            required
            defaultValue="1"
          />
          <FieldError>{state.errors?.version?.[0]}</FieldError>
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          name="active"
          defaultChecked
          className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        Active translation
      </label>
      {state.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save translation"}
      </Button>
    </form>
  );
}
