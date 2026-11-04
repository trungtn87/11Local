export const SESSION_SECONDS = 30 * 60;
export function isBot(userAgent: string) {
  return !userAgent || /bot|crawler|spider|slurp|headless|preview|lighthouse/i.test(userAgent);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    return ['http:', 'https:'].includes(source.protocol) && source.host === (request.headers.get('host') || new URL(request.url).host);
  } catch { return false; }
}
export function dateRange(params: URLSearchParams, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const end = params.get('end') || today;
  const start = params.get('start') || new Date(Date.parse(today + 'T00:00:00Z') - 29 * 86400000).toISOString().slice(0, 10);
  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  if (!valid(start) || !valid(end) || start > end || end > today || Date.parse(end) - Date.parse(start) > 365 * 86400000) throw new Error('INVALID_DATE_RANGE');
  return { start, end };
}
