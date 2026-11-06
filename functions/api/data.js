import { jsonResponse } from '../_shared.js';

const SOURCES = [
    ['mainData', 'https://opensheet.elk.sh/112KOJI227dvyHy4w_gD8wuANrVPmFK_ezzZyV_uWVrE/CallMaterial'],
    ['requestData', 'https://opensheet.elk.sh/1xyy70cq2vAxGv4gPIGiL_xA5czDXqS2i6YYqW4yEVbE/Request'],
    ['vipaData', 'https://opensheet.elk.sh/1gtZLR5Tm574o5xRbdrRm9yFzRukGx_UAzUnoah36cxQ/Sheet1'],
    ['nawaData', 'https://opensheet.elk.sh/1x-B1xekpMm4p7fkKucvLjaewtp66uGIp8ZIxJJZAxMk/Sheet1'],
    ['poData', 'https://opensheet.elk.sh/1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o/Po'],
    ['prData', 'https://opensheet.elk.sh/1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o/PR'],
    ['mainSapData', 'https://opensheet.elk.sh/1CkfOIe2nDYBLs5aPGkPyZhOeqJkyS7UQ6tuMzxy-mfk/mainsap'],
    ['plantStockData', 'https://opensheet.elk.sh/1OtcgbmQdrI3gKJCGiDge6xuOsrT0GPxdKeFPjpvK3Rg/Sheet1'],
    ['newPartData', 'https://opensheet.elk.sh/1R8X9yVZBzOc1eDPJU0stKLjVSygMusJihtprdOtb6sE/NewPart'],
    ['projectData', 'https://opensheet.elk.sh/1R8X9yVZBzOc1eDPJU0stKLjVSygMusJihtprdOtb6sE/ProjectLog'],
    ['teamPlantData', 'https://opensheet.elk.sh/1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw/TeamPlant'],
    ...Array.from({ length: 5 }, (_, index) => [
        `engData${index + 1}`,
        `https://opensheet.elk.sh/1yPYR-Lyg7RUj8chHgY9NQ_D5arubvf4kW-YJvJiEOOg/Sheet${index + 1}`
    ])
];

const NAWA_BACKUP_URL = 'https://script.google.com/macros/s/AKfycbywtsN35exs0olcwpwrzIbfm93QyAai2ZfHgWbjeB88d-3XIPWy1e4j3hJqzy5i6loo4g/exec';
export const QUICK_SOURCE_KEYS = ['mainData', 'requestData', 'vipaData', 'nawaData'];
const MATERIAL_SOURCE_KEYS = new Set([
    'requestData', 'poData', 'prData', 'mainSapData',
    'vipaData', 'nawaData', 'plantStockData',
    'engData1', 'engData2', 'engData3', 'engData4', 'engData5'
]);

