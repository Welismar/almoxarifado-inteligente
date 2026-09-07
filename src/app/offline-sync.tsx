"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { flushOfflineRequests } from "@/lib/offline-queue";

const subscribeToConnection = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

const getConnectionState = () => navigator.onLine;
const getServerConnectionState = () => true;

export function OfflineSync() {
  const isOnline = useSyncExternalStore(subscribeToConnection, getConnectionState, getServerConnectionState);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) return;
      setIsSyncing(true);
      try {
        await flushOfflineRequests();
      } finally {
        setIsSyncing(false);
      }
    };

    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    const timer = window.setTimeout(() => void sync(), 0);

    return () => {
      window.removeEventListener("online", onOnline);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 999,
        background: isOnline ? "rgba(23, 127, 94, 0.92)" : "rgba(140, 79, 16, 0.9)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.2,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.22)",
      }}
      aria-live="polite"
    >
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: isOnline ? "#8ef5c6" : "#ffd89a", display: "inline-block" }} />
      {isSyncing ? "Sincronizando..." : isOnline ? "Online" : "Offline"}
    </div>
  );
}
