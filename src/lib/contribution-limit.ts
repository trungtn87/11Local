
import {createHmac} from "node:crypto";
import {db} from "./db";
export async function consumeContributionLimit(request: Request) {
  // x-real-ip is set by the trusted reverse proxy, never read an arbitrary leftmost XFF hop.
  const ip = request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const secret = process.env.CONTRIBUTION_RATE_LIMIT_SECRET ||
    process.env.USER_SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("RATE_LIMIT_SECRET_MISSING");
  const key = createHmac("sha256", secret).update(ip).digest("hex");
  const [row] = await db()`INSERT INTO public.contribution_rate_limits (fingerprint, window_start, attempts)
    VALUES (${key}, now(), 1)
    ON CONFLICT (fingerprint) DO UPDATE SET
      attempts = CASE WHEN contribution_rate_limits.window_start < now() - interval '24 hours'
        THEN 1 ELSE contribution_rate_limits.attempts + 1 END,
      window_start = CASE WHEN contribution_rate_limits.window_start < now() - interval '24 hours'
        THEN now() ELSE contribution_rate_limits.window_start END
    RETURNING attempts`;
  return Number(row.attempts) <= 5;
}
