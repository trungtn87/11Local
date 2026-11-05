import { createHash, createHmac } from "node:crypto";
import type postgres from "postgres";

const MAX_PER_MINUTE = 10;

function actorFingerprint(request: Request, userId: string | null) {
  // Use proxy-supplied IP, not an arbitrary leftmost XFF hop.
  const ip = request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const actor = userId ? "user:" + userId : "ip:" + ip;
  const secret = process.env.CONTRIBUTION_RATE_LIMIT_SECRET ||
    process.env.USER_SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("RATE_LIMIT_SECRET_MISSING");
  return createHmac("sha256", secret).update(actor).digest("hex");
}

/** Hash normalized submission and images, not a large multipart request buffer. */
export function submissionHash(kind: string, payload: unknown, photos: Buffer[] = []) {
  return createHash("sha256")
    .update(JSON.stringify({ kind, payload,
      photos: photos.map(photo => createHash("sha256").update(photo).digest("hex")) }))
    .digest("hex");
}

/** Must run inside the same DB transaction as the accepted submission.
 * Invalid or failed requests roll back both the minute counter and duplicate claim.
 */
export async function claimContribution(
  tx: postgres.TransactionSql, request: Request, userId: string | null, contentHash: string,
) {
  const fingerprint = actorFingerprint(request, userId);
  const [rate] = await tx`INSERT INTO public.contribution_rate_limits (fingerprint, window_start, attempts)
    VALUES (${fingerprint}, now(), 1)
    ON CONFLICT (fingerprint) DO UPDATE SET
      attempts = CASE WHEN contribution_rate_limits.window_start <= now() - interval '1 minute'
        THEN 1 ELSE contribution_rate_limits.attempts + 1 END,
      window_start = CASE WHEN contribution_rate_limits.window_start <= now() - interval '1 minute'
        THEN now() ELSE contribution_rate_limits.window_start END
    RETURNING attempts`;
  if (Number(rate.attempts) > MAX_PER_MINUTE) throw new Error("RATE_LIMITED");

  const [claimed] = await tx`INSERT INTO public.contribution_recent_submissions
      (fingerprint, payload_hash, submitted_at)
      VALUES (${fingerprint}, ${contentHash}, now())
    ON CONFLICT (fingerprint, payload_hash) DO UPDATE SET submitted_at = now()
      WHERE contribution_recent_submissions.submitted_at <= now() - interval '30 seconds'
    RETURNING submitted_at`;
  if (!claimed) throw new Error("DUPLICATE_SUBMISSION");
  // No cron or growing permanent log required; short-lived hashes are cleaned up on submissions.
  await tx`DELETE FROM public.contribution_recent_submissions
    WHERE submitted_at < now() - interval '2 minutes'`;
}
