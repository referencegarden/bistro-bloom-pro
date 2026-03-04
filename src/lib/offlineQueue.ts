import { supabase } from "@/integrations/supabase/client";

const DB_NAME = 'restaurantpro-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'queue';

interface QueuedAction {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'upsert';
  data: Record<string, unknown>;
  matchColumns?: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache');
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueAction(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add({ ...action, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const request = tx.objectStore(QUEUE_STORE).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const db = await openDB();
  const actions: QueuedAction[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const request = tx.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      let result;
      const table = supabase.from(action.table as any);
      
      if (action.operation === 'insert') {
        result = await (table as any).insert(action.data);
      } else if (action.operation === 'update') {
        result = await (table as any).update(action.data);
      } else if (action.operation === 'upsert') {
        result = await (table as any).upsert(action.data, {
          onConflict: action.matchColumns || undefined
        });
      }

      if (result?.error) throw result.error;

      // Remove synced action
      const deleteTx = db.transaction(QUEUE_STORE, 'readwrite');
      deleteTx.objectStore(QUEUE_STORE).delete(action.id!);
      synced++;
    } catch (err) {
      console.error('Failed to sync action:', action, err);
      failed++;
    }
  }

  return { synced, failed };
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const count = await getQueueCount();
    if (count > 0) {
      console.log(`Back online. Syncing ${count} queued actions...`);
      const result = await syncQueue();
      console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`);
    }
  });
}
