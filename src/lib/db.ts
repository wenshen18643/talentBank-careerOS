/**
 * Single import point for the Supabase client used across the data layer.
 * Downstream callers (lib modules, server actions, server components) import
 * `supabase` from here and must await all database operations.
 */

export { supabase } from "@/lib/supabase";
