import { loadAllFromCache } from './cacheService';

async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status})`);
        }

        if (!response.ok) {
            throw new Error(result?.error || `HTTP ${response.status}`);
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

function mergeCachedSources(data, cachedData) {
    const result = { ...data };
    const sourceKeys = [
        'mainData', 'requestData', 'poData', 'prData', 'mainSapData',
        'vipaData', 'nawaData', 'plantStockData', 'newPartData',
        'projectData', 'teamPlantData'
    ];

    sourceKeys.forEach((key) => {
        if (
            Array.isArray(result[key]) &&
            result[key].length === 0 &&
            Array.isArray(cachedData[key]) &&
            cachedData[key].length > 0
        ) {
            result[key] = cachedData[key];
        }
    });

    if (Array.isArray(result.engData) && Array.isArray(cachedData.engData)) {
        const cachedSheets = new Map(cachedData.engData.map((sheet) => [sheet.sourceId, sheet]));
        result.engData = result.engData.map((sheet) => {
            const cachedSheet = cachedSheets.get(sheet.sourceId);
            return sheet.data.length === 0 && cachedSheet?.data?.length
                ? cachedSheet
                : sheet;
        });
    }

    return result;
}

export async function fetchAllData() {
    const data = await requestJson('/api/data');
    if (data.failedSources?.length) {
        console.warn('[API] Some data sources failed:', data.failedSources);
    }
    const cachedData = await loadAllFromCache();
    return mergeCachedSources(data, cachedData);
}

export async function fetchQuickData() {
    const data = await requestJson('/api/quick-data');
    if (data.failedSources?.length) {
        console.warn('[API] Some quick data sources failed:', data.failedSources);
    }
    const cachedData = await loadAllFromCache();
    return mergeCachedSources(data, cachedData);
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
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
