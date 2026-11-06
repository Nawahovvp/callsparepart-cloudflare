// Data Source URLs
const sheetID = '1dzE4Xjc7H0OtNUmne62u0jFQT-CiGsG2eBo-1v6mrZk';
const sheetName = 'Coll_Stock';
export const mainDataUrl = `https://opensheet.elk.sh/${sheetID}/${sheetName}`;

const employeeSheetID = '1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw';
const employeeSheetName = 'EmployeeWeb';
export const employeeUrl = `https://opensheet.elk.sh/${employeeSheetID}/${employeeSheetName}`;

const requestSheetID = '1xyy70cq2vAxGv4gPIGiL_xA5czDXqS2i6YYqW4yEVbE';
const requestSheetName = 'Request';
export const requestUrl = `https://opensheet.elk.sh/${requestSheetID}/${encodeURIComponent(requestSheetName)}`;

const poSheetID = '1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o';
const poSheetName = 'Po';
export const poUrl = `https://opensheet.elk.sh/${poSheetID}/${encodeURIComponent(poSheetName)}`;

const prSheetID = '1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o';
const prSheetName = 'PR';
export const prUrl = `https://opensheet.elk.sh/${prSheetID}/${encodeURIComponent(prSheetName)}`;

const mainSapSheetID = '1CkfOIe2nDYBLs5aPGkPyZhOeqJkyS7UQ6tuMzxy-mfk';
const mainSapSheetName = 'mainsap';
export const mainSapUrl = `https://opensheet.elk.sh/${mainSapSheetID}/${mainSapSheetName}`;

const vipaSheetID = '1gtZLR5Tm574o5xRbdrRm9yFzRukGx_UAzUnoah36cxQ';
const vipaSheetName = 'Sheet1';
export const vipaUrl = `https://opensheet.elk.sh/${vipaSheetID}/${vipaSheetName}`;

const nawaSheetID = '1x-B1xekpMm4p7fkKucvLjaewtp66uGIp8ZIxJJZAxMk';
const nawaSheetName = 'Sheet1';
export const nawaUrl = `https://opensheet.elk.sh/${nawaSheetID}/${nawaSheetName}`;
export const nawaBackupUrl = `https://script.google.com/macros/s/AKfycbywtsN35exs0olcwpwrzIbfm93QyAai2ZfHgWbjeB88d-3XIPWy1e4j3hJqzy5i6loo4g/exec`;

const plantStockSheetID = '1OtcgbmQdrI3gKJCGiDge6xuOsrT0GPxdKeFPjpvK3Rg';
const plantStockSheetName = 'Sheet1';
export const plantStockUrl = `https://opensheet.elk.sh/${plantStockSheetID}/${plantStockSheetName}`;

const updateSheetName = 'Update';
export const updateUrl = `https://opensheet.elk.sh/${sheetID}/${updateSheetName}`;

export const newPartLoadUrl = "https://opensheet.elk.sh/1R8X9yVZBzOc1eDPJU0stKLjVSygMusJihtprdOtb6sE/NewPart";
export const projectLogLoadUrl = "https://opensheet.elk.sh/1R8X9yVZBzOc1eDPJU0stKLjVSygMusJihtprdOtb6sE/ProjectLog";
export const newPartSaveUrl = "https://script.google.com/macros/s/AKfycbwRKCZxTrzSiY1CSE54q-GMJYiCiXdrfj_CBXM2yLerGsExJUsH0UrPgiQcSP-btN45/exec";
export const logUrl = "https://script.google.com/macros/s/AKfycbyx8Y6S7iYw95BBd8nHSJArEU_o25mSb7QuF7pxdInbGZOIkDaiQLiaBwHFkHiILQPg/exec";
export const syncSummaryUrl = "https://script.google.com/macros/s/AKfycbyA5gl4mdz5v1x4atWM51fFlB8-UwiyvhwVsxJ6mMtxFdm7erg5uH92yR0BOnMUtUsp2w/exec";
export const teamPlantUrl = `https://opensheet.elk.sh/1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw/TeamPlant`;

