/**
 * Persists white-balance calibration data in IndexedDB so it survives
 * page reloads and can be reused for 24 hours (one shift).
 *
 * Shape stored:
 *   { correctionMatrix: [rScale, gScale, bScale], calibratedAt: ISO string }
 */

const DB_NAME = "meatlens-calibration";
const DB_VERSION = 1;
const STORE_NAME = "calibration";
const KEY = "current";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StoredCalibration {
  correctionMatrix: [number, number, number]; // [rScale, gScale, bScale]
  calibratedAt: string; // ISO 8601
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCalibration(matrix: [number, number, number]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const entry: StoredCalibration = {
      correctionMatrix: matrix,
      calibratedAt: new Date().toISOString(),
    };
    tx.objectStore(STORE_NAME).put(entry, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCalibration(): Promise<StoredCalibration | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => {
      const entry = req.result as StoredCalibration | undefined;
      if (!entry) { resolve(null); return; }
      const age = Date.now() - new Date(entry.calibratedAt).getTime();
      resolve(age < TTL_MS ? entry : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearCalibration(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Returns how many milliseconds remain before the current calibration expires, or 0. */
export async function calibrationTTLMs(): Promise<number> {
  const entry = await loadCalibration();
  if (!entry) return 0;
  const elapsed = Date.now() - new Date(entry.calibratedAt).getTime();
  return Math.max(0, TTL_MS - elapsed);
}
