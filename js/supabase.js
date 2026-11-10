import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

export function isConfigured() {
  try {
    const url = new URL(SUPABASE_URL.trim());
    return url.protocol === "https:" && SUPABASE_ANON_KEY.trim().length > 20;
  } catch {
    return false;
  }
}

export const STORE_CHANNEL = "goldpack-store";

let clientPromise = null;

export function getClient() {
  if (!isConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm")
      .then(({ createClient }) => createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "goldpack-auth",
        },
      }))
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}
