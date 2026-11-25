// Helper functions for call data processing

export function parseDateString(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let yearStr = parts[2].split(' ')[0];
        let year = parseInt(yearStr, 10);
        if (year < 2000) year += 2000;
        return new Date(year, month, day);
    }
    return null;
}

export function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

export function calculateDaysBetween(startDate, endDate) {
    if (!isValidDate(startDate) || !isValidDate(endDate)) return null;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function normalizeMaterial(mat) {
    if (mat == null) return "";
    let strMat = typeof mat === 'number' ? Math.trunc(mat).toString() : mat.toString();
    return strMat.trim().replace(/^'/, '').trim().replace(/\s+/g, '').toUpperCase();
}

export const PLANT_MAPPING = {
    "Stock กทม": "0301",
    "Stock ระยอง": "0369",
    "Stock วิภาวดี 62": "0326",
    "Stock ขอนแก่น": "0319",
    "Stock โคราช": "0309",
    "Stock เชียงใหม่": "0366",
    "Stock พระราม 3": "0304",
    "Stock พิษณุโลก": "0312",
    "Stock ภูเก็ต": "0313",
    "Stock ราชบุรี": "0305",
    "Stock ลำปาง": "0320",
    "Stock ศรีราชา": "0311",
    "Stock สุราษฎร์": "0307",
    "Stock ประเวศ": "0330",
    "Stock SA ฉะเชิงเทรา": "0367",
    "Stock SA บางบัวทอง": "0364",
    "Stock SA ปัตตานี": "0324",
    "Stock SA ปากเกร็ด": "0363",
    "Stock SA ร้อยเอ็ด": "0368",
    "Stock SA ลำลูกกา": "0323",
    "Stock SA สงขลา": "0303",
    "Stock SA สมุทรปราการ": "0365",
    "Stock SA หนองแขม": "0362",
    "Stock SA อยุธยา": "0315",
    "Stock SA อุดรธานี1": "0310",
    "Stock SA อุดรธานี2": "0322",
    "0326": "SA นนทบุรี"
};

export const DEPT_GROUPS = [
    { key: 'Stock', label: 'Stock', test: (val) => /Stock/i.test(val) },
    { key: 'วิศวกรรม', label: 'วิศวกรรม', test: (val) => /วิศวกรรม/i.test(val) },
    { key: 'Repair', label: 'Repair', test: (val) => /Repair/i.test(val) },
    { key: 'จัดซื้อ', label: 'จัดซื้อ', test: (val) => /จัดซื้อ/i.test(val) },
    { key: 'ลูกค้า', label: 'ลูกค้า', test: (val) => /ลูกค้า/i.test(val) },
    { key: 'Sale', label: 'Sale', test: (val) => /Sale/i.test(val) },
    { key: 'จัดส่ง', label: 'จัดส่ง', test: (val) => /จัดส่ง/i.test(val) },
];

export const DEFAULT_VISIBLE_DEPT_GROUPS = ['Stock', 'จัดซื้อ'];
export const DEFAULT_DEPT_GROUPS = ['Stock'];

export function matchesDeptGroup(pendingUnit, groupKey) {
    if (!groupKey) return true;
    if (Array.isArray(groupKey)) {
        if (groupKey.length === 0) return true;
        return groupKey.some((key) => matchesDeptGroup(pendingUnit, key));
    }
    const g = DEPT_GROUPS.find(item => item.key === groupKey);
    if (!g) return false;
    return g.test(String(pendingUnit || ''));
}

export function getDeptGroups(pendingUnit) {
    const unitStr = String(pendingUnit || '');
    return DEPT_GROUPS.filter(g => g.test(unitStr)).map(g => g.key);
}

export function formatStockAnswerLabel(value) {
    const text = String(value ?? '').trim();
    if (text === 'ดำเนินการแล้ว') return 'Done';
    if (text === 'รอตรวจสอบ') return 'Pending';
    return text;
}

export const TABLE_COLUMNS = [
    { key: 'StatusGroup', label: 'StatusCall' },
    { key: 'DayRepair', label: 'ผ่านมา' },
    { key: 'DateTime', label: 'วันที่แจ้ง' },
    { key: 'Company', label: 'Cus' },
    { key: 'Brand', label: 'Store Name' },
    { key: 'Equipment', label: 'Equipment' },
    { key: 'Call Type', label: 'Call Type' },
    { key: 'Team', label: 'Team' },
    { key: 'TeamPlant', label: 'ศูนย์พื้นที่' },
    { key: 'ค้างหน่วยงาน', label: 'ค้างหน่วยงาน' },
    { key: 'Ticket Number', label: 'Ticket Number' },
    { key: 'Material', label: 'Material' },
    { key: 'Description', label: 'Description' },
    { key: 'Rebuilt', label: 'ทดแทน' },
    { key: 'จำนวน', label: 'จำนวน' },
    { key: 'PR', label: 'PR' },
    { key: 'PO', label: 'PO' },
    { key: 'Nawa', label: 'นวนคร' },
    { key: 'Vipa', label: 'วิภาวดี' },
    { key: 'Request', label: 'นอกรอบ' },
    { key: 'EngQty', label: 'ช่าง' },
    { key: 'QtyPlant', label: 'คลังพื้นที่' },
    { key: 'OtherPlant', label: 'พื้นที่อื่น' },
    { key: 'StockStartDate', label: 'แจ้งคลัง' },
    { key: 'StatusCall', label: 'สถานะอะไหล่' },
    { key: 'วันที่ตอบ', label: 'วันที่ตอบ' },
    { key: 'UserAns', label: 'ผู้แจ้ง' },
    { key: 'PendingStockDays', label: 'ค้างStock' },
    { key: 'คลังตอบ', label: 'คลังตอบ' },
    { key: 'Answer1', label: 'แจ้งผล' },
    { key: 'IDPlant', label: 'IDPlant' },
];

// Data computations
function computeRequestQuantities(data) {
    const result = {};
    const byPlant = {}; // key: "plantCode_material" -> qty
    if (!Array.isArray(data)) return { byMaterial: result, byPlant };

    // Threshold: Yesterday at 15:00:00
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - 1);
    threshold.setHours(15, 0, 0, 0);

    data.forEach(row => {
        // Parse Timestamp (e.g., "16/03/2569 17:49:42" or "3/17/2026 16:46:47")
        const tsStr = (row?.Timestamp || row?.timestamp || "").toString().trim();
        if (!tsStr) return;

        let rowDate = null;
        // Attempt to parse "D/M/Y H:M:S" or "M/D/Y H:M:S" format
        const match = tsStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (match) {
            let [_, p1, p2, originalY, h, min, s] = match.map(Number);
            let y = originalY;
            if (y > 2500) y -= 543; // Convert Thai year to AD
            
            let d, m;
            if (p1 > 12) {
                d = p1; m = p2; // D/M/Y
            } else if (p2 > 12) {
                m = p1; d = p2; // M/D/Y
            } else {
                // Ambiguous (e.g., 3/10/2026 vs 16/03/2569)
                if (originalY > 2500) {
                    d = p1; m = p2; // D/M/Y for Thai
                } else {
                    m = p1; d = p2; // M/D/Y for Gregorian (observed in sheet)
                }
            }
            rowDate = new Date(y, m - 1, d, h, min, s);
        } else {
            // Fallback to native parsing
            rowDate = new Date(tsStr);
        }

        if (!isValidDate(rowDate) || rowDate < threshold) return;

        const material = normalizeMaterial(row?.Material ?? row?.material ?? row?.MaterialCode ?? row?.Mat ?? row?.Item ?? "");
        let plant = (row?.plant ?? row?.Plant ?? "").toString().trim();
        if (plant.length === 3) plant = "0" + plant;

        let qtyRaw = row?.qty ?? row?.Qty ?? row?.QTY ?? row?.Quantity ?? row?.quantity ?? row?.["จำนวน"] ?? row?.["จำนวนที่ขอเบิก"] ?? 0;
        let qty = 0;
        if (typeof qtyRaw === 'number') {
            qty = qtyRaw;
        } else if (typeof qtyRaw === 'string') {
            qty = parseFloat(qtyRaw.replace(/,/g, ''));
        }
        if (material && !isNaN(qty) && qty > 0) {
            result[material] = (result[material] || 0) + qty;
            if (plant) {
                const plantKey = `${plant}_${material}`;
                byPlant[plantKey] = (byPlant[plantKey] || 0) + qty;
            }
        }
    });

    // Merge Optimistic Cache (byMaterial)
    try {
        const cachedStr = localStorage.getItem('app_cached_requestQuantities');
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            const now = Date.now();
            let changed = false;
            Object.keys(cached).forEach(mat => {
                const entry = cached[mat];
                const qty = typeof entry === 'object' && entry !== null ? entry.qty : entry;
                const ts = typeof entry === 'object' && entry !== null ? entry.timestamp : null;
                // Expire optimistic cache entries older than 15 minutes
                if (ts && (now - ts > 15 * 60 * 1000)) {
                    delete cached[mat];
                    changed = true;
                    return;
                }
                if (qty > 0) {
                    result[mat] = (result[mat] || 0) + qty;
                }
            });
            if (changed) {
                localStorage.setItem('app_cached_requestQuantities', JSON.stringify(cached));
            }
        }
    } catch (e) { console.warn("Cache parse err", e); }

    // Merge Optimistic Cache (byPlant)
    try {
        const plantCacheStr = localStorage.getItem('app_cached_requestByPlant');
        if (plantCacheStr) {
            const plantCached = JSON.parse(plantCacheStr);
            const now = Date.now();
            let changed = false;
            Object.keys(plantCached).forEach(key => {
                const entry = plantCached[key];
                const qty = typeof entry === 'object' && entry !== null ? entry.qty : entry;
                const ts = typeof entry === 'object' && entry !== null ? entry.timestamp : null;
                // Expire optimistic cache entries older than 15 minutes
                if (ts && (now - ts > 15 * 60 * 1000)) {
                    delete plantCached[key];
                    changed = true;
                    return;
                }
                if (qty > 0) {
                    byPlant[key] = (byPlant[key] || 0) + qty;
                }
            });
            if (changed) {
                localStorage.setItem('app_cached_requestByPlant', JSON.stringify(plantCached));
            }
        }
    } catch (e) { console.warn("Plant cache parse err", e); }

    return { byMaterial: result, byPlant };
}

function computePrQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        if (!material) return;
        const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
        const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
        const qty = req - ord;
        if (qty > 0) {
            result[material] = (result[material] || 0) + qty;
        }
    });
    return result;
}

function computePoQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        if (!material) return;
        const qtyRaw = row["Still to be delivered (qty)"];
        const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
        if (!isNaN(qty) && qty > 0) {
            result[material] = (result[material] || 0) + qty;
        }
    });
    return result;
}

function computeOverduePoMaterials(data) {
    const overdueSet = new Set();
    if (!Array.isArray(data)) return overdueSet;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.forEach(poRow => {
        const poMat = normalizeMaterial(poRow["Material"] || "");
        if (!poMat || overdueSet.has(poMat)) return;
        const qty = parseFloat((poRow["Still to be delivered (qty)"] + "").replace(/,/g, ''));
        if (isNaN(qty) || qty <= 0) return;

        const dateStr = poRow["Document Date"] || poRow["Date"] || poRow["Delivery Date"] || poRow["Deliv.Date"] || "-";
        const d = parseDateString(dateStr);
        if (d && d instanceof Date && !isNaN(d)) {
            d.setHours(0, 0, 0, 0);
            if (d < today) {
                overdueSet.add(poMat);
            }
        }
    });
    return overdueSet;
}

function computeStockQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        if (!material) return;
        const qtyRaw = row["Unrestricted"];
        const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
        if (!isNaN(qty)) {
            result[material] = qty;
        }
    });
    return result;
}

function computePlantStockQuantities(data) {
    const byPlant = {};
    const byMaterial = {};
    if (!Array.isArray(data)) return { byPlant, byMaterial };
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        const plant = (row["Plant"] || "").toString().trim();
        if (!material) return;
        const qtyRaw = row["Unrestricted"];
        const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
        if (!isNaN(qty)) {
            if (plant) {
                const key = `${plant}_${material}`;
                byPlant[key] = (byPlant[key] || 0) + qty;
            }
            byMaterial[material] = (byMaterial[material] || 0) + qty;
        }
    });
    return { byPlant, byMaterial };
}

function computeEngQuantities(engDataList) {
    const byPlant = {};
    if (!Array.isArray(engDataList)) return byPlant;
    
    engDataList.forEach(item => {
        const data = item.data;
        if (!Array.isArray(data)) return;
        
        data.forEach(row => {
            const material = normalizeMaterial(row["Material"] || "");
            if (!material) return;
            
            let rowPlant = (row["Plant"] || row["plant"] || "").toString().trim();
            if (rowPlant.length === 3) {
                rowPlant = "0" + rowPlant;
            }
            if (!rowPlant) return;

            const qtyRaw = row["จำนวน"] || row["Qty"] || 0;
            const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
            const team = (row["หน่วยงาน"] || row["Team"] || "").toString().trim();

            if (!isNaN(qty) && qty > 0) {
                const key = `${rowPlant}_${material}`;
                if (!byPlant[key]) {
                    byPlant[key] = { qty: 0, teams: new Set() };
                }
                byPlant[key].qty += qty;
                if (team) {
                    byPlant[key].teams.add(team);
                }
            }
        });
    });
    
    return byPlant;
}

