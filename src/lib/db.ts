/**
 * Database access layer for the Career OS backend on Supabase.
 *
 * The synchronous SQLite API has been replaced with an async Supabase client.
 * All downstream callers (lib modules, server actions, server components) must
 * await database operations.
 */

import { supabase } from "@/lib/supabase";

export { supabase };

/**
 * @deprecated Use the `supabase` client directly. Kept for compatibility during
 * the SQLite → Supabase migration.
 */
export function getDb() {
  return supabase;
}

/**
 * No-op in the Supabase deployment. Previously closed the local SQLite handle.
 */
export function closeDb(): void {
  // Nothing to close with the HTTP-based Supabase client.
}