// Plant-specific Eng data sources (Technician stock)
const engBaseId = "1yPYR-Lyg7RUj8chHgY9NQ_D5arubvf4kW-YJvJiEOOg";
export const engUrlsArray = [
    `https://opensheet.elk.sh/${engBaseId}/Sheet1`,
    `https://opensheet.elk.sh/${engBaseId}/Sheet2`,
    `https://opensheet.elk.sh/${engBaseId}/Sheet3`,
    `https://opensheet.elk.sh/${engBaseId}/Sheet4`,
    `https://opensheet.elk.sh/${engBaseId}/Sheet5`
];

import { loadFromCache } from './cacheService';

// Fetch utils
export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 60000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw error;
    }
}

export async function safeJson(response, timeout = 60000) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('JSON processing timeout')), timeout);
    });
    try {
        return await Promise.race([response.json(), timeoutPromise]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Fetch URL and parse JSON with automatic retries and end-to-end timeout.
 */
export async function fetchJsonWithRetry(url, options = {}, retries = 2, timeoutMs = 60000) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            clearTimeout(timeoutId);
            return data;
        } catch (err) {
            clearTimeout(timeoutId);
            lastError = err.name === 'AbortError' 
                ? new Error(`Fetch timed out after ${timeoutMs}ms`) 
                : err;

            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

// Login
export async function loginUser(username, password) {
    if (!username || username.length !== 7 || !username.startsWith('7')) {
        throw new Error('รหัสพนักงานต้องเป็น 7 หลักและเริ่มต้นด้วย 7');
    }
    if (!password || password.length !== 4) {
        throw new Error('รหัสผ่านต้องเป็น 4 หลัก');
    }
    const derivedPassword = username.slice(-4);
    if (password !== derivedPassword) {
        throw new Error('รหัสผ่านไม่ถูกต้อง (ใช้ 4 หลักสุดท้ายของรหัสพนักงาน)');
    }

    const employees = await fetchJsonWithRetry(employeeUrl, { cache: 'no-store' }, 2, 45000);

    // Cache for future
    localStorage.setItem('app_cached_employees', JSON.stringify(employees));

    const user = employees.find(emp => emp.IDRec === username);
    if (!user || !user.Name) {
        throw new Error('ไม่พบข้อมูลพนักงานนี้');
    }

    // --- Log successful login to GAS (fire-and-forget, no-cors) ---
    try {
        await fetch(logUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'login',
                userId: user.IDRec,
                userName: user.Name,
                userPlant: user.Plant || localStorage.getItem('userPlant') || '-',
                status: 'SUCCESS'
            })
        });
        console.log("Login log request sent successfully");
    } catch (e) {
        console.warn("Login logging failed (non-critical):", e);
    }
    // ------------------------------------

    return user;
}

async function runInBatches(tasks, concurrency = 6) {
    // Keep requests concurrent while respecting the browser's per-origin
    // connection limit (most data comes from opensheet.elk.sh).
    const results = new Array(tasks.length);
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
        while (true) {
            const index = nextIndex++;
            if (index >= tasks.length) return;
            try {
                results[index] = { status: 'fulfilled', value: await tasks[index]() };
            } catch (reason) {
                results[index] = { status: 'rejected', reason };
            }
        }
    });

    await Promise.all(workers);
    return results;
}

