/**
 * Cache-first data loading service using IndexedDB (handles large datasets).
 * Caches: poData, prData, engData, plantStockData
 */

const DB_NAME = 'AppDataCache';
const DB_VERSION = 1;
const STORE_NAME = 'dataCache';
const DEFAULT_MAX_AGE = 30 * 60 * 1000; // 30 minutes
let dbPromise;

export const CACHEABLE_KEYS = [
    'mainData', 'requestData', 'poData', 'prData', 'mainSapData', 
    'vipaData', 'nawaData', 'plantStockData', 'newPartData', 
    'projectData', 'teamPlantData', 'engData'
];

// --- IndexedDB helpers ---

function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => {
            request.result.onversionchange = () => {
                request.result.close();
                dbPromise = null;
            };
            resolve(request.result);
        };
        request.onerror = () => {
            dbPromise = null;
            reject(request.error);
        };
    });
    return dbPromise;
}

function idbGet(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

function idbGetAll(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

function idbPut(db, key, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ key, timestamp: Date.now(), data });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function idbPutMany(db, entries) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        entries.forEach(({ key, data }) => store.put({ key, timestamp: Date.now(), data }));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// --- Public API ---

/**
 * Save data to IndexedDB cache with a timestamp.
 */
export async function saveToCache(key, data) {
    try {
        const db = await openDB();
        await idbPut(db, key, data);
        console.log(`[Cache] Saved ${key} (${Array.isArray(data) ? data.length + ' items' : 'object'})`);
    } catch (e) {
        console.warn(`[Cache] Failed to save ${key}:`, e);
    }
}

/**
 * Load data from IndexedDB cache.
 * Supports stale-while-revalidate via allowStale (default true).
 */
export async function loadFromCache(key, options = {}) {
    try {
        const { maxAgeMs = DEFAULT_MAX_AGE, allowStale = true } =
            typeof options === 'number' ? { maxAgeMs: options, allowStale: false } : options;

        const db = await openDB();
        const entry = await idbGet(db, key);
        if (!entry || !entry.data) return null;

        const age = Date.now() - (entry.timestamp || 0);
        if (!allowStale && age > maxAgeMs) {
            console.log(`[Cache] ${key} expired (${Math.round(age / 1000)}s old)`);
            return null;
        }

        console.log(`[Cache] Loaded ${key} from cache (${Math.round(age / 1000)}s old${age > maxAgeMs ? ', stale' : ''})`);
        return entry.data;
    } catch (e) {
        console.warn(`[Cache] Failed to load ${key}:`, e);
        return null;
    }
}

/**
 * Load all cacheable data sources at once.
 */
export async function loadAllFromCache(options = { allowStale: true }) {
    const result = {};
    try {
        const { maxAgeMs = DEFAULT_MAX_AGE, allowStale = true } =
            typeof options === 'number' ? { maxAgeMs: options, allowStale: false } : options;
        const db = await openDB();
        const entries = new Map((await idbGetAll(db)).map(entry => [entry.key, entry]));

        for (const key of CACHEABLE_KEYS) {
            const entry = entries.get(key);
            if (!entry || !entry.data) {
                result[key] = null;
                continue;
            }
            const age = Date.now() - (entry.timestamp || 0);
            result[key] = !allowStale && age > maxAgeMs ? null : entry.data;
        }
    } catch (e) {
        console.warn('[Cache] Failed to load all data:', e);
        for (const key of CACHEABLE_KEYS) result[key] = null;
    }
    return result;
}

/**
 * Save all cacheable data sources at once.
 * Guards against overwriting existing valid cache with empty arrays from failed fetches.
 */
export async function saveAllToCache(data) {
    try {
        const db = await openDB();
        const existingEntries = new Map((await idbGetAll(db)).map(entry => [entry.key, entry]));
        const entriesToSave = [];

        for (const key of CACHEABLE_KEYS) {
            const value = data[key];
            if (value === undefined || value === null) continue;

            const existing = existingEntries.get(key);
            if (
                Array.isArray(value) &&
                value.length === 0 &&
                Array.isArray(existing?.data) &&
                existing.data.length > 0
            ) {
                console.log(`[Cache] Skipping save for empty ${key} to preserve existing cache`);
                continue;
            }
            entriesToSave.push({ key, data: value });
        }

        await idbPutMany(db, entriesToSave);
    } catch (error) {
        console.warn('[Cache] Failed to save all data:', error);
    }
}
