'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
let pending: Promise<Response> | undefined;
export function recordVisit() {
  pending ??= fetch('/api/analytics/visit', { method: 'POST', keepalive: true }).finally(() => { pending = undefined; });
  return pending;
}
export async function recordPlaceView(id: string) {
  try {
    await recordVisit();
    await fetch('/api/places/' + encodeURIComponent(id) + '/view', { method: 'POST', keepalive: true });
  } catch { /* Analytics must never block browsing. */ }
}
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    let active = Date.now();
    const activity = () => { active = Date.now(); };
    const ping = () => {
      if (document.visibilityState === 'visible' && Date.now() - active < 60000)
        void recordVisit().then(() => window.dispatchEvent(new Event('11local:stats'))).catch(() => {});
    };
    ping();
    const timer = setInterval(ping, 60000);
    window.addEventListener('pointerdown', activity);
    window.addEventListener('keydown', activity);
    window.addEventListener('scroll', activity, { passive: true });
    document.addEventListener('visibilitychange', activity);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pointerdown', activity);
      window.removeEventListener('keydown', activity);
      window.removeEventListener('scroll', activity);
      document.removeEventListener('visibilitychange', activity);
    };
  }, [pathname]);
  return null;
}