// Fetch All Parallel with retry & fallback
export async function fetchAllData() {
    const fetchTasks = [
        () => fetchJsonWithRetry(mainDataUrl, { cache: 'no-store' }, 2, 60000),
        () => fetchJsonWithRetry(requestUrl, { cache: 'no-store' }, 2, 45000),
        () => fetchJsonWithRetry(poUrl, { cache: 'no-store' }, 2, 60000),
        () => fetchJsonWithRetry(prUrl, { cache: 'no-store' }, 2, 45000),
        () => fetchJsonWithRetry(mainSapUrl, { cache: 'no-store' }, 2, 60000),
        () => fetchJsonWithRetry(vipaUrl, { cache: 'no-store' }, 2, 60000),
        () => fetchJsonWithRetry(nawaUrl, { cache: 'no-store' }, 1, 45000)
            .catch(async (err) => {
                console.warn("Primary Nawa fetch failed, trying backup:", err);
                try {
                    return await fetchJsonWithRetry(nawaBackupUrl, { cache: 'no-store' }, 1, 60000);
                } catch (backupErr) {
                    console.error("Backup Nawa fetch also failed:", backupErr);
                    throw backupErr;
                }
            }),
        () => fetchJsonWithRetry(plantStockUrl, { cache: 'no-store' }, 2, 60000),
        () => fetchJsonWithRetry(newPartLoadUrl, { cache: 'no-store' }, 2, 30000),
        () => fetchJsonWithRetry(projectLogLoadUrl, { cache: 'no-store' }, 2, 30000),
        () => fetchJsonWithRetry(updateUrl, { cache: 'no-store' }, 2, 30000),
        () => fetchJsonWithRetry(teamPlantUrl, { cache: 'no-store' }, 2, 45000),
        // All Eng spreadsheets
        ...engUrlsArray.map((url, i) => 
            () => fetchJsonWithRetry(url, { cache: 'no-store' }, 2, 45000).then(data => ({ sourceId: `Sheet${i+1}`, data }))
        )
    ];

    // Six concurrent requests use the browser's available per-origin slots
    // without creating a long queue of sequential batches.
    const results = await runInBatches(fetchTasks, 6);

    const safeResult = async (idx, name) => {
        if (results[idx] && results[idx].status === 'fulfilled' && results[idx].value) {
            const val = results[idx].value;
            if (!Array.isArray(val) || val.length > 0) {
                return val;
            }
        }
        console.error(`Fetch failed for ${name}:`, results[idx]?.reason);
        // Fallback to cache if server fetch failed or returned empty
        try {
            const cached = await loadFromCache(name, { allowStale: true });
            if (cached && (!Array.isArray(cached) || cached.length > 0)) {
                console.warn(`[Fallback] Loaded ${name} from cache due to fetch failure`);
                return cached;
            }
        } catch (e) {}
        return [];
    };

    const engDataResults = await Promise.all(results.slice(12).map(async (res, i) => {
        const sourceId = `Sheet${i+1}`;
        if (res.status === 'fulfilled' && res.value?.data && (!Array.isArray(res.value.data) || res.value.data.length > 0)) {
            return res.value;
        }
        try {
            const cachedEng = await loadFromCache('engData', { allowStale: true });
            const matchingSheet = cachedEng?.find(s => s.sourceId === sourceId);
            if (matchingSheet && matchingSheet.data?.length > 0) {
                console.warn(`[Fallback] Loaded engData ${sourceId} from cache`);
                return matchingSheet;
            }
        } catch (e) {}
        return { sourceId, data: [] };
    }));

    return {
        mainData: await safeResult(0, 'mainData'),
        requestData: await safeResult(1, 'requestData'),
        poData: await safeResult(2, 'poData'),
        prData: await safeResult(3, 'prData'),
        mainSapData: await safeResult(4, 'mainSapData'),
        vipaData: await safeResult(5, 'vipaData'),
        nawaData: await safeResult(6, 'nawaData'),
        plantStockData: await safeResult(7, 'plantStockData'),
        newPartData: await safeResult(8, 'newPartData'),
        projectData: await safeResult(9, 'projectData'),
        updateData: await safeResult(10, 'updateData'),
        teamPlantData: await safeResult(11, 'teamPlantData'),
        engData: engDataResults
    };
}

// Save status edit or project update to Google Sheet
export async function saveToGoogleSheet(payload) {
    const response = await fetch(newPartSaveUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    });
    return response;
}

// Sync Summary Table to a dedicated Google Sheet
export async function syncSummaryToGoogleSheet(data) {
    const response = await fetch(syncSummaryUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            action: 'sync_summary',
            data: data
        })
    });
    return response;
}
