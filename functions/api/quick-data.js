import { jsonResponse } from '../_shared.js';
import { cacheResponse, fetchSelectedSources, getEdgeCache, QUICK_SOURCE_KEYS } from './data.js';

const QUICK_DATA_COLUMNS = {
    requestData: [
        'Timestamp', 'timestamp', 'Material', 'material', 'MaterialCode', 'Mat', 'Item',
        'plant', 'Plant', 'qty', 'Qty', 'QTY', 'Quantity', 'quantity', 'จำนวน', 'จำนวนที่ขอเบิก'
    ],
    vipaData: ['Material', 'Unrestricted'],
    nawaData: [
        'Material', 'Unrestricted', 'Material description', 'Material description old',
        'Description', 'Planned Deliv. Time', 'Purchasing Group', 'Purch. Group', 'PG'
    ]
};

function selectColumns(rows, columns) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => Object.fromEntries(
        columns.filter(column => row[column] !== undefined).map(column => [column, row[column]])
    ));
}

function getCallMaterials(rows) {
    if (!Array.isArray(rows)) return new Set();
    return new Set(rows
        .map(row => String(row?.Material ?? '').replace(/^'/, '').replace(/\s+/g, '').trim().toUpperCase())
        .filter(Boolean));
}

function filterStockRows(rows, materials) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => {
        const material = String(row?.Material ?? '').replace(/^'/, '').replace(/\s+/g, '').trim().toUpperCase();
        return materials.has(material);
    });
}

async function fetchQuickData() {
    // This endpoint feeds the first useful screen. Bound slow Sheets requests so
    // one stock sheet (or the Nawa backup) cannot hold the whole response open.
    // The full refresh continues in the background and will fill missing values.
    const { data, failures } = await fetchSelectedSources(QUICK_SOURCE_KEYS, {
        timeoutMs: 10000,
        allowNawaBackup: false
    });
    const mainData = data.mainData;
    if (!Array.isArray(mainData) || mainData.length === 0) {
        return jsonResponse({
            error: 'ไม่สามารถโหลดข้อมูลหลักจาก Google Sheets ได้',
            failedSources: failures
        }, 502);
    }

    const callMaterials = getCallMaterials(mainData);
    return jsonResponse({
        mainData,
        requestData: selectColumns(data.requestData, QUICK_DATA_COLUMNS.requestData),
        vipaData: selectColumns(filterStockRows(data.vipaData, callMaterials), QUICK_DATA_COLUMNS.vipaData),
        nawaData: selectColumns(filterStockRows(data.nawaData, callMaterials), QUICK_DATA_COLUMNS.nawaData),
        poData: [],
        prData: [],
        mainSapData: [],
        plantStockData: [],
        newPartData: [],
        projectData: [],
        teamPlantData: [],
        engData: Array.from({ length: 5 }, (_, index) => ({
            sourceId: `Sheet${index + 1}`,
            data: []
        })),
        failedSources: failures
    }, 200, {
        'Cache-Control': 'public, max-age=10, s-maxage=60, stale-while-revalidate=300'
    });
}

export async function onRequestGet({ request, waitUntil }) {
    const cacheKey = new Request(new URL('/api/quick-data', request.url).toString());
    const cached = await getEdgeCache(cacheKey);
    if (cached) return cached;

    const response = await fetchQuickData();
    if (response.ok && response.headers.get('Cache-Control')?.includes('s-maxage=60')) {
        cacheResponse(waitUntil, cacheKey, response);
    }
    return response;
}
