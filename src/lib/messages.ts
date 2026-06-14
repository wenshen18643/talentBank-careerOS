import { getDb } from "@/lib/db";

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

type MessageRow = Message;

export function listMessages(match_id: number): Message[] {
  return getDb()
    .prepare(
      `SELECT msg.id, msg.match_id, msg.sender_id, msg.body, msg.created_at,
              u.name AS sender_name
       FROM messages msg JOIN users u ON u.id = msg.sender_id
       WHERE msg.match_id = ? ORDER BY msg.created_at ASC`,
    )
    .all(match_id) as MessageRow[];
}

export function addMessage(input: {
  match_id: number;
  sender_id: number;
  body: string;
}): Message {
  const result = getDb()
    .prepare(
      `INSERT INTO messages (match_id, sender_id, body) VALUES (@match_id, @sender_id, @body)`,
    )
    .run(input);
  return getDb()
    .prepare(
      `SELECT msg.id, msg.match_id, msg.sender_id, msg.body, msg.created_at,
              u.name AS sender_name
       FROM messages msg JOIN users u ON u.id = msg.sender_id
       WHERE msg.id = ?`,
    )
    .get(Number(result.lastInsertRowid)) as Message;
}