// Logic to process raw data and merge with new limits/projects
export function calculateStockPendingInfo(row) {
    const pendingUnit = row["ค้างหน่วยงาน"] || "";
    if (!pendingUnit.toLowerCase().includes("stock")) {
        return { days: "0", date: "-" };
    }

    const timelineText = row["TimeLine"];
    if (!timelineText) return { days: "0", date: "-" };

    const events = timelineText.split(/\||\r?\n/);
    let startStockDateObj = null;
    let displayDateStr = "-";

    for (let i = events.length - 1; i >= 0; i--) {
        let eventTrim = events[i].trim();
        if (!eventTrim) continue;

        const statusMatch = eventTrim.match(/^(\d{2}\.\d{2})\s+.*แจ้งค้าง_/i);
        if (statusMatch) {
            if (eventTrim.toLowerCase().includes("แจ้งค้าง_stock")) {
                let dateStr = statusMatch[1];
                const [day, month] = dateStr.split('.').map(Number);
                if (day && month) {
                    const today = new Date();
                    let year = today.getFullYear();
                    let tempDate = new Date(year, month - 1, day);

                    if (tempDate.getTime() > today.getTime() + (180 * 24 * 60 * 60 * 1000)) {
                        year--;
                        tempDate = new Date(year, month - 1, day);
                    }
                    startStockDateObj = tempDate;
                    displayDateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                }
            } else {
                if (startStockDateObj) {
                    break;
                }
            }
        }
    }

    if (startStockDateObj) {
        const today = new Date();
        startStockDateObj.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = Math.max(0, today.getTime() - startStockDateObj.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return { days: diffDays.toString(), date: displayDateStr };
    }
    return { days: "0", date: "-" };
}

export function parseCallCreateDate(value) {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (value === null || value === undefined || value === '') return null;

    const dateText = String(value).trim();
    const dayFirstMatch = dateText.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dayFirstMatch) {
        const [, first, second, sourceYear, hours = '0', minutes = '0', seconds = '0'] = dayFirstMatch;
        const firstNumber = Number(first);
        const secondNumber = Number(second);
        let day = firstNumber;
        let month = secondNumber;
        if (firstNumber <= 12 && secondNumber > 12) {
            month = firstNumber;
            day = secondNumber;
        }

        let year = Number(sourceYear);
        if (year > 2500) year -= 543;
        const parsed = new Date(year, month - 1, day, Number(hours), Number(minutes), Number(seconds));
        return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
            ? parsed
            : null;
    }

    const parsed = new Date(dateText);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function parseReplyDate(value) {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (value === null || value === undefined || value === '') return null;

    const dateText = String(value).trim();
    const match = dateText.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (!match) {
        const parsed = new Date(dateText);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    const [, dayText, monthText, yearText, hours = '0', minutes = '0', seconds = '0'] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    let year = Number(yearText);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    if (year > 2500) year -= 543;

    const parsed = new Date(year, month - 1, day, Number(hours), Number(minutes), Number(seconds));
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
        ? parsed
        : null;
}

function sanitizeCallQuantity(val) {
    if (val === undefined || val === null) return "1";
    const str = String(val).replace(/,/g, '').trim();
    if (!str || str === "-") return "1";
    if (/^\d{2}\.\d{2}$/.test(str) || /^\d{8}$/.test(str)) return "1";
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0 || num > 500) return "1";
    return String(num);
}

function parseValidQuantity(val) {
    if (val === undefined || val === null) return "";
    const str = String(val).replace(/,/g, '').trim();
    if (!str || str === "-" || /^\d{2}\.\d{2}$/.test(str) || /^\d{8}$/.test(str)) return "";
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0 || num > 500) return "";
    return String(num);
}

function cleanTimelineTextForQuantity(text) {
    return String(text || "")
        .replace(/\b\d{2}\.\d{2}\s+\d{2}:\d{2}\b/g, ' ')
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, ' ')
        .replace(/\b\d+\s*[xX×*]\s*\d+\s*(?:mm|cm|m)?\.?/gi, ' ')
        .replace(/\b\d+\s*[MY]\b/gi, ' ')
        .replace(/(?:ใช้\s*Code\s*นี้มี|ในคลังมี|คงเหลือ|สต๊อก|สต็อก|มีของ|มีอยู่|มี)\s*[\d,]+\s*(?:ชิ้น|อัน|ตัว|เส้น|ชุด|pcs?|ea)?/gi, ' ');
}

function splitTimelineEventsNewestFirst(details) {
    const text = String(details || "").trim();
    if (!text) return [];

    const rawLines = text.split(/\||\r?\n/).map(s => s.trim()).filter(Boolean);
    const merged = [];
    for (const line of rawLines) {
        const subEvents = line
            .split(/(?=\b\d{2}\.\d{2}\s+\d{2}:\d{2}\b)/)
            .map(s => s.trim())
            .filter(Boolean);
        for (const sub of subEvents) {
            const hasLeadingDate = /^\d{2}\.\d{2}(?:\s|$)/.test(sub);
            if (!hasLeadingDate && merged.length > 0) {
                merged[merged.length - 1] += ' ' + sub;
            } else {
                merged.push(sub);
            }
        }
    }

    const today = new Date();
    const withMeta = merged.map((eventText, order) => {
        const m = eventText.match(/^(\d{2})\.(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
        let time = 0;
        if (m) {
            const day = Number(m[1]);
            const month = Number(m[2]);
            const hour = m[3] ? Number(m[3]) : 0;
            const minute = m[4] ? Number(m[4]) : 0;
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                let year = today.getFullYear();
                let d = new Date(year, month - 1, day, hour, minute);
                if (d.getTime() > today.getTime() + (180 * 24 * 60 * 60 * 1000)) {
                    year--;
                    d = new Date(year, month - 1, day, hour, minute);
                }
                time = d.getTime();
            }
        }
        return { eventText, time, order };
    });

    withMeta.sort((a, b) => {
        if (a.time !== b.time) return b.time - a.time;
        return b.order - a.order;
    });

    return withMeta.map(item => item.eventText);
}

function extractLatestPurchaseDescription(details) {
    const eventsNewestFirst = splitTimelineEventsNewestFirst(details);
    const latestEvent = eventsNewestFirst[0] || "";
    if (!latestEvent) return "";

    for (const match of latestEvent.matchAll(/ขอซื้อ[^\s•|]+/g)) {
        const phrase = match[0].trim();
        if (phrase && phrase !== 'ขอซื้อขอซ่อม') {
            return phrase;
        }
    }
    return "";
}

function extractQtyFromTimelineEvent(eventText) {
    if (!eventText || /ของเข้าแล้ว\s*แจ้งช่างเบิก/i.test(eventText)) return "";
    // Remove 8-digit material codes (e.g. 30060014) and PO/PR numbers before matching standalone quantities
    const cleaned = cleanTimelineTextForQuantity(eventText)
        .replace(/(?:PO|PR)\s*\d+/gi, ' ')
        .replace(/\b300\d{5}\b/g, ' ');

    const patterns = [
        /จำนวน\s*[:=]?\s*([\d,]+)/i,
        /เท่ากับ\s*([\d,]+)/i,
        /=\s*(\d{1,3})\s*(?:ชิ้น|ตัว|อัน|เส้น|ชุด|กล่อง|คู่|แผง|แผ่น|ม้วน|ลูก|ใบ|หลอด|ขวด|ถุง|เมตร|pcs?|ea|set|unit)?(?![\da-zA-Z\u0E00-\u0E7F])/i,
        /(?:^|[^\d.])(\d{1,3})\s*(?:ชิ้น|ตัว|อัน|เส้น|ชุด|กล่อง|คู่|แผง|แผ่น|ม้วน|ลูก|ใบ|หลอด|ขวด|ถุง|เมตร|pcs?|ea|set|unit)(?![a-zA-Z0-9\u0E00-\u0E7F])/i,
        /(?:^|\s|[)\]])[xX×*]\s*(\d{1,3})(?!\d|\s*(?:mm|cm|m)\b)/
    ];

    for (const rx of patterns) {
        const match = cleaned.match(rx);
        if (match) {
            const valid = parseValidQuantity(match[1]);
            if (valid) return valid;
        }
    }
    return "";
}

