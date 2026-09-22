"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Service worker registered successfully
        })
        .catch((err) => {
          // Silently handle if unsupported or offline
        });
    }
  }, []);

  return null;
}
