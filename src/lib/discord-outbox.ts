import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  isDiscordEnabled, retryDelayMs, sendDiscordWebhook, validateDiscordNotification, validateDiscordWebhook,
  type DiscordEventType, type DiscordNotification,
} from "@/lib/discord-notifications";

interface OutboxRow {
  id: string;
  event_type: DiscordEventType;
  title: string;
  description: string;
  action_path: string | null;
  attempts: number;
  lock_token: string;
}

export async function enqueueDiscordNotification(eventKey: string, event: DiscordNotification) {
  if (!eventKey || eventKey.length > 180) throw new Error("INVALID_EVENT_KEY");
  const message = validateDiscordNotification(event);
  // Idempotent by event_key. Later business-event producers should enqueue inside
  // their own successful DB transaction using this same INSERT contract.
  const sql = db();
  const [inserted] = await sql`
    INSERT INTO public.discord_notification_outbox
      (event_key, event_type, title, description, action_path)
    VALUES (${eventKey}, ${message.type}, ${message.title},
            ${message.description}, ${message.actionPath ?? null})
    ON CONFLICT (event_key) DO NOTHING
    RETURNING id, status`;
  if (inserted) return { id: String(inserted.id), status: String(inserted.status), duplicate: false };
  const [existing] = await sql`
    SELECT id, status FROM public.discord_notification_outbox WHERE event_key=${eventKey}`;
  if (!existing) throw new Error("OUTBOX_CONFLICT");
  return { id: String(existing.id), status: String(existing.status), duplicate: true };
}

export async function getDiscordNotificationStatus(id: string) {
  const [row] = await db()`SELECT id,status,attempts,last_error,sent_at
    FROM public.discord_notification_outbox WHERE id=${id}`;
  return row || null;
}

export async function listDiscordNotificationHistory() {
  return db()`SELECT id,event_type,title,status,attempts,last_error,created_at,sent_at
    FROM public.discord_notification_outbox ORDER BY created_at DESC LIMIT 30`;
}

export async function dispatchDiscordOutbox(limit = 10, onlyId: string | null = null) {
  if (!isDiscordEnabled()) return { processed: 0, sent: 0, failed: 0, disabled: true };
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error("DISCORD_WEBHOOK_NOT_CONFIGURED");
  validateDiscordWebhook(webhook); // Fail before claiming rows if the secret is invalid.
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("INVALID_DISPATCH_LIMIT");
  const sql = db();
  // Single atomic claim across concurrent workers. Expired leases are reclaimed.
  const rows = await sql`
    WITH picked AS (
      SELECT id FROM public.discord_notification_outbox
      WHERE ((status='pending' AND available_at <= now())
             OR (status='processing' AND locked_at < now() - interval '2 minutes'))
        AND (${onlyId}::uuid IS NULL OR id=${onlyId}::uuid)
      ORDER BY created_at ASC, id ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.discord_notification_outbox q
    SET status='processing', attempts=q.attempts + 1,
        locked_at=now(), lock_token=gen_random_uuid(), updated_at=now()
    FROM picked WHERE q.id=picked.id
    RETURNING q.id,q.event_type,q.title,q.description,q.action_path,q.attempts,q.lock_token`;
  let sent = 0;
  let failed = 0;
  for (const row of rows as unknown as OutboxRow[]) {
    const outcome = await sendDiscordWebhook(webhook, {
      type: row.event_type,
      title: row.title,
      description: row.description,
      actionPath: row.action_path,
    }, process.env.SITE_URL);
    if (outcome.kind === "sent") {
      await sql`UPDATE public.discord_notification_outbox
        SET status='sent',sent_at=now(),last_error=NULL,
            locked_at=NULL,lock_token=NULL,updated_at=now()
        WHERE id=${row.id} AND status='processing' AND lock_token=${row.lock_token}`;
      sent++;
      continue;
    }
    const terminal = outcome.kind === "permanent" || Number(row.attempts) >= 5;
    const delayMs = outcome.kind === "retry"
      ? retryDelayMs(Number(row.attempts), outcome.retryAfterMs) : 0;
    await sql`UPDATE public.discord_notification_outbox
      SET status=${terminal ? "failed" : "pending"},
          available_at=now() + (${Math.ceil(delayMs / 1000)}::int * interval '1 second'),
          last_error=${outcome.reason},last_http_status=${outcome.httpStatus},
          locked_at=NULL,lock_token=NULL,updated_at=now()
      WHERE id=${row.id} AND status='processing' AND lock_token=${row.lock_token}`;
    failed++;
  }
  return { processed: rows.length, sent, failed, disabled: false };
}

export async function enqueueDiscordTest() {
  return enqueueDiscordNotification(`test:${randomUUID()}`, {
    type: "test",
    title: "✅ Kiểm tra thông báo 11Local",
    description: "Kết nối Discord Webhook đang được kiểm tra bởi quản trị viên.",
    actionPath: "/admin",
  });
}
