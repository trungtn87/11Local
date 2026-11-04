"use client";

import { useSyncExternalStore } from "react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "./legacy/App.jsx";
import { AppProvider } from "./legacy/store.jsx";
import type { PublicShellProps } from "./demo-shell";

const subscribe = () => () => {};

export default function DemoApp({
  pathname = "/",
  initialPlaces = [],
  initialPlacesState = "loading",
  initialCategories = [],
  initialCategoriesState = "loading",
}: PublicShellProps) {
  // MemoryRouter renders the same path on server and during hydration.
  // BrowserRouter takes over only after hydration for client navigation.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const content = (
    <AppProvider
      initialPlaces={initialPlaces}
      initialPlacesState={initialPlacesState}
      initialCategories={initialCategories}
      initialCategoriesState={initialCategoriesState}
    >
      <App />
    </AppProvider>
  );
  return hydrated
    ? <BrowserRouter>{content}</BrowserRouter>
    : <MemoryRouter initialEntries={[pathname]}>{content}</MemoryRouter>;
}
