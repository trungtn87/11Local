# 11Local Discord — foundation (step 1)

This PR provides the server-only Discord transport, Neon outbox, Admin test/history
endpoints, and secret-authenticated dispatcher. **Business event producers, Admin
settings screen, daily digest (canceled by Owner), and alert integrations are NOT part of step 1.**
No real Discord message is sent until an administrator provides a valid secret
webhook URL, opts in, and explicitly sends a test or invokes the dispatcher.

## Database

Apply `migrations/0014_discord_notification_outbox.sql` to the **dedicated 11Local
Neon database**, after earlier migrations. This is additive: never reset or copy
existing records. It has one notification table with unique `event_key`,
statuses `pending / processing / sent / failed`, attempt/lock metadata and
operational history. The table is not accessible to public reader roles.

## Private server environment

```dotenv
DISCORD_NOTIFICATIONS_ENABLED=false
DISCORD_WEBHOOK_URL=
DISCORD_DISPATCH_TOKEN=
SITE_URL=https://your-real-11local-domain.example
```

- `DISCORD_NOTIFICATIONS_ENABLED` must be exactly `true` to send.
- Set `DISCORD_WEBHOOK_URL` to the full `https://discord.com/api/webhooks/<id>/<token>`
  secret from a **private** Discord channel. Do not use `NEXT_PUBLIC_`.
- `DISCORD_DISPATCH_TOKEN` must be a random secret of at least 32 characters;
  e.g. generate with `openssl rand -hex 32`. Required for the worker endpoint.
- `SITE_URL` is optional for delivery but recommended for links to Admin.
- Configure secrets in Render/Nhân Hòa's secret manager. Never commit .env.
- One webhook covers step 1; alert-specific webhook is optional later.
  Daily reports and digest scheduling were canceled by Owner.

## Authenticated operations

- `GET /api/admin/discord` returns enabled/configured flags and the latest 30
  delivery records **only for a logged-in Admin**. Never returns the webhook.
- `POST /api/admin/discord/test` queues a unique test, attempts immediate
  delivery, and returns sent/failed status. Requires an Admin session; rejects
  cross-origin browser requests. It may return 502 for an unsuccessful send,
  even though the failed attempt is recorded for retry.
- `POST /api/internal/discord/dispatch` accepts only
  `Authorization: Bearer <DISCORD_DISPATCH_TOKEN>`; claims up to 10 items per run.
  Never expose the token to the browser.

A server-side scheduler can call the dispatcher about once a minute. **Render
Free sleep means no reliable in-process cron.** On VPS, use a systemd timer or
host-provided scheduler; do not run builds on the trading VPS. Dispatching is
opt-in and disabled by default. A simple host-side invocation is:

```bash
curl --fail --silent --show-error --request POST \
  --header "Authorization: Bearer ${DISCORD_DISPATCH_TOKEN}" \
  "https://YOUR-11LOCAL-HOST/api/internal/discord/dispatch"
```

## Delivery safeguards

- Claim is atomic with `FOR UPDATE SKIP LOCKED`, lock expires after 2 minutes.
  Multiple workers do not normally process the same pending row simultaneously.
- `event_key` is unique. Retries use exponential delays (15s to 1h), respect
  Discord `Retry-After`, and stop after five attempts or a permanent 4xx.
- Every Embed uses `allowed_mentions.parse=[]`; no raw claims, emails, phone
  numbers, private evidence or photo bytes should be put into descriptions.
- Only same-site `/admin/...` links are accepted. The Webhook URL is validated
  as an HTTPS Discord Webhook and is never logged or returned to the frontend.
- **Delivery is at-least-once, not mathematically exactly-once.** If Discord
  accepts the request but the process dies before marking `sent`, a retry may
  duplicate one message. Admin must use the referenced record as source of truth.
- Real business handlers in step 2 must insert outbox records in the same
  successful Neon transaction as their business change (do not enqueue on
  failed/rolled-back writes). This foundation includes an idempotent writer;
  attaching it to producers is deferred to avoid modifying existing workflows.
