import { supabase } from "@/lib/db";

/**
 * Messaging repository. Threads are keyed to an approved match, so a
 * conversation only exists once an employer has surfaced and approved a
 * candidate — never as unsolicited cold contact.
 */

export type Message = {
  id: number;
  match_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  sender_name: string;
};

type MessageRow = {
  id: number;
  match_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  users: { name: string };
};

function hydrate(row: MessageRow): Message {
  return {
    id: row.id,
    match_id: row.match_id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at,
    sender_name: row.users?.name ?? "",
  };
}

export async function listMessages(match_id: number): Promise<Message[]> {
  const { data: rows } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, body, created_at, users!inner(name)")
    .eq("match_id", match_id)
    .order("created_at", { ascending: true });
  return (rows as unknown as MessageRow[] | null)?.map(hydrate) ?? [];
}

/**
 * Loads the threads for many approved matches in one query, grouped by match id
 * with messages ordered oldest-first within each thread. Collapses the per-match
 * fetch the employer pipeline would otherwise issue into a single round-trip.
 */
export async function listMessagesByMatch(
  match_ids: number[],
): Promise<Map<number, Message[]>> {
  const grouped = new Map<number, Message[]>();
  if (match_ids.length === 0) return grouped;

  const { data: rows } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, body, created_at, users!inner(name)")
    .in("match_id", match_ids)
    .order("created_at", { ascending: true });

  for (const row of (rows as unknown as MessageRow[] | null) ?? []) {
    const message = hydrate(row);
    const thread = grouped.get(message.match_id);
    if (thread) thread.push(message);
    else grouped.set(message.match_id, [message]);
  }
  return grouped;
}

export async function addMessage(input: {
  match_id: number;
  sender_id: number;
  body: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: input.match_id,
      sender_id: input.sender_id,
      body: input.body,
    })
    .select("id, match_id, sender_id, body, created_at, users!inner(name)")
    .single();

  if (error || !data) {
    throw new Error("Could not add message.");
  }

  return hydrate(data as unknown as MessageRow);
}
