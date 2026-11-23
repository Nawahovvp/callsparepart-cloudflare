import { loadAllFromCache } from './cacheService';

const APP_REQUEST_HEADERS = {
    'X-Requested-With': 'CallSparePartApp'
};

function notifyUnauthorized(url) {
    if (typeof window !== 'undefined' && !url.startsWith('/api/login')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
}

async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'same-origin',
            headers: {
                ...APP_REQUEST_HEADERS,
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        let result;
        try {
            result = await response.json();
        } catch {
            if (response.status === 401) {
                notifyUnauthorized(url);
            }
            throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status})`);
        }

        if (!response.ok) {
            if (response.status === 401) {
                notifyUnauthorized(url);
            }
            const err = new Error(result?.error || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }

        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('การเรียก API ใช้เวลานานเกินไป');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function logoutUser() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: APP_REQUEST_HEADERS
        });
    } catch (error) {
        console.warn('[API] Logout request failed:', error);
    }
}

export async function loginUser(username, password) {
    if (!username || username.length !== 7 || !username.startsWith('7')) {
        throw new Error('รหัสพนักงานต้องเป็น 7 หลักและเริ่มต้นด้วย 7');
    }
    if (!password || password.length !== 4) {
        throw new Error('รหัสผ่านต้องเป็น 4 หลัก');
    }

    return requestJson('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
}

function mergeCachedSources(data, cachedData, fresh = false, latestQuickData = null) {
    const result = { ...data };
    const failedSources = new Set(data.failedSources || []);
    const sourceKeys = [
        'mainData', 'dateUpdateData', 'requestData', 'poData', 'prData', 'mainSapData',
        'vipaData', 'nawaData', 'plantStockData', 'newPartData',
        'projectData', 'teamPlantData'
    ];

    sourceKeys.forEach((key) => {
        const isMissing = !Array.isArray(result[key]) || result[key].length === 0;
        const isFailed = failedSources.has(key);
        if (isMissing || isFailed) {
            // First priority: If latestQuickData already has fresh data in this session, use it!
            if (Array.isArray(latestQuickData?.[key]) && latestQuickData[key].length > 0) {
                result[key] = latestQuickData[key];
                return;
            }
            // Second priority: Cache fallback (only if not fresh, or if this source explicitly failed)
            if (
                Array.isArray(cachedData?.[key]) &&
                cachedData[key].length > 0 &&
                (!fresh || isFailed)
            ) {
                result[key] = cachedData[key];
            }
        }
    });

    if (Array.isArray(result.engData) && Array.isArray(cachedData?.engData)) {
        const cachedSheets = new Map(cachedData.engData.map((sheet) => [sheet.sourceId, sheet]));
        result.engData = result.engData.map((sheet) => {
            const cachedSheet = cachedSheets.get(sheet.sourceId);
            const sheetNumber = sheet.sourceId?.replace('Sheet', '');
            const failed = failedSources.has(`engData${sheetNumber}`);
            return sheet.data.length === 0 && cachedSheet?.data?.length && (!fresh || failed)
                ? cachedSheet
                : sheet;
        });
    }

    return result;
}

export async function fetchAllData({ fresh = false, latestQuickData = null } = {}) {
    const data = await requestJson(fresh ? '/api/data?fresh=1' : '/api/data', {
        cache: fresh ? 'no-store' : 'default',
        headers: fresh ? { 'Cache-Control': 'no-cache' } : undefined
    });
    if (data.failedSources?.length) {
        console.warn('[API] Some data sources failed:', data.failedSources);
    }
    const cachedData = await loadAllFromCache();
    return mergeCachedSources(data, cachedData, fresh, latestQuickData);
}

export async function fetchQuickData({ fresh = false } = {}) {
    const data = await requestJson(fresh ? '/api/quick-data?fresh=1' : '/api/quick-data', {
        cache: fresh ? 'no-store' : 'default',
        headers: fresh ? { 'Cache-Control': 'no-cache' } : undefined
    });
    if (data.failedSources?.length) {
        console.warn('[API] Some quick data sources failed:', data.failedSources);
    }
    return data;
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...APP_REQUEST_HEADERS
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (response.status === 401) {
            notifyUnauthorized(url);
        }
        let errorMessage;
        try {
            errorMessage = (await response.json()).error;
        } catch {
            errorMessage = null;
        }
        throw new Error(errorMessage || `HTTP ${response.status}`);
    }

    return response;
}

export function saveToGoogleSheet(payload) {
    return postJson('/api/save', payload);
}

export function sendOutsideRequest(payload) {
    return postJson('/api/outside-request', payload);
}
