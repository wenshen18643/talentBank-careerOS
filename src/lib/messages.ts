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
