"use server";

import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { z } from "zod";

const translationSchema = z.object({
  language: z.enum(["en", "es"]),
  name: z.string().trim().min(1, "Enter a translation name."),
  abbreviation: z.string().trim().min(1, "Enter an abbreviation."),
  sourceUrl: z.union([z.literal(""), z.string().trim().url("Enter a valid URL.")]),
  license: z.string().trim().min(1, "Enter a license."),
  version: z.coerce.number().int().positive("Version must be a positive integer."),
  active: z.boolean(),
});

export type TranslationFormState = {
  errors?: Partial<Record<"language" | "name" | "abbreviation" | "sourceUrl" | "license" | "version", string[]>>;
  message?: string;
};

export async function createTranslation(
  _previousState: TranslationFormState,
  formData: FormData,
): Promise<TranslationFormState> {
  const parsed = translationSchema.safeParse({
    language: formData.get("language"),
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
    sourceUrl: formData.get("sourceUrl") ?? "",
    license: formData.get("license"),
    version: formData.get("version"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Check the fields and try again.",
    };
  }

  const translation = parsed.data;
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO translations
       (id, language, name, abbreviation, source_url, license, version, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        translation.language,
        translation.name,
        translation.abbreviation,
        translation.sourceUrl || null,
        translation.license,
        translation.version,
        translation.active ? 1 : 0,
        now,
        now,
      )
      .run();
  } catch {
    return {
      message: "Could not save this translation. The language and abbreviation may already exist.",
    };
  }

  redirect("/bible");
}
