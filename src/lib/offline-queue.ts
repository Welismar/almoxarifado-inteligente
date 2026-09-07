"use client";

type QueueItem = { id?: number; url: string; method: string; body: string; createdAt: string };
const DATABASE = "stockwise-offline";
const STORE = "requests";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineRequest(url: string, body: unknown) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).add({ url, method: "POST", body: JSON.stringify(body), createdAt: new Date().toISOString() } satisfies QueueItem);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function flushOfflineRequests() {
  const database = await openDatabase();
  const items = await new Promise<QueueItem[]>((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as QueueItem[]);
    request.onerror = () => reject(request.error);
  });

  for (const item of items) {
    if (typeof item.id !== "number") continue;

    try {
      const response = await fetch(item.url, { method: item.method, headers: { "Content-Type": "application/json" }, body: item.body, credentials: "include" });
      if (!response.ok) break;
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).delete(item.id as number);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      break;
    }
  }

  database.close();
}
