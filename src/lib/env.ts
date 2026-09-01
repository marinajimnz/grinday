import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

function parseEnv() {
  const isServer = typeof window === "undefined";
  const schema = isServer ? serverEnvSchema : clientEnvSchema;
  // Reference each NEXT_PUBLIC_* var explicitly: bundlers inline them per-reference,
  // not by iterating process.env, so a dynamic lookup would be undefined on the client.
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const result = schema.safeParse(raw);

  if (!result.success) {
    throw new Error(
      `Variables de entorno inválidas o ausentes:\n${result.error.issues
        .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  return result.data;
}

export const env = parseEnv();
