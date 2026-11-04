"use client";

import { useSyncExternalStore } from "react";
import DemoApp from "./demo-app";

const subscribe = () => () => {};
export type PublicShellProps = {
  pathname?: string;
  initialPlaces?: Record<string, unknown>[];
  initialCategories?: Record<string, unknown>[];
  initialPlacesState?: "loading" | "ready" | "error";
  initialCategoriesState?: "loading" | "ready" | "error";
};

// Keep legacy account/contribution/map routes unchanged while public pages
// migrate to real server rendering. They must not block the SSR migration.
function LegacyClientOnly() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) {
    return <main className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Đang mở 11Local…</p>
    </main>;
  }
  return <DemoApp />;
}

export function DemoShell(props: PublicShellProps = {}) {
  if (props.pathname === "/" || props.pathname === "/tim-kiem") {
    return <DemoApp {...props} />;
  }
  return <LegacyClientOnly />;
}
