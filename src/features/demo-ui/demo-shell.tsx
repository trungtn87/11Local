"use client";

import { useSyncExternalStore } from "react";

import DemoApp from "./demo-app";

const subscribe = () => () => {};

export function DemoShell() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);

  if (!isClient) {
    return (
      <main className="state" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>Đang mở 11Local…</p>
      </main>
    );
  }

  return <DemoApp />;
}