function extractTimelineQuantities(details) {
    const orderedNewestFirst = splitTimelineEventsNewestFirst(details);
    if (orderedNewestFirst.length === 0) return { latestQty: "", byMaterial: new Map() };

    let latestQty = "";
    const byMaterial = new Map();
    const replacementPairs = [];

    for (const eventText of orderedNewestFirst) {
        if (!latestQty) {
            const q = extractQtyFromTimelineEvent(eventText);
            if (q) latestQty = q;
        }

        if (/ของเข้าแล้ว\s*แจ้งช่างเบิก/i.test(eventText)) continue;
        const cleaned = cleanTimelineTextForQuantity(eventText);

        // Capture replacement code relationships like "30060016 ใช้โค้ด 30053801 ... แทน"
        const replaceMatches = cleaned.matchAll(
            /(?:^|\D)(300\d{5})\s*(?:ใช้\s*(?:โค้ด|โคด|รหัส|code)?|เปลี่ยน(?:เป็น)?|แทน(?:ด้วย)?)\s*(?:โค้ด|โคด|รหัส|code)?\s*[:=]?\s*(300\d{5})(?!\d)/gi
        );
        for (const match of replaceMatches) {
            replacementPairs.push([match[1], match[2]]);
        }

        const matQtyMatches = cleaned.matchAll(
            /(?:^|\D)(300\d{5})\)?[^\S\r\n]*(?:(?:จำนวน\s*[:=]?|=|เท่ากับ|[xX×*])[^\S\r\n]*|[^\S\r\n]+)(\d{1,3})(?![\dMYmy]|[^\S\r\n]*(?:mm|cm|m)\b)/gi
        );
        for (const match of matQtyMatches) {
            const matCode = match[1];
            const valid = parseValidQuantity(match[2]);
            if (valid && !byMaterial.has(matCode)) {
                byMaterial.set(matCode, valid);
            }
        }
    }

    // Propagate quantity from original material code to its replacement material code
    for (const [oldMat, newMat] of replacementPairs) {
        if (byMaterial.has(oldMat) && !byMaterial.has(newMat)) {
            byMaterial.set(newMat, byMaterial.get(oldMat));
        } else if (byMaterial.has(newMat) && !byMaterial.has(oldMat)) {
            byMaterial.set(oldMat, byMaterial.get(newMat));
        }
    }

    return { latestQty, byMaterial };
}