function normalizeMaterial(value) {
    return String(value ?? '').replace(/^'/, '').replace(/\s+/g, '').trim().toUpperCase();
}

function normalizeTicket(value) {
    return String(value ?? '').replace(/^'/, '').trim();
}

function getSourceMaterial(key, row) {
    if (key === 'requestData') {
        return row?.Material ?? row?.material ?? row?.MaterialCode ?? row?.Mat ?? row?.Item;
    }
    return row?.Material;
}

function filterSourceData(key, data, materials, tickets) {
    if (!Array.isArray(data)) return data;

    if (key === 'mainSapData') {
        const relevantMaterials = new Set(materials);
        data.forEach(row => {
            if (materials.has(normalizeMaterial(row?.Material))) {
                const rebuiltMaterial = normalizeMaterial(row?.Rebuilt);
                if (rebuiltMaterial) relevantMaterials.add(rebuiltMaterial);
            }
        });
        return data.filter(row => relevantMaterials.has(normalizeMaterial(row?.Material)));
    }

    if (MATERIAL_SOURCE_KEYS.has(key)) {
        return data.filter(row => materials.has(normalizeMaterial(getSourceMaterial(key, row))));
    }

    if (key === 'newPartData') {
        return data.filter(row =>
            tickets.has(normalizeTicket(row?.['Ticket Number'])) &&
            materials.has(normalizeMaterial(row?.Material))
        );
    }

    if (key === 'projectData') {
        return data.filter(row => tickets.has(normalizeTicket(row?.['Ticket Number'])));
    }

    return data;
}

export async function getEdgeCache(cacheKey) {
    const edgeCache = globalThis.caches?.default;
    if (!edgeCache) return null;

    try {
        return await edgeCache.match(cacheKey);
    } catch (error) {
        // Continue fetching when the platform edge cache is unavailable.
        console.warn('[API] Edge cache read failed; fetching Sheets directly:', error);
        return null;
    }
}

export function cacheResponse(waitUntil, cacheKey, response) {
    const edgeCache = globalThis.caches?.default;
    if (!edgeCache) return;

    try {
        waitUntil(edgeCache.put(cacheKey, response.clone()).catch(error => {
            console.warn('[API] Edge cache write failed:', error);
        }));
    } catch (error) {
        console.warn('[API] Could not schedule edge cache write:', error);
    }
}

async function fetchJson(url, timeoutMs = 25000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function fetchSource(
    [key, url],
    { timeoutMs = 25000, allowNawaBackup = true, nawaBackupUrl = NAWA_BACKUP_URL } = {}
) {
    try {
        return [key, await fetchJson(url, timeoutMs), null];
    } catch (error) {
        if (key === 'nawaData' && allowNawaBackup && nawaBackupUrl) {
            try {
                return [key, await fetchJson(nawaBackupUrl, timeoutMs), null];
            } catch (backupError) {
                return [key, [], backupError];
            }
        }
        return [key, [], error];
    }
}

export async function fetchSelectedSources(sourceKeys, options) {
    const sources = SOURCES.filter(([key]) => sourceKeys.includes(key));
    const entries = await Promise.all(sources.map(source => fetchSource(source, options)));
    const data = Object.fromEntries(entries.map(([key, sourceData]) => [key, sourceData]));
    const failures = entries.filter(([, , error]) => error).map(([key]) => key);

    return { data, failures };
}

async function fetchAllSources(nawaBackupUrl) {
    const results = new Map();
    const failures = [];
    const [mainKey, mainData, mainError] = await fetchSource(SOURCES[0]);
    results.set(mainKey, mainData);
    if (mainError) {
        console.error(`Data source ${mainKey} failed:`, mainError);
        failures.push(mainKey);
    }
    if (!Array.isArray(mainData) || mainData.length === 0) {
        return jsonResponse({
            error: 'ไม่สามารถโหลดข้อมูลหลักจาก Google Sheets ได้',
            failedSources: failures
        }, 502);
    }

    const materials = new Set(mainData.map(row => normalizeMaterial(row?.Material)).filter(Boolean));
    const tickets = new Set(mainData.map(row => normalizeTicket(row?.['Ticket Number'])).filter(Boolean));
    const sources = SOURCES.slice(1);
    let nextIndex = 0;
    const workers = Array.from({ length: 2 }, async () => {
        while (nextIndex < sources.length) {
            const source = sources[nextIndex++];
            const [key, data, error] = await fetchSource(source, { nawaBackupUrl });
            results.set(key, filterSourceData(key, data, materials, tickets));
            if (error) {
                console.error(`Data source ${key} failed:`, error);
                failures.push(key);
            }
        }
    });
    await Promise.all(workers);

    const responseData = {
        mainData,
        requestData: results.get('requestData'),
        poData: results.get('poData'),
        prData: results.get('prData'),
        mainSapData: results.get('mainSapData'),
        vipaData: results.get('vipaData'),
        nawaData: results.get('nawaData'),
        plantStockData: results.get('plantStockData'),
        newPartData: results.get('newPartData'),
        projectData: results.get('projectData'),
        teamPlantData: results.get('teamPlantData'),
        engData: Array.from({ length: 5 }, (_, index) => ({
            sourceId: `Sheet${index + 1}`,
            data: results.get(`engData${index + 1}`)
        })),
        failedSources: failures
    };

    return jsonResponse(responseData, 200, {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    });
}

export async function onRequestGet({ request, waitUntil, env }) {
    const cacheKey = new Request(new URL('/api/data', request.url).toString());
    const cached = await getEdgeCache(cacheKey);
    if (cached) return cached;

    const nawaBackupUrl = env?.nawa_backup_url || env?.NAWA_BACKUP_URL;
    const response = await fetchAllSources(nawaBackupUrl);
    if (response.ok && response.headers.get('Cache-Control')?.includes('s-maxage=300')) {
        cacheResponse(waitUntil, cacheKey, response);
    }
    return response;
}
