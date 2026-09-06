"use client";

import { useEffect } from "react";
import { flushOfflineRequests } from "@/lib/offline-queue";

export function OfflineSync() {
  useEffect(() => {
    const sync = () => { void flushOfflineRequests(); };
    window.addEventListener("online", sync);
    if (navigator.onLine) sync();
    return () => window.removeEventListener("online", sync);
  }, []);

  return null;
}