export function processRawData(
    mainData,
    requestData,
    poData,
    prData,
    mainSapData,
    vipaData,
    nawaData,
    plantStockData,
    newPartData,
    projectData,
    teamPlantData,
    engData
) {
    const nawaDescriptionByMaterial = new Map();
    const registerMaterialDescriptions = (rows) => {
        if (!Array.isArray(rows)) return;
        rows.forEach(row => {
            const material = normalizeMaterial(row?.Material);
            const description = row?.["Material description"] || row?.["Material description old"] || row?.Description || "";
            if (material && description && !nawaDescriptionByMaterial.has(material)) {
                nawaDescriptionByMaterial.set(material, description);
            }
        });
    };
    registerMaterialDescriptions(nawaData);
    registerMaterialDescriptions(vipaData);
    registerMaterialDescriptions(plantStockData);

    const normalizedMainData = Array.isArray(mainData)
        ? mainData.map(row => {
            if (!row) return row;
            const material = normalizeMaterial(row.Material);
            const createDate = row["Create Date"] || row.DateTime;
            const parsedCreateDate = parseCallCreateDate(createDate);
            const elapsedDays = parsedCreateDate
                ? Math.max(0, (Date.now() - parsedCreateDate.getTime()) / (1000 * 60 * 60 * 24))
                : row.DayRepair;
            const parsedReplyDate = parseReplyDate(row["วันที่ตอบ"]);
            const pendingStockDays = parsedReplyDate
                ? Math.max(0, Math.floor((Date.now() - parsedReplyDate.getTime()) / (1000 * 60 * 60 * 24)))
                : 0;
            const details = String(row["รายละเอียด"] || row.TimeLine || "");
            const latestPurchaseDescription = extractLatestPurchaseDescription(details);
            const timelineQuantities = extractTimelineQuantities(details);
            const detailQuantity = timelineQuantities.latestQty;
            const rawCallMaterialQuantity = [row["จำนวน"], row.Quantity].find(value =>
                value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "-"
            );
            const callMaterialQuantity = parseValidQuantity(rawCallMaterialQuantity);
            const isCallMaterialRow = Object.prototype.hasOwnProperty.call(row, "Create Date")
                || Object.prototype.hasOwnProperty.call(row, "Store Name");
            const description = nawaDescriptionByMaterial.get(material);

            return {
                ...row,
                Material: latestPurchaseDescription ? "" : row.Material,
                DateTime: createDate,
                DayRepair: elapsedDays,
                Brand: row["Store Name"] || row.Brand,
                "Call Type": row["Call"] || row["Call Type"],
                "คลังตอบ": row["คลังตอบ"] || "",
                UserAns: row["ผู้ตอบ"] || row.UserAns,
                TimeLine: details,
                "จำนวน": sanitizeCallQuantity(callMaterialQuantity || detailQuantity || "1"),
                _callMaterialQuantity: callMaterialQuantity,
                _quantitiesByMaterial: timelineQuantities.byMaterial,
                _latestPurchaseDescription: latestPurchaseDescription,
                PendingStockDays: pendingStockDays,
                Description: latestPurchaseDescription || description || (isCallMaterialRow ? "" : row.Description || row.Discription || row.Desc || "")
            };
        }).flatMap(row => {
            if (!row) return [];
            if (row._latestPurchaseDescription) {
                return [{
                    ...row,
                    Material: "",
                    Description: row._latestPurchaseDescription
                }];
            }
            const currentMaterial = normalizeMaterial(row.Material);
            const details = String(row["รายละเอียด"] || row.TimeLine || "");
            const labeledCodes = [...details.matchAll(/Material\s*Code\s*[:：]?\s*['\u200B\uFEFF\u00A0\s]*(\d(?:[^\S\r\n-]*\d){0,19})/gi)]
                .map(match => match[1].replace(/[^\d]+/g, ''));
            const labeledMaterials = [];
            for (const code of labeledCodes) {
                if (code.length === 16) {
                    // CallMaterial may concatenate two 8-digit material codes after this label.
                    labeledMaterials.push(code.slice(0, 8), code.slice(8));
                } else if (code.length === 8) {
                    labeledMaterials.push(code);
                } else if (code.length >= 1 && code.length <= 7) {
                    // Pad short numeric Material Code values to 8 digits starting with 3
                    // e.g. 57019 -> 30057019, 2524 -> 30002524, 327 -> 30000327
                    labeledMaterials.push('3' + code.padStart(7, '0'));
                }
            }
            const quantitiesByMaterial = row._quantitiesByMaterial instanceof Map ? row._quantitiesByMaterial : new Map();
            let materials = [];

            if (currentMaterial && currentMaterial !== "-") {
                const paddedCurrent = /^\d{1,7}$/.test(currentMaterial) ? ('3' + currentMaterial.padStart(7, '0')) : '';
                if (!paddedCurrent || !labeledMaterials.includes(paddedCurrent)) {
                    materials.push(currentMaterial);
                }
            }

            materials.push(...labeledMaterials);
            // Also include other 300xxxxx codes listed in details, even when the row
            // already has a Material. Repeated history entries collapse below.
            const detailMaterials = [...details.matchAll(/(?:^|\D)(300\d{5})(?!\d)/g)].map(match => match[1]);
            materials.push(...detailMaterials);

            const uniqueMaterials = [...new Set(materials)];
            if (!uniqueMaterials.length) return [row];
            return uniqueMaterials.map(Material => ({
                ...row,
                Material,
                Description: labeledMaterials.length || detailMaterials.length ? "" : row.Description,
                "จำนวน": sanitizeCallQuantity(
                    row._callMaterialQuantity !== ""
                        ? row._callMaterialQuantity
                        : quantitiesByMaterial.get(Material) ?? row["จำนวน"] ?? "1"
                )
            }));
        })
        : mainData;

    // 1. Precalculate dictionaries
    const { byMaterial: reqQ, byPlant: reqByPlant } = computeRequestQuantities(requestData);
    const prQ = computePrQuantities(prData);
    const poQ = computePoQuantities(poData);
    const overduePoMaterials = computeOverduePoMaterials(poData);
    const vipaStock = computeStockQuantities(vipaData);
    const nawaStock = computeStockQuantities(nawaData);
    const { byPlant: plantStock, byMaterial: otherPlantStock } = computePlantStockQuantities(plantStockData);
    const engByPlant = computeEngQuantities(engData);

    const mainSapMap = new Map();
    if (Array.isArray(mainSapData)) {
        mainSapData.forEach(r => {
            const mat = normalizeMaterial(r["Material"]);
            if (mat) mainSapMap.set(mat, r);
        });
    }

    const nawaLeadtimeMap = new Map();
    if (Array.isArray(nawaData)) {
        nawaData.forEach(r => {
            const mat = normalizeMaterial(r["Material"]);
            if (mat) {
                const leadtimeVal = parseInt(r["Planned Deliv. Time"] || "0", 10);
                nawaLeadtimeMap.set(mat, isNaN(leadtimeVal) ? 0 : leadtimeVal);
            }
        });
    }

    const newPartMap = new Map();
    if (Array.isArray(newPartData)) {
        newPartData.forEach(p => {
            const tNum = String(p["Ticket Number"] || "").replace(/^'/, '').trim();
            const mat = String(p["Material"] || "").replace(/^'/, '').trim();
            const key = `${tNum}_${mat}`;
            const existing = newPartMap.get(key);
            if (!existing || new Date(p.Timestamp) > new Date(existing.Timestamp)) {
                newPartMap.set(key, {
                    Status: (p["Status"] || p.StatusCall || "").toString().trim(),
                    Timestamp: p.Timestamp
                });
            }
        });
    }

    const teamDetailsMap = new Map();
    if (Array.isArray(teamPlantData)) {
        teamPlantData.forEach(t => {
            const teamName = String(t.Team || "").trim();
            if (teamName) {
                teamDetailsMap.set(teamName, {
                    gm: t.GM || "-",
                    division: t["ฝ่าย"] || "-",
                    department: t["แผนก"] || "-"
                });
            }
        });
    }

    const projectMap = new Map();
    if (Array.isArray(projectData)) {
        projectData.forEach(p => {
            const tNum = String(p["Ticket Number"] || "").replace(/^'/, '').trim();
            if (!projectMap.has(tNum) || new Date(p.Timestamp) > new Date(projectMap.get(tNum).Timestamp)) {
                projectMap.set(tNum, {
                    project: (p["Project"] || "").toString().trim(),
                    statusCall: (p["StatusCall"] || "").toString().trim()
                });
            }
        });
    }

    // 1b. Deduplicate mainData: within each Ticket Number group, if Material is duplicated, keep only one row
    const seenTicketMaterials = new Map();
    const dedupedMainData = [];
    if (Array.isArray(normalizedMainData)) {
        for (const row of normalizedMainData) {
            if (!row) continue;
            const ticket = String(row["Ticket Number"] || "").replace(/^'/, '').trim();
            const mat = normalizeMaterial(row["Material"]);

            if (ticket && mat && mat !== "-") {
                const key = `${ticket}_${mat}`;
                if (seenTicketMaterials.has(key)) {
                    const existing = seenTicketMaterials.get(key);
                    // Merge any non-empty fields from the duplicate into existing
                    Object.keys(row).forEach(k => {
                        if ((existing[k] === undefined || existing[k] === null || existing[k] === "" || existing[k] === "-") &&
                            (row[k] !== undefined && row[k] !== null && row[k] !== "" && row[k] !== "-")) {
                            existing[k] = row[k];
                        }
                    });
                    continue; // Skip duplicate row
                }
                seenTicketMaterials.set(key, row);
            } else if (ticket && (!mat || mat === "-")) {
                const desc = (row["Description"] || row["Discription"] || "").toString().trim().toLowerCase();
                if (desc) {
                    const key = `${ticket}_EMPTY_${desc}`;
                    if (seenTicketMaterials.has(key)) {
                        const existing = seenTicketMaterials.get(key);
                        Object.keys(row).forEach(k => {
                            if ((existing[k] === undefined || existing[k] === null || existing[k] === "" || existing[k] === "-") &&
                                (row[k] !== undefined && row[k] !== null && row[k] !== "" && row[k] !== "-")) {
                                existing[k] = row[k];
                            }
                        });
                        continue;
                    }
                    seenTicketMaterials.set(key, row);
                }
            }
            dedupedMainData.push(row);
        }
    }

    // 2. Iterate, mutate, attach values
    const enrichedData = dedupedMainData.map(row => {
        let r = { ...row, id: row['Ticket Number'] + '_' + row['Material'] };
        delete r._callMaterialQuantity;
        delete r._quantitiesByMaterial;
        delete r._latestPurchaseDescription;
        const mat = normalizeMaterial(r["Material"]);
        if (!r["Description"] && mat) {
            const sapMaterial = mainSapMap.get(mat);
            r["Description"] = nawaDescriptionByMaterial.get(mat)
                || sapMaterial?.["Material description"]
                || sapMaterial?.["Material description old"]
                || sapMaterial?.Description
                || "";
        }
        // Stock attachments
        r["Vipa"] = vipaStock[mat] !== undefined ? vipaStock[mat] : "";
        if (r["Vipa"] === 0 || r["Vipa"] === "0") r["Vipa"] = "";

        // Nawa (นวนคร): Stock quantity from SAP
        r["Nawa"] = nawaStock[mat] !== undefined ? nawaStock[mat] : "";
        if (r["Nawa"] === 0 || r["Nawa"] === "0") r["Nawa"] = "";

        const reqQty = reqQ[mat];

        r["PO"] = poQ[mat] !== undefined ? poQ[mat] : "-";
        r["PR"] = prQ[mat] !== undefined ? prQ[mat] : "";

        // Request (นอกรอบ): Only show when IDPlant matches the plant from request data
        const rowIdPlant = PLANT_MAPPING[(r["ค้างหน่วยงาน"] || "").toString().trim()] || "";
        if (rowIdPlant && mat) {
            const plantReqKey = `${rowIdPlant}_${mat}`;
            const plantReqQty = reqByPlant[plantReqKey];
            r["Request"] = (plantReqQty !== undefined && plantReqQty > 0) ? plantReqQty : "";
        } else {
            r["Request"] = reqQty !== undefined ? reqQty : "";
        }

        // Plant Stock attachment
        let teamPlant = r["ศูนย์พื้นที่"] || r["TeamPlant"];
        let plantCode = null;
        if (teamPlant) {
            const tp = teamPlant.toString().trim();
            plantCode = PLANT_MAPPING[tp] || PLANT_MAPPING[`Stock ${tp}`] || PLANT_MAPPING[tp.replace(/^Stock\s+/i, '')];
        }

        // Store IDPlant for display (lookup from ค้างหน่วยงาน which has "Stock xxx" values matching PLANT_MAPPING)
        const pendingUnit = (r["ค้างหน่วยงาน"] || "").toString().trim();
        r["IDPlant"] = PLANT_MAPPING[pendingUnit] || "";

        if (plantCode) {
            let qty;
            if (plantCode === "0326") {
                qty = vipaStock[mat];
            } else if (plantCode === "0301") {
                qty = nawaStock[mat];
            } else {
                const pKey = `${plantCode}_${mat}`;
                qty = plantStock[pKey];
            }
            r["QtyPlant"] = qty !== undefined && qty > 0 ? qty : "";

            const eKey = `${plantCode}_${mat}`;
            const engInfo = engByPlant[eKey];
            if (engInfo && engInfo.qty > 0) {
                r["EngQty"] = engInfo.qty;
                const rowTeam = (r["Team"] || "").toString().trim();
                r["hasMatchingEngTeam"] = rowTeam && engInfo.teams.has(rowTeam);
            } else {
                r["EngQty"] = "";
                r["hasMatchingEngTeam"] = false;
            }
        } else {
            r["QtyPlant"] = "";
            r["EngQty"] = "";
        }

        // OtherPlant
        const otherQty = otherPlantStock[mat];
        r["OtherPlant"] = otherQty !== undefined && otherQty > 0 ? otherQty : "";

        // Rebuilt
        r["Rebuilt"] = "";
        r["RebuiltDescription"] = "";
        let rebuiltPlantQty = 0;
        if (mainSapMap.has(mat)) {
            let val = mainSapMap.get(mat)["Rebuilt"];
            if (val !== undefined && val !== null) {
                val = String(val).trim();
                if (val !== "" && val !== "-" && val !== "0") {
                    r["Rebuilt"] = val;
                    const rebMat = normalizeMaterial(val);
                    if (mainSapMap.has(rebMat)) {
                        const rebRow = mainSapMap.get(rebMat);
                        r["RebuiltDescription"] = rebRow["Material description"] || rebRow["Material description old"] || rebRow["Description"] || "";
                    }
                    const rebuiltTargetPlant = r["IDPlant"] || plantCode;
                    if (rebMat && rebuiltTargetPlant) {
                        if (rebuiltTargetPlant === "0326") {
                            rebuiltPlantQty = parseFloat(vipaStock[rebMat] || 0) || 0;
                        } else if (rebuiltTargetPlant === "0301") {
                            rebuiltPlantQty = parseFloat(nawaStock[rebMat] || 0) || 0;
                        } else {
                            rebuiltPlantQty = parseFloat(plantStock[`${rebuiltTargetPlant}_${rebMat}`] || 0) || 0;
                        }
                    }
                }
            }
        }

        // Default StatusX derivation is now handled together with StatusCall in the group loop
        // to maintain exact parity with call.js calculateTicketStatus where the ticket group dictates
        // the baseline status, but StatusX can be overridden individually.
        // We will assign a temporary fallback here, and resolve it properly below.
        r.TempStatusX = "รอของเข้า";
        const hasNoMaterial = !mat || mat === "-" || mat === "";
        if (hasNoMaterial) {
            r.TempStatusX = "ขอซื้อขอซ่อม";
        } else {
            const hasQtyPlant = r["QtyPlant"] && r["QtyPlant"] !== "" && r["QtyPlant"] !== "0";
            const hasNawa = r["Nawa"] && r["Nawa"] !== "" && r["Nawa"] !== "0";
            const hasVipa = r["Vipa"] && r["Vipa"] !== "" && r["Vipa"] !== "0";
            const op = r["OtherPlant"];
            const hasOtherPlant = op !== undefined && op !== null && op !== "" && op !== "-" && op !== 0 && op !== "0";

            if (rebuiltPlantQty > 0) {
                r.TempStatusX = "เบิกทดแทน";
            } else if (hasQtyPlant) {
                r.TempStatusX = "ระหว่างขนส่ง";
            } else if (hasNawa) {
                r.TempStatusX = "เบิกนวนคร";
            } else if (overduePoMaterials.has(mat)) {
                r.TempStatusX = "เกินLeadtime";
            } else if (r["hasMatchingEngTeam"]) {
                r.TempStatusX = "มีอะไหล่ในทีม";
            } else if (hasVipa) {
                r.TempStatusX = "เบิกวิภาวดี";
            } else if (hasOtherPlant) {
                r.TempStatusX = "ดึงจากคลังอื่น";
            }
        }
        r.StatusX = r.TempStatusX;

        // Pending Stock Days
        const stockPendingInfo = calculateStockPendingInfo(r);
        const isCallMaterialRow = Object.prototype.hasOwnProperty.call(r, "Create Date")
            || Object.prototype.hasOwnProperty.call(r, "Store Name");
        const replyDate = parseReplyDate(r["วันที่ตอบ"]);
        r["PendingStockDays"] = isCallMaterialRow && replyDate
            ? Math.max(0, Math.floor((Date.now() - replyDate.getTime()) / (1000 * 60 * 60 * 24)))
            : isCallMaterialRow ? 0 : stockPendingInfo.days;
        r["StockStartDate"] = isCallMaterialRow ? "" : stockPendingInfo.date;

        // Clean values
        r['TeamPlant'] = r['TeamPlant'] || 'ไม่ระบุ';
        r['ค้างหน่วยงาน'] = r['ค้างหน่วยงาน'] || 'ไม่ระบุ';
        r['คลังตอบ'] = r['คลังตอบ'] || 'ไม่ระบุ';

        // Map Team Details
        const teamName = String(r.Team || "").trim();
        const details = teamDetailsMap.get(teamName);
        r.GM = details ? details.gm : "-";
        r.Division = details ? details.division : "-";
        r.Department = details ? details.department : "-";

        return r;
    });

    // 3. Group by Ticket and resolve StatusCall
    const ticketGroups = {};
    enrichedData.forEach(r => {
        const ticket = r["Ticket Number"];
        if (!ticket) return;
        if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
        ticketGroups[ticket].push(r);
    });

    Object.keys(ticketGroups).forEach(ticket => {
        const rows = ticketGroups[ticket];
        let statusCall = "รอของเข้า";

        const HIGH_PRIORITY_STATUSES = ["เบิกนวนคร", "เบิกวิภาวดี", "ระหว่างขนส่ง", "เบิกทดแทน", "มีอะไหล่ในทีม"];

        // Apply custom status overrides per row (Ticket + Material) before evaluating ticket group StatusCall
        rows.forEach(r => {
            const mat = normalizeMaterial(r["Material"]);
            const compositeKey = `${ticket}_${mat}`;
            const customStatus = newPartMap.get(compositeKey)?.Status;
            if (customStatus && (customStatus === "แจ้งCodeผิด" || !HIGH_PRIORITY_STATUSES.includes(r.StatusX))) {
                r.StatusX = customStatus;
                r._isManualStatusX = true;
            }
        });

        // Define priorities and calculate StatusCall
        const rowStatuses = rows.map(r => r.StatusX || "");
        const validStatuses = rowStatuses.filter(s => s !== "แจ้งCodeผิด");
        const statusesToEval = validStatuses.length > 0 ? validStatuses : rowStatuses;

        const hasHighPriority = rows.some(r => HIGH_PRIORITY_STATUSES.includes(r.StatusX));

        if (statusesToEval.includes("เบิกทดแทน")) {
            statusCall = "เบิกทดแทน";
        } else if (projectMap.has(ticket) && !hasHighPriority) {
            const proj = projectMap.get(ticket);
            if (proj.statusCall) {
                statusCall = proj.statusCall === "Project" ? "SPACIAL" : proj.statusCall;
                rows.forEach(r => r._isManualStatusCall = true);
            }
            if (proj.project) {
                rows.forEach(r => {
                    r['Answer1'] = proj.project;
                    r._isManualProject = true;
                });
            }
        } else if (statusesToEval.includes("เปิดรหัสใหม่")) {
            statusCall = "เปิดรหัสใหม่";
        } else if (statusesToEval.includes("ขอซื้อขอซ่อม")) {
            statusCall = "ขอซื้อขอซ่อม";
        } else if (statusesToEval.includes("เกินLeadtime")) {
            statusCall = "เกินLeadtime";
        } else if (statusesToEval.includes("มีอะไหล่ในทีม")) {
            statusCall = "มีอะไหล่ในทีม";
        } else if (validStatuses.length > 0 && validStatuses.every(s => s === "ดึงจากคลังอื่น")) {
            statusCall = "ดึงจากคลังอื่น";
        } else if (statusesToEval.includes("รอของเข้า") || statusesToEval.includes("ดึงจากคลังอื่น")) {
            statusCall = "รอของเข้า";
        } else if (statusesToEval.some(s => s === "เบิกนวนคร" || s === "เบิกวิภาวดี")) {
            statusCall = "เบิกศูนย์อะไหล่";
        } else if (statusesToEval.includes("ระหว่างขนส่ง")) {
            statusCall = "ระหว่างขนส่ง";
        } else if (rowStatuses.includes("แจ้งCodeผิด")) {
            statusCall = "แจ้งCodeผิด";
        }

        rows.forEach(r => {
            r.StatusCall = statusCall; // Apply group status
        });
    });

    // 4. Group mapping status
    enrichedData.forEach(r => {
        let groupStatus = "รอของเข้า";
        const groupKey = r.StatusCall;

        switch (groupKey) {
            case "เกินLeadtime": groupStatus = "เกินLeadtime"; break;
            case "ขอดึงคลังอื่น":
            case "ดึงจากคลังอื่น": groupStatus = "ดึงจากคลังอื่น"; break;
            case "ระหว่างขนส่ง": groupStatus = "ระหว่างขนส่ง (ส่งสำเร็จ)"; break;
            case "เบิกศูนย์อะไหล่": groupStatus = "เบิกศูนย์อะไหล่"; break;
            case "มีอะไหล่ในทีม": groupStatus = "มีอะไหล่ในทีม"; break;
            case "เบิกทดแทน": groupStatus = "เบิกทดแทน"; break;
            case "SPACIAL":
            case "รอทดแทน": groupStatus = "SPACIAL"; break;
            case "ขอซื้อขอซ่อม": groupStatus = "ขอซื้อขอซ่อม"; break;
            case "แจ้งCodeผิด": groupStatus = "แจ้งCodeผิด"; break;
            case "เปิดรหัสใหม่": groupStatus = "เปิดรหัสใหม่"; break;
            default: groupStatus = "รอของเข้า";
        }
        r.StatusGroup = groupStatus;
    });

    // 5. Override StatusX for mismatch: ค้างหน่วยงาน = "Stock วิภาวดี 62" but ศูนย์พื้นที่ ≠ "วิภาวดี 62"
    enrichedData.forEach(r => {
        if (r.StatusX === "แจ้งCodeผิด" || r.StatusX === "เบิกทดแทน" || r.StatusCall === "เบิกทดแทน") return;
        const pending = (r["ค้างหน่วยงาน"] || "").trim();
        const tp = (r["TeamPlant"] || r["ศูนย์พื้นที่"] || "").replace(/Stock\s*/gi, '').trim();
        const mat = (r["Material"] || "").toString().trim();
        const desc = (r["Description"] || "").toString().trim();
        if (
            pending === "Stock วิภาวดี 62"
            && tp !== "วิภาวดี 62"
            && mat !== "" && mat !== "-"
            && desc !== "" && desc !== "-"
        ) {
            r.StatusX = "ขอซื้อขอซ่อม";
            r.StatusCall = "ขอซื้อขอซ่อม";
            r.StatusGroup = "ขอซื้อขอซ่อม";
        }
    });

    // 6. Clear Material if Description is still empty after all calculations
    enrichedData.forEach(r => {
        const mat = (r["Material"] || "").toString().trim();
        const desc = (r["Description"] || "").toString().trim();
        if (mat !== "" && (desc === "" || desc === "-")) {
            r._rawMaterial = r._rawMaterial ?? r["Material"];
            r._emptyDescMaterialCleared = true;
            r["Material"] = "";
        }
    });

    return enrichedData;
}

export function calculateSummary(processedData) {
    const ticketGroups = {};
    processedData.forEach(row => {
        const ticket = row["Ticket Number"];
        if (!ticket) return;
        if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
        ticketGroups[ticket].push(row);
    });

    let stats = {
        total: Object.keys(ticketGroups).length,
        exceedLeadtime: 0,
        pending: 0,
        otherPlant: 0,
        success: 0,
        nawaVipa: 0,
        engInTeam: 0,
        rebuiltStock: 0,
        spacial: 0,
        request: 0,
        newPart: 0,
        over7: 0,
        waitingResponse: 0,
        maxPendingUnit: "-",
        maxPendingCount: 0,
        gmStats: [],
        callTypeStats: [],
        deptGroupStats: []
    };

    const pendingUnitTicketCounts = {};
    const gmTicketCounts = {};
    const callTypeTicketCounts = {};
    const deptGroupTicketCounts = {
        'Stock': new Set(),
        'วิศวกรรม': new Set(),
        'Repair': new Set(),
        'จัดซื้อ': new Set(),
        'ลูกค้า': new Set(),
        'Sale': new Set(),
        'จัดส่ง': new Set()
    };
    const deptGroupWaitingTicketCounts = Object.fromEntries(
        DEPT_GROUPS.map(group => [group.key, new Set()])
    );

    Object.keys(ticketGroups).forEach(ticket => {
        const rows = ticketGroups[ticket];
        const groupStatus = rows[0].StatusGroup || "รอของเข้า";

        if (groupStatus === 'เกินLeadtime') stats.exceedLeadtime++;
        if (groupStatus === 'รอของเข้า') stats.pending++;
        if (groupStatus === 'ดึงจากคลังอื่น') stats.otherPlant++;
        if (groupStatus === 'ระหว่างขนส่ง (ส่งสำเร็จ)') stats.success++;
        if (groupStatus === 'เบิกศูนย์อะไหล่') stats.nawaVipa++;
        if (groupStatus === 'มีอะไหล่ในทีม' || rows.some(r => (r.StatusX || r.StatusCall) === 'มีอะไหล่ในทีม')) stats.engInTeam++;
        if (groupStatus === 'เบิกทดแทน' || rows.some(r => (r.StatusX || r.StatusCall) === 'เบิกทดแทน')) stats.rebuiltStock++;
        if (groupStatus === 'SPACIAL') stats.spacial++;
        if (groupStatus === 'ขอซื้อขอซ่อม') stats.request++;
        if (groupStatus === 'เปิดรหัสใหม่') stats.newPart++;

        if (rows.some(r => r['คลังตอบ'] === 'รอตรวจสอบ')) {
            stats.waitingResponse++;
        }

        if (rows.some(r => (parseFloat(r['DayRepair']) || 0) > 7)) {
            stats.over7++;
        }

        // Track dept groups matched by this ticket
        const ticketDeptGroups = new Set();

        // Aggregate ALL tickets for each unit to find the top unit
        rows.forEach(r => {
            const pendingUnit = r["ค้างหน่วยงาน"] || "ไม่ระบุ";
            if (pendingUnit !== "ไม่ระบุ") {
                if (!pendingUnitTicketCounts[pendingUnit]) pendingUnitTicketCounts[pendingUnit] = new Set();
                pendingUnitTicketCounts[pendingUnit].add(ticket);
            }

            // Check department groups
            DEPT_GROUPS.forEach(g => {
                if (g.test(pendingUnit)) {
                    ticketDeptGroups.add(g.key);
                    if (r['คลังตอบ'] === 'รอตรวจสอบ') {
                        deptGroupWaitingTicketCounts[g.key].add(ticket);
                    }
                }
            });

            const gm = r.GM || "-";
            if (!gmTicketCounts[gm]) gmTicketCounts[gm] = new Set();
            gmTicketCounts[gm].add(ticket);

            const callType = r["Call Type"] || "ไม่ระบุ";
            if (!callTypeTicketCounts[callType]) callTypeTicketCounts[callType] = new Set();
            callTypeTicketCounts[callType].add(ticket);
        });

        // Add ticket to matching dept groups
        ticketDeptGroups.forEach(grp => {
            deptGroupTicketCounts[grp].add(ticket);
        });
    });

    const pendingUnitCounts = {};
    for (const [unit, set] of Object.entries(pendingUnitTicketCounts)) {
        pendingUnitCounts[unit] = set.size;
    }

    let maxCount = 0;
    let maxUnit = "-";
    for (const [unit, count] of Object.entries(pendingUnitCounts)) {
        if (count > maxCount) {
            maxCount = count;
            maxUnit = unit;
        }
    }
    stats.maxPendingUnit = maxUnit;
    stats.maxPendingCount = maxCount;

    // Convert sets to stats arrays
    const totalTickets = stats.total;
    const formatStats = (countsMap) => {
        const stats = Object.entries(countsMap).map(([label, set]) => ({
            label,
            value: set.size,
            percent: totalTickets > 0 ? (set.size / totalTickets * 100).toFixed(0) : 0
        }));

        // Grouping logic: "Name" and "Name_SA" should stay together
        const groupMaxMap = {};
        stats.forEach(item => {
            const base = item.label.replace(/(_SA|\s_SA)$/i, '').trim();
            groupMaxMap[base] = Math.max(groupMaxMap[base] || 0, item.value);
        });

        return stats.sort((a, b) => {
            const baseA = a.label.replace(/(_SA|\s_SA)$/i, '').trim();
            const baseB = b.label.replace(/(_SA|\s_SA)$/i, '').trim();

            // 1. Sort by the maximum value found in the group (DESC)
            if (groupMaxMap[baseB] !== groupMaxMap[baseA]) {
                return groupMaxMap[baseB] - groupMaxMap[baseA];
            }

            // 2. Tie-break: Sort by base name alphabetically (ASC)
            if (baseA !== baseB) {
                return baseA.localeCompare(baseB, 'th');
            }

            // 3. Within same base group: Prioritize label WITHOUT _SA first
            const isSaA = /(_SA|\s_SA)$/i.test(a.label);
            const isSaB = /(_SA|\s_SA)$/i.test(b.label);
            if (isSaA !== isSaB) {
                return isSaA ? 1 : -1; // Normal first, SA second
            }

            // 4. Then sort by value (DESC)
            if (b.value !== a.value) {
                return b.value - a.value;
            }

            // 5. Finally alphabetical label
            return a.label.localeCompare(b.label, 'th');
        });
    };

    stats.gmStats = formatStats(gmTicketCounts);
    stats.callTypeStats = formatStats(callTypeTicketCounts);
    stats.deptGroupStats = DEPT_GROUPS.map(g => {
        const count = deptGroupTicketCounts[g.key]?.size || 0;
        return {
            label: g.label,
            value: count,
            percent: totalTickets > 0 ? (count / totalTickets * 100).toFixed(0) : 0,
            waitingResponse: deptGroupWaitingTicketCounts[g.key]?.size || 0
        };
    });

    const calcPercent = (val) => stats.total > 0 ? Math.round((val / stats.total) * 100) + '%' : '0%';

    stats.exceedLeadtimePercent = calcPercent(stats.exceedLeadtime);
    stats.pendingPercent = calcPercent(stats.pending);
    stats.otherPlantPercent = calcPercent(stats.otherPlant);
    stats.successPercent = calcPercent(stats.success);
    stats.nawaVipaPercent = calcPercent(stats.nawaVipa);
    stats.engInTeamPercent = calcPercent(stats.engInTeam);
    stats.rebuiltStockPercent = calcPercent(stats.rebuiltStock);
    stats.spacialPercent = calcPercent(stats.spacial);
    stats.requestPercent = calcPercent(stats.request);
    stats.newPartPercent = calcPercent(stats.newPart);
    stats.over7Percent = calcPercent(stats.over7);
    stats.waitingResponsePercent = calcPercent(stats.waitingResponse);

    return stats;
}

export function extractFilters(data) {
    const filters = {
        teamPlant: {},
        pendingUnit: {},
        stockAnswer: {},
        statusCall: {}
    };

    data.forEach(row => {
        const tp = row['TeamPlant'] || 'ไม่ระบุ';
        const pu = row['ค้างหน่วยงาน'] || 'ไม่ระบุ';
        const sa = row['คลังตอบ'] || 'ไม่ระบุ';
        const sc = row['StatusCall'] || 'ไม่ระบุ';

        filters.teamPlant[tp] = (filters.teamPlant[tp] || 0) + 1;
        filters.pendingUnit[pu] = (filters.pendingUnit[pu] || 0) + 1;
        filters.stockAnswer[sa] = (filters.stockAnswer[sa] || 0) + 1;
        filters.statusCall[sc] = (filters.statusCall[sc] || 0) + 1;
    });

    return filters;
}

export function getCleanTeamPlant(tp) {
    return (tp || "").replace(/Stock\s*/gi, '').trim();
}

export function getTeamPlantCardKey(tp) {
    const clean = getCleanTeamPlant(tp);
    if (!clean) return '';
    if (/^SA(\s|$)/i.test(clean)) return 'กทม';
    return clean;
}

export function getDesc(row) {
    return row["Description"] || row["Discription"] || row["Desc"] || "";
}


export function exportToCSV(data, filename = 'Call_Export.csv') {
    if (!data || data.length === 0) return;

    // Use standardized columns for the export
    const headers = TABLE_COLUMNS.map(col => col.label);
    const keys = TABLE_COLUMNS.map(col => col.key);

    const csvRows = [];
    // Helper to escape values and wrap in quotes
    const escapeCsv = (val) => {
        const str = (val === undefined || val === null ? '' : '' + val).trim();
        return `"${str.replace(/"/g, '""')}"`;
    };

    csvRows.push(headers.map(escapeCsv).join(','));

    data.forEach(row => {
        const values = keys.map(key => escapeCsv(row[key]));
        csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\r\n'); // Use Windows newline for Excel compatibility
    // Add UTF-8 BOM for Thai character support in Excel
    const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
