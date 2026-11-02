"use client";

import { BrowserRouter } from "react-router-dom";

import App from "./legacy/App.jsx";
import { AppProvider } from "./legacy/store.jsx";

export default function DemoApp() {
  return (
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  );
}
