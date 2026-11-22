import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAllData, fetchQuickData, sendOutsideRequest } from '../services/api';
import { processRawData, calculateSummary, getCleanTeamPlant, normalizeMaterial, matchesDeptGroup, parseCallCreateDate, PLANT_MAPPING } from '../utils/helpers';
import { loadFromCache, saveAllToCache, saveToCache } from '../services/cacheService';

export function useAppData() {
    const [processedData, setProcessedData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Single-value filters (matching original call.js behavior)
    const [rawSources, setRawSources] = useState({ nawaRawData: [], poRawData: [], prRawData: [], engData: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [dashboardFilter, setDashboardFilter] = useState(null); // null = show all
    const [teamPlantFilter, setTeamPlantFilter] = useState('');
    const [pendingUnitFilter, setPendingUnitFilter] = useState('');
    const [stockAnswerFilter, setStockAnswerFilter] = useState('');
    const [statusCallFilter, setStatusCallFilter] = useState('');
    const [gmFilter, setGmFilter] = useState(null); // New state for hierarchical filtering
    const [deptGroupFilter, setDeptGroupFilter] = useState(() => {
        const saved = localStorage.getItem('showAllCards');
        if (saved !== null) return saved === 'true' ? null : 'Stock';
        const legacy = localStorage.getItem('hideDeptCards') ?? localStorage.getItem('hideNonStockDept');
        return (legacy !== null ? legacy === 'true' : true) ? 'Stock' : null;
    });

    const hasCacheLoaded = useRef(false);
    const inFlightFetch = useRef(null);
    const fetchGeneration = useRef(0);
    const fullDataRef = useRef(null);
    const latestUpdateDateRef = useRef(null);
    const latestMainDataRef = useRef(null);

    // Process fetched data (shared between cache load and server load)
    const applyData = useCallback((fetchResult, saveCache = false, isPartial = false) => {
        let candidateMainData = fetchResult?.mainData;
        let candidateDateUpdate = fetchResult?.dateUpdateData;

        // Primary: Read Data Update from Dateupdate sheet cell A2 (row 0)
        let incomingLatestUpdate = null;
        if (Array.isArray(candidateDateUpdate) && candidateDateUpdate.length > 0) {
            const firstRow = candidateDateUpdate[0];
            const rawValue = firstRow?.['วันที่อัปเดต'] ?? (firstRow && typeof firstRow === 'object' ? Object.values(firstRow)[0] : null);
            if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
                const valueStr = String(rawValue).trim();
                incomingLatestUpdate = {
                    date: parseCallCreateDate(valueStr),
                    value: valueStr
                };
            }
        }

        // Fallback: Find latest update date in incoming mainData if Dateupdate sheet is empty
        if (!incomingLatestUpdate && Array.isArray(candidateMainData)) {
            incomingLatestUpdate = candidateMainData.reduce((latest, row) => {
                const value = row?.['วันที่อัปเดต'];
                const date = parseCallCreateDate(value);
                return date && (!latest || date > latest.date)
                    ? { date, value: String(value).trim() }
                    : latest;
            }, null);
        }

        // Guard against older data reverting a newer update (e.g. from stale cache or edge cache)
        let effectiveMainData = candidateMainData;
        if (
            latestUpdateDateRef.current &&
            incomingLatestUpdate?.date &&
            incomingLatestUpdate.date < latestUpdateDateRef.current &&
            latestMainDataRef.current?.length
        ) {
            console.warn(
                `[applyData] Incoming mainData update (${incomingLatestUpdate.value}) is older than current; preserving newer mainData`
            );
            effectiveMainData = latestMainDataRef.current;
        } else if (incomingLatestUpdate?.date) {
            latestUpdateDateRef.current = incomingLatestUpdate.date;
            latestMainDataRef.current = effectiveMainData;
            setLastUpdated(incomingLatestUpdate.value || null);
        } else if (!latestUpdateDateRef.current && incomingLatestUpdate?.value) {
            setLastUpdated(incomingLatestUpdate.value);
        }

        const pickNonEmpty = (incoming, fallback) =>
            Array.isArray(incoming) && incoming.length > 0 ? incoming : (fallback ?? incoming);

        const prev = fullDataRef.current;
        const completeData = prev
            ? {
                ...prev,
                ...(isPartial ? {} : fetchResult),
                mainData: effectiveMainData,
                dateUpdateData: pickNonEmpty(fetchResult?.dateUpdateData, prev.dateUpdateData),
                requestData: pickNonEmpty(fetchResult?.requestData, prev.requestData),
                vipaData: pickNonEmpty(fetchResult?.vipaData, prev.vipaData),
                nawaData: pickNonEmpty(fetchResult?.nawaData, prev.nawaData),
                ...(isPartial ? {} : {
                    poData: pickNonEmpty(fetchResult?.poData, prev.poData),
                    prData: pickNonEmpty(fetchResult?.prData, prev.prData),
                    mainSapData: pickNonEmpty(fetchResult?.mainSapData, prev.mainSapData),
                    plantStockData: pickNonEmpty(fetchResult?.plantStockData, prev.plantStockData),
                    newPartData: pickNonEmpty(fetchResult?.newPartData, prev.newPartData),
                    projectData: pickNonEmpty(fetchResult?.projectData, prev.projectData),
                    teamPlantData: pickNonEmpty(fetchResult?.teamPlantData, prev.teamPlantData),
                    engData: Array.isArray(fetchResult?.engData) && fetchResult.engData.some(s => s?.data?.length > 0)
                        ? fetchResult.engData
                        : prev.engData
                })
            }
            : {
                ...fetchResult,
                mainData: effectiveMainData
            };

        const {
            mainData, dateUpdateData, requestData, poData, prData, mainSapData,
            vipaData, nawaData, plantStockData, newPartData,
            projectData, teamPlantData, engData
        } = completeData;

        // Skip processing if essential data is missing (e.g., empty cache)
        if (!mainData || mainData.length === 0) return false;

        fullDataRef.current = completeData;

        const processed = processRawData(
            mainData, requestData, poData, prData, mainSapData,
            vipaData, nawaData, plantStockData, newPartData,
            projectData, teamPlantData, engData
        );
        setProcessedData(processed);
        setRawSources({ nawaRawData: nawaData, poRawData: poData, prRawData: prData, plantStockData: plantStockData, engData: engData });

        // Save ALL sources to cache for instant load next time
        if (saveCache) {
            saveAllToCache({
                mainData, dateUpdateData, requestData, poData, prData, mainSapData, 
                vipaData, nawaData, plantStockData, newPartData, 
                projectData, teamPlantData, engData
            });
        }

        return true;
    }, []);

    const fetchData = useCallback(async (showLoading = true, forceFresh = false, clearOptimistic = false) => {
        // Routine refreshes reuse active work, but a manual fresh refresh takes priority immediately
        if (inFlightFetch.current && !forceFresh) {
            return inFlightFetch.current;
        }

        if (clearOptimistic) {
            localStorage.removeItem('app_cached_requestQuantities');
            localStorage.removeItem('app_cached_requestByPlant');
        }

        if (showLoading) setIsLoading(true);
        setError(null);
        const generation = ++fetchGeneration.current;

        let latestQuick = null;
        const request = (async () => {
            try {
                try {
                    const quickResult = await fetchQuickData({ fresh: forceFresh });
                    if (fetchGeneration.current !== generation) return;
                    if (quickResult?.mainData?.length) {
                        applyData(quickResult, false, true);
                        const effectiveMainData = fullDataRef.current?.mainData || quickResult.mainData;
                        const effectiveDateUpdateData = fullDataRef.current?.dateUpdateData || quickResult.dateUpdateData;
                        latestQuick = {
                            ...quickResult,
                            mainData: effectiveMainData,
                            dateUpdateData: effectiveDateUpdateData
                        };
                        // Save quickData and individual caches immediately so fresh data is persisted
                        void saveToCache('quickData', {
                            mainData: effectiveMainData,
                            dateUpdateData: effectiveDateUpdateData,
                            requestData: quickResult.requestData,
                            vipaData: quickResult.vipaData,
                            nawaData: quickResult.nawaData
                        });
                        void saveToCache('mainData', effectiveMainData);
                        if (effectiveDateUpdateData?.length) void saveToCache('dateUpdateData', effectiveDateUpdateData);
                        if (quickResult.requestData?.length) void saveToCache('requestData', quickResult.requestData);
                        if (quickResult.vipaData?.length) void saveToCache('vipaData', quickResult.vipaData);
                        if (quickResult.nawaData?.length) void saveToCache('nawaData', quickResult.nawaData);
                    }
                    if (showLoading) setIsLoading(false);
                } catch (quickError) {
                    console.warn('[API] Quick data fetch failed; falling back to full data:', quickError);
                }

                const result = await fetchAllData({ fresh: forceFresh, latestQuickData: latestQuick });
                if (fetchGeneration.current === generation) {
                    // Ensure fresh quick data is not lost if full fetch had partial failures
                    if ((!result.mainData || result.mainData.length === 0) && latestQuick?.mainData?.length) {
                        result.mainData = latestQuick.mainData;
                    }
                    const applied = applyData(result, true);
                    if (!applied) {
                        setError('ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
                    }
                    if (showLoading) setIsLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (!latestQuick?.mainData?.length && !fullDataRef.current?.mainData?.length) {
                    setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                }
            } finally {
                if (showLoading) setIsLoading(false);
                if (inFlightFetch.current === request) {
                    inFlightFetch.current = null;
                }
            }
        })();
        inFlightFetch.current = request;
        return request;
    }, [applyData]);

    // Cache-first initialization
    useEffect(() => {
        const initData = async () => {
            if (hasCacheLoaded.current) return;
            hasCacheLoaded.current = true;

            try {
                // 1. Try to load from IndexedDB cache first
                const quickData = await loadFromCache('quickData');
                if (quickData?.mainData?.length) {
                    applyData(quickData, false, true);
                    console.log("[Cache-First] UI populated from quick stock cache; refreshing in background...");
                    setIsLoading(false);
                    fetchData(false);
                } else {
                    console.log("[Cache-First] No quick stock cache found, fetching server data...");
                    fetchData(true);
                }
            } catch (err) {
                console.warn("[Cache-First] Failed to initialize from cache:", err);
                fetchData(true);
            }
        };

        initData();

        const interval = setInterval(() => fetchData(false), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData, applyData]);

    // --- Filtering Logic (matching original call.js exactly) ---

    // Base filter: applies TeamPlant, PendingUnit, StockAnswer, StatusCall, and Search
    // excludeType allows cross-filtering (skipping one filter to compute its options)
    const getFilteredData = useCallback((excludeType = null) => {
        return processedData.filter(row => {
            if (!row) return false;
            const ticket = row["Ticket Number"];
            if (!ticket || String(ticket).trim() === "" || String(ticket).trim() === "-") return false;

            const cleanTP = getCleanTeamPlant(row["TeamPlant"]);

            // TeamPlant filter
            if (excludeType !== 'teamPlant' && teamPlantFilter && cleanTP !== teamPlantFilter) return false;
            // PendingUnit filter
            if (excludeType !== 'pending' && pendingUnitFilter && (row["ค้างหน่วยงาน"] || "") !== pendingUnitFilter) return false;
            // StockAnswer filter
            if (excludeType !== 'stock' && stockAnswerFilter && (row["คลังตอบ"] || "") !== stockAnswerFilter) return false;
            // StatusCall filter (uses StatusX = row-level status, matching original)
            if (excludeType !== 'status' && statusCallFilter && (row.StatusX || "") !== statusCallFilter) return false;

            // Search term
            if (searchTerm) {
                const keyword = searchTerm.toLowerCase().trim();
                const fields = [
                    row["DayRepair"], row["DateTime"], row["Ticket Number"],
                    row["Brand"], row["Equipment"], row["Call Type"], row["Team"],
                    cleanTP, row["ค้างหน่วยงาน"], row["Material"],
                    row["Description"], row["Nawa"], row["Vipa"],
                    row["Request"], row["EngQty"],
                    row["QtyPlant"], row["OtherPlant"], row["คลังตอบ"],
                    row["UserAns"], row["วันที่ตอบ"], row["StatusCall"]
                ];
                const match = fields.some(f => f && String(f).toLowerCase().includes(keyword));
                if (!match) return false;
            }

            if (excludeType !== 'gm' && gmFilter && row.GM !== gmFilter) return false;
            if (excludeType !== 'dept' && deptGroupFilter && !matchesDeptGroup(row["ค้างหน่วยงาน"], deptGroupFilter)) return false;

            return true;
        });
    }, [processedData, teamPlantFilter, pendingUnitFilter, stockAnswerFilter, statusCallFilter, searchTerm, gmFilter, deptGroupFilter]);

    // Apply dashboard card filter (matching original applyDashboardFilter)
    const applyDashboardFilter = useCallback((data, filter) => {
        if (!filter || !data) return data;

        switch (filter) {
            case 'pending': return data.filter(row => (row.StatusCall || "") === "รอของเข้า");
            case 'success': return data.filter(row => (row.StatusCall || "") === "ระหว่างขนส่ง");
            case 'waitingResponse': return data.filter(row => (row["คลังตอบ"] || "") === "รอตรวจสอบ");
            case 'over7': return data.filter(row => parseFloat(row["DayRepair"] || 0) > 7);
            case 'request': return data.filter(row => (row.StatusCall || "") === "ขอซื้อขอซ่อม");
            case 'otherPlant': return data.filter(row => (row.StatusCall || "") === "ดึงจากคลังอื่น");
            case 'newPart': return data.filter(row => (row.StatusCall || "") === "เปิดรหัสใหม่");
            case 'exceedLeadtime': return data.filter(row => (row.StatusCall || "") === "เกินLeadtime");
            case 'nawaVipa': return data.filter(row => (row.StatusCall || "") === "เบิกศูนย์อะไหล่");
            case 'engInTeam': return data.filter(row => (row.StatusCall || "") === "มีอะไหล่ในทีม" || (row.StatusX || "") === "มีอะไหล่ในทีม");
            case 'rebuiltStock': return data.filter(row => (row.StatusCall || "") === "เบิกทดแทน" || (row.StatusX || "") === "เบิกทดแทน");
            case 'spacial': return data.filter(row => (row.StatusCall || "") === "SPACIAL");
            default:
                if (filter.startsWith && filter.startsWith('calltype_')) {
                    const typeName = filter.replace('calltype_', '');
                    return data.filter(row => (row["Call Type"] || "") === typeName);
                }
                return data;
        }
    }, []);

    // Final filtered data (base + dashboard)
    const baseFilteredData = useMemo(() => getFilteredData(null), [getFilteredData]);
    const filteredData = useMemo(() => applyDashboardFilter([...baseFilteredData], dashboardFilter), [baseFilteredData, dashboardFilter, applyDashboardFilter]);

    // Summary calculation optimized for hierarchical/faceted view
    const summary = useMemo(() => {
        // 1. GM Stats: Filtered by everything EXCEPT GM filter (so we see all GMs)
        const gmData = getFilteredData('gm');
        const gmSummary = calculateSummary(gmData);

        // 1b. Dept Group Stats: Filtered by everything EXCEPT dept filter (so we see all Dept Groups)
        const deptData = getFilteredData('dept');
        const deptSummary = calculateSummary(deptData);

        // 2. Dashboard Stats (Main cards): Filtered by GM selection and Dept Group selection
        const dashboardSummary = calculateSummary(baseFilteredData);

        // 3. Call Type Stats: Filtered by GM, Dept Group and ONLY Status (so other Call Type cards stay visible)
        const statusOnlyFilter = (dashboardFilter && !dashboardFilter.startsWith('calltype_')) ? dashboardFilter : null;
        const statusOnlyFilteredData = applyDashboardFilter([...baseFilteredData], statusOnlyFilter);
        const callTypeSummary = calculateSummary(statusOnlyFilteredData);

        return {
            ...dashboardSummary, // Main stats from GM & Dept-filtered data
            gmStats: gmSummary.gmStats, // GM cards from all-GM data
            deptGroupStats: deptSummary.deptGroupStats, // Dept group cards from all-dept data
            callTypeStats: callTypeSummary.callTypeStats // Call Type cards from fully filtered data
        };
    }, [getFilteredData, baseFilteredData, applyDashboardFilter, dashboardFilter]);

    // Cross-filtered data for each filter panel
    const teamPlantFilterData = useMemo(() => applyDashboardFilter(getFilteredData('teamPlant'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);
    const pendingFilterData = useMemo(() => applyDashboardFilter(getFilteredData('pending'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);
    const stockFilterData = useMemo(() => applyDashboardFilter(getFilteredData('stock'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);
    const statusFilterData = useMemo(() => applyDashboardFilter(getFilteredData('status'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);

    // Compute filter options with ticket counts (matching original)
    const computeFilterOptions = useCallback((data, field, transform) => {
        const ticketSets = {};
        data.forEach(row => {
            let val = transform ? transform(row) : (row[field] || "");
            const ticket = row["Ticket Number"];
            if (val && ticket) {
                if (!ticketSets[val]) ticketSets[val] = new Set();
                ticketSets[val].add(ticket);
            }
        });
        const counts = {};
        Object.keys(ticketSets).forEach(key => counts[key] = ticketSets[key].size);
        return counts;
    }, []);

    const getPendingUnitWaitingStatus = useCallback((data) => {
        const statusByUnit = {};
        data.forEach(row => {
            const unit = String(row["ค้างหน่วยงาน"] || "").trim();
            if (!unit || unit === "ไม่ระบุ") return;
            if (!(unit in statusByUnit)) statusByUnit[unit] = false;
            if (String(row["คลังตอบ"] || "").trim() === "รอตรวจสอบ") {
                statusByUnit[unit] = true;
            }
        });
        return statusByUnit;
    }, []);

    const getPendingUnitAllDoneStatus = useCallback((data) => {
        const allDoneByUnit = {};
        data.forEach(row => {
            const unit = String(row["ค้างหน่วยงาน"] || "").trim();
            if (!unit || unit === "ไม่ระบุ") return;
            if (!(unit in allDoneByUnit)) allDoneByUnit[unit] = true;
            if (String(row["คลังตอบ"] || "").trim() !== "ดำเนินการแล้ว") {
                allDoneByUnit[unit] = false;
            }
        });
        return allDoneByUnit;
    }, []);

    const availableFilters = useMemo(() => ({
        teamPlant: computeFilterOptions(teamPlantFilterData, null, (row) => getCleanTeamPlant(row["TeamPlant"])),
        pendingUnit: computeFilterOptions(pendingFilterData, "ค้างหน่วยงาน"),
        pendingUnitHasWaiting: getPendingUnitWaitingStatus(pendingFilterData),
        pendingUnitAllDone: getPendingUnitAllDoneStatus(pendingFilterData),
        stockAnswer: computeFilterOptions(stockFilterData, "คลังตอบ"),
        statusCall: computeFilterOptions(statusFilterData, null, (row) => row.StatusX || "")
    }), [teamPlantFilterData, pendingFilterData, stockFilterData, statusFilterData, computeFilterOptions, getPendingUnitWaitingStatus, getPendingUnitAllDoneStatus]);

    // Optimistic update for DOM re-render without full fetch
    const updateRowLocally = useCallback((ticketNumber, material, updates) => {
        if (fullDataRef.current) {
            const normTick = String(ticketNumber || "").replace(/^'/, '').trim();
            const nowIso = new Date().toISOString();
            if (material) {
                const normMat = String(material || "").replace(/^'/, '').trim();
                const prevNewPart = Array.isArray(fullDataRef.current.newPartData) ? fullDataRef.current.newPartData : [];
                const filteredNewPart = prevNewPart.filter(p => {
                    const tNum = String(p?.["Ticket Number"] || "").replace(/^'/, '').trim();
                    const mat = String(p?.["Material"] || "").replace(/^'/, '').trim();
                    return !(tNum === normTick && mat === normMat);
                });
                if (updates._highlight !== 'delete' && updates.StatusX) {
                    filteredNewPart.push({
                        "Ticket Number": normTick,
                        "Material": normMat,
                        "Status": updates.StatusX,
                        "StatusCall": updates.StatusX,
                        "Timestamp": nowIso
                    });
                }
                fullDataRef.current = { ...fullDataRef.current, newPartData: filteredNewPart };
            } else {
                const prevProject = Array.isArray(fullDataRef.current.projectData) ? fullDataRef.current.projectData : [];
                const filteredProject = prevProject.filter(p => {
                    const tNum = String(p?.["Ticket Number"] || "").replace(/^'/, '').trim();
                    return tNum !== normTick;
                });
                if (updates._highlight !== 'delete' && updates.StatusCall) {
                    filteredProject.push({
                        "Ticket Number": normTick,
                        "StatusCall": updates.StatusCall,
                        "Project": updates.Answer1 && updates.Answer1 !== "-" ? updates.Answer1 : "",
                        "Timestamp": nowIso
                    });
                }
                fullDataRef.current = { ...fullDataRef.current, projectData: filteredProject };
            }
        }

        setProcessedData(prevData => {
            let newData = prevData.map(row => {
                const tickRow = String(row["Ticket Number"] || "").replace(/^'/, '').trim();
                let isMatch = tickRow === ticketNumber;
                if (isMatch && material) {
                    const matRow = String(row["Material"] || "").replace(/^'/, '').trim();
                    isMatch = matRow === material;
                }
                if (isMatch) {
                    return { ...row, ...updates };
                }
                return row;
            });

            // Re-evaluate group StatusCall based on new StatusX values
            const ticketRows = newData.filter(row => String(row["Ticket Number"] || "").replace(/^'/, '').trim() === ticketNumber);
            if (ticketRows.length > 0) {
                let newStatusCall = "รอของเข้า";
                // If it's a project (Answer1 exists and is not "-")
                if (ticketRows[0].Answer1 && ticketRows[0].Answer1 !== "-") {
                    newStatusCall = ticketRows[0].StatusCall;
                } else {
                    const validRows = ticketRows.filter(r => r.StatusX !== "แจ้งCodeผิด");
                    const evals = validRows.length > 0 ? validRows : ticketRows;

                    if (evals.some(r => r.StatusX === "เปิดรหัสใหม่")) newStatusCall = "เปิดรหัสใหม่";
                    else if (evals.some(r => r.StatusX === "ขอซื้อขอซ่อม")) newStatusCall = "ขอซื้อขอซ่อม";
                    else if (evals.some(r => r.StatusX === "รอของเข้า")) newStatusCall = "รอของเข้า";
                    else if (evals.some(r => r.StatusX === "เบิกนวนคร" || r.StatusX === "เบิกวิภาวดี")) newStatusCall = "เบิกศูนย์อะไหล่";
                    else if (evals.some(r => r.StatusX === "ระหว่างขนส่ง")) newStatusCall = "ระหว่างขนส่ง";
                    else if (evals.some(r => r.StatusX === "มีอะไหล่ในทีม")) newStatusCall = "มีอะไหล่ในทีม";
                    else if (evals.some(r => r.StatusX === "เบิกทดแทน")) newStatusCall = "เบิกทดแทน";
                    else if (ticketRows.some(r => r.StatusX === "แจ้งCodeผิด")) newStatusCall = "แจ้งCodeผิด";

                    if (newStatusCall === "รอของเข้า" || newStatusCall === "ดึงจากคลังอื่น") {
                        const allOtherPlant = validRows.every(r => {
                            const op = r["OtherPlant"];
                            return r.StatusX === "ดึงจากคลังอื่น" || (op !== undefined && op !== null && op !== "" && op !== "-" && op !== 0 && op !== "0");
                        });

                        if (allOtherPlant && validRows.length > 0) {
                            newStatusCall = "ดึงจากคลังอื่น";
                        }
                    }
                    if (newStatusCall === "รอของเข้า" || newStatusCall === "ดึงจากคลังอื่น") {
                        if (validRows.some(r => r.StatusX === "เกินLeadtime")) {
                            newStatusCall = "เกินLeadtime";
                        }
                    }
                }

                // Apply the re-evaluated group status to all rows of this ticket
                newData = newData.map(row => {
                    const tickRow = String(row["Ticket Number"] || "").replace(/^'/, '').trim();
                    if (tickRow === ticketNumber) {
                        return { ...row, StatusCall: newStatusCall };
                    }
                    return row;
                });
            }

            return newData;
        });
    }, []);

    return {
        data: filteredData,
        allData: processedData,
        baseFilteredData,
        isLoading,
        error,
        lastUpdated,
        summary,
        availableFilters,
        rawSources,
        engData: rawSources.engData,
        // Single-select filters
        teamPlantFilter, setTeamPlantFilter,
        pendingUnitFilter, setPendingUnitFilter,
        stockAnswerFilter, setStockAnswerFilter,
        statusCallFilter, setStatusCallFilter,
        searchTerm, setSearchTerm,
        dashboardFilter, setDashboardFilter,
        gmFilter, setGmFilter,
        deptGroupFilter, setDeptGroupFilter,
        applyDashboardFilter,
        refreshData: () => fetchData(true, true, true),
        refreshDataBackground: (forceFresh = false) => fetchData(false, forceFresh),
        updateRowLocally,
        handleOutsideRequest: async (payload) => {
            const { material, quantity, plant } = payload;
            const localKey = normalizeMaterial(material);
            const localQty = parseFloat(quantity);

            if (!localKey || isNaN(localQty)) {
                throw new Error("Invalid material or quantity");
            }

            const now = Date.now();

            // 1. Optimistic Update Local Cache (requestQuantities by material)
            let currentCache = {};
            try {
                const cachedPropsText = localStorage.getItem('app_cached_requestQuantities');
                if (cachedPropsText) {
                    currentCache = JSON.parse(cachedPropsText);
                }
            } catch (e) {
                console.error("Error reading cache", e);
            }
            const prevEntry = currentCache[localKey];
            const previousQty = typeof prevEntry === 'object' && prevEntry !== null ? (prevEntry.qty || 0) : (prevEntry || 0);
            currentCache[localKey] = {
                qty: previousQty + localQty,
                timestamp: now
            };
            localStorage.setItem('app_cached_requestQuantities', JSON.stringify(currentCache));

            // 1b. Optimistic Update Local Cache (requestQuantities by plant+material)
            let plantCache = {};
            let plantKey;
            let previousPlantQty = 0;
            if (plant && plant !== '-') {
                try {
                    const plantCacheText = localStorage.getItem('app_cached_requestByPlant');
                    if (plantCacheText) {
                        plantCache = JSON.parse(plantCacheText);
                    }
                } catch (e) {
                    console.error("Error reading plant cache", e);
                }
                plantKey = `${plant}_${localKey}`;
                const prevPlantEntry = plantCache[plantKey];
                previousPlantQty = typeof prevPlantEntry === 'object' && prevPlantEntry !== null ? (prevPlantEntry.qty || 0) : (prevPlantEntry || 0);
                plantCache[plantKey] = {
                    qty: previousPlantQty + localQty,
                    timestamp: now
                };
                localStorage.setItem('app_cached_requestByPlant', JSON.stringify(plantCache));
            }

            // 2. IMMEDIATE OPTIMISTIC UI UPDATE in processedData
            setProcessedData(prevData => {
                return prevData.map(row => {
                    const mat = normalizeMaterial(row["Material"]);
                    if (mat !== localKey) return row;

                    const rowIdPlant = PLANT_MAPPING[(row["ค้างหน่วยงาน"] || "").toString().trim()] || row.IDPlant || "";
                    if (!plant || plant === '-' || !rowIdPlant || rowIdPlant === plant) {
                        const currentReq = parseFloat(row["Request"]) || 0;
                        return {
                            ...row,
                            Request: currentReq + localQty
                        };
                    }
                    return row;
                });
            });

            // 3. BACKGROUND UPDATE: Send outside request asynchronously to Google Apps Script
            let userStr = '-';
            try {
                const u = JSON.parse(localStorage.getItem('user'));
                userStr = u?.Name || u?.IDRec || '-';
            } catch (error) {
                console.error('Unable to read the saved user for request logging:', error);
            }

            const logPayload = { ...payload, user: userStr };
            (async () => {
                try {
                    await sendOutsideRequest(logPayload);
                    console.log('[OutsideRequest] Background save succeeded');
                    // Give Google Sheets a few seconds to commit the row, then quietly refresh in background
                    setTimeout(() => {
                        fetchData(false, true);
                    }, 4000);
                } catch (error) {
                    console.error('[OutsideRequest] Background save failed:', error);
                    // Rollback optimistic cache if background request failed
                    try {
                        if (previousQty > 0) {
                            currentCache[localKey] = { qty: previousQty, timestamp: now };
                        } else {
                            delete currentCache[localKey];
                        }
                        localStorage.setItem('app_cached_requestQuantities', JSON.stringify(currentCache));
                        if (plantKey) {
                            if (previousPlantQty > 0) {
                                plantCache[plantKey] = { qty: previousPlantQty, timestamp: now };
                            } else {
                                delete plantCache[plantKey];
                            }
                            localStorage.setItem('app_cached_requestByPlant', JSON.stringify(plantCache));
                        }
                    } catch (e) {
                        console.error('Rollback error:', e);
                    }
                    fetchData(false);
                }
            })();

            return true;
        }
    };
}
