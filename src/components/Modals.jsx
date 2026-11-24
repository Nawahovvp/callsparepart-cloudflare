import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import QRCode from 'qrcode';
import { getCleanTeamPlant, getDesc, normalizeMaterial, matchesDeptGroup, DEPT_GROUPS, PLANT_MAPPING } from '../utils/helpers';
import { computeSpareSummaryData } from '../utils/syncHelpers';
import { printStickers } from '../utils/stickerPrint';

Chart.register(...registerables);

// ===== Detail Modal =====
export function DetailModal({ isOpen, onClose, content }) {
    if (!isOpen) return null;
    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content">
                <span className="close" onClick={onClose}>×</span>
                <h2>รายละเอียด</h2>
                <div dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        </div>
    );
}

// ===== Graph Modal (Stacked Bar Chart) =====
const CHART_COLORS = {
    "รอของเข้า": '#dc3545',
    "สำเร็จ": '#28a745',
    "ระหว่างขนส่ง": '#28a745',
    "เบิกศูนย์อะไหล่": '#6f42c1',
    "ขอซื้อขอซ่อม": '#20c997',
    "เกินLeadtime": '#fd7e14',
    "ดึงจากคลังอื่น": '#17a2b8',
    "เปิดรหัสใหม่": '#007bff',
    "แจ้งCodeผิด": '#e83e8c',
    "รอทดแทน": '#ffc107',
    "SPACIAL": '#343a40',
    "ไม่ระบุ": '#6c757d'
};

function hexToRgb(hex) {
    if (!hex || hex.startsWith('var')) return null;
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

export function GraphModal({ isOpen, onClose, data = [], onFilterPendingUnit }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !canvasRef.current || data.length === 0) return;

        // Pivot: ค้างหน่วยงาน × StatusCall
        const pivotData = {};
        const ticketCounted = {};
        const statusSet = new Set();

        data.forEach(row => {
            const ticket = row["Ticket Number"];
            if (ticketCounted[ticket]) return;
            ticketCounted[ticket] = true;
            const unit = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").toString().trim();
            const status = row["StatusCall"] || "ไม่ระบุ";
            statusSet.add(status);
            if (!pivotData[unit]) pivotData[unit] = {};
            pivotData[unit][status] = (pivotData[unit][status] || 0) + 1;
        });

        const statusCalls = [...statusSet].sort();
        let pendingUnits = Object.keys(pivotData);

        // Sort by total descending
        pendingUnits.sort((a, b) => {
            const totalA = statusCalls.reduce((s, st) => s + (pivotData[a]?.[st] || 0), 0);
            const totalB = statusCalls.reduce((s, st) => s + (pivotData[b]?.[st] || 0), 0);
            return totalB - totalA;
        });

        if (pendingUnits.length > 200) pendingUnits = pendingUnits.slice(0, 200);

        const datasets = statusCalls
            .filter(st => st !== "ไม่ระบุ" && pendingUnits.some(u => (pivotData[u]?.[st] || 0) > 0))
            .map(status => {
                const colorKey = status === "สำเร็จ" ? "ระหว่างขนส่ง" : status;
                const rgb = hexToRgb(CHART_COLORS[colorKey] || '#6c757d');
                return {
                    label: status === "สำเร็จ" ? "ระหว่างขนส่ง" : status,
                    data: pendingUnits.map(u => pivotData[u]?.[status] || 0),
                    borderColor: CHART_COLORS[colorKey] || '#6c757d',
                    backgroundColor: rgb ? `rgba(${rgb}, 0.8)` : '#6c757d',
                    borderWidth: 2,
                    borderRadius: 4,
                    stack: 'CallStack'
                };
            });

        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: { labels: pendingUnits, datasets },
            options: {
                responsive: true,
                interaction: { intersect: false, mode: 'index' },
                animation: { duration: 2000, easing: 'easeOutQuart' },
                scales: {
                    x: { stacked: true, ticks: { maxRotation: 45, minRotation: 45 }, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0 && onFilterPendingUnit) {
                        const idx = elements[0].index;
                        const unit = pendingUnits[idx];
                        onFilterPendingUnit(unit);
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (ctx) => `ค้างหน่วยงาน: ${ctx[0].label}`,
                            label: (ctx) => ctx.parsed.y > 0 ? `${ctx.dataset.label}: ${ctx.parsed.y} Call` : null,
                            footer: (ctx) => {
                                let total = 0;
                                ctx.forEach(c => { if (c.parsed.y > 0) total += c.parsed.y; });
                                return `รวม: ${total} Call`;
                            }
                        }
                    },
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20 } }
                }
            },
            plugins: [{
                id: 'totalLabel',
                afterDatasetsDraw(chart) {
                    const { ctx, data: chartData, scales } = chart;
                    const xScale = scales.x;
                    const yScale = scales.y;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
                    ctx.font = 'bold 12px sans-serif';
                    for (let i = 0; i < chartData.labels.length; i++) {
                        let totalVal = 0;
                        chartData.datasets.forEach(ds => { totalVal += (ds.data[i] || 0); });
                        if (totalVal > 0) {
                            const x = xScale.getPixelForValue(i);
                            const y = yScale.getPixelForValue(totalVal);
                            ctx.fillText(totalVal, x, y - 5);
                        }
                    }
                    ctx.restore();
                }
            }]
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [isOpen, data, onFilterPendingUnit]);

    if (!isOpen) return null;
    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="graph-modal-content">
                <span className="close" onClick={onClose}>×</span>
                <h2>จำนวน Call ตามค้างหน่วยงานและสถานะ</h2>
                <canvas ref={canvasRef} style={{ maxHeight: '600px', height: '60vh' }}></canvas>
            </div>
        </div>
    );
}

// ===== Summary Modal (Grouped: Material ASC -> Description -> TeamPlant -> Team -> Eng -> Total Qty + Allocation Calculator) =====
export function SummaryModal({ isOpen, onClose, data = [], engData = [], onEngClick }) {
    const [allocMaterial, setAllocMaterial] = useState('');
    const [allocQty, setAllocQty] = useState('');

    const engByMatTeam = useMemo(() => {
        const map = new Map();
        if (Array.isArray(engData)) {
            engData.forEach((sheet) => {
                if (!Array.isArray(sheet?.data)) return;
                sheet.data.forEach((engRow) => {
                    const eMat = normalizeMaterial(engRow?.["Material"] || "");
                    const eTeam = String(engRow?.["หน่วยงาน"] || engRow?.["Team"] || "").trim();
                    const eQty = parseFloat(String(engRow?.["จำนวน"] ?? engRow?.["Qty"] ?? "0").replace(/,/g, "")) || 0;
                    if (!eMat || !eTeam || eQty <= 0) return;

                    const key = `${eMat}__${eTeam}`;
                    if (!map.has(key)) {
                        map.set(key, { qty: 0, techs: [] });
                    }
                    const entry = map.get(key);
                    entry.qty += eQty;
                    const name = String(engRow?.["ชื่อช่าง"] || engRow?.["Name"] || engRow?.["Employee ID"] || "").trim();
                    if (name) {
                        entry.techs.push(`${name} (${eQty})`);
                    }
                });
            });
        }
        return map;
    }, [engData]);

    const availableMaterials = useMemo(() => {
        const map = new Map();
        (data || []).forEach((row) => {
            const raw = String(row["Material"] || "").replace(/^'/, '').trim();
            const key = normalizeMaterial(raw);
            if (key && !map.has(key)) {
                map.set(key, { code: raw, desc: String(getDesc(row) || "").trim() });
            }
        });
        return [...map.values()].sort((a, b) =>
            a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [data]);

    const normAllocMat = normalizeMaterial(allocMaterial);
    const parsedAllocQty = parseFloat(String(allocQty).replace(/,/g, ''));
    const isAllocationMode = Boolean(normAllocMat && !isNaN(parsedAllocQty) && parsedAllocQty > 0);

    const summaryData = useMemo(() => {
        if (!data || data.length === 0) return null;

        const filteredSource = normAllocMat
            ? data.filter((row) => {
                const mat = normalizeMaterial(row["Material"] || "");
                return mat && mat.includes(normAllocMat);
            })
            : data;

        const ticketSet = new Set();
        const teamSet = new Set();
        const matMap = new Map();
        let grandTotalQty = 0;

        filteredSource.forEach((row) => {
            const ticket = String(row["Ticket Number"] || "").trim();
            if (ticket) ticketSet.add(ticket);

            const tp = getCleanTeamPlant(row["TeamPlant"]) || "ไม่ระบุ";
            const team = String(row["Team"] || "").trim() || "ไม่ระบุ";
            teamSet.add(team);

            const rawMaterial = String(row["Material"] || "").replace(/^'/, '').trim();
            const matKey = normalizeMaterial(rawMaterial) || rawMaterial || "-";
            const displayMaterial = rawMaterial || "-";
            const description = String(getDesc(row) || "").trim() || "-";
            const qty = parseFloat(String(row["จำนวน"] ?? "0").replace(/,/g, "")) || 0;

            grandTotalQty += qty;

            if (!matMap.has(matKey)) {
                matMap.set(matKey, {
                    matKey,
                    material: displayMaterial,
                    description,
                    totalQty: 0,
                    entries: new Map()
                });
            }
            const matEntry = matMap.get(matKey);
            if ((matEntry.description === "-" || !matEntry.description) && description !== "-") {
                matEntry.description = description;
            }
            matEntry.totalQty += qty;

            const entryKey = `${tp}__${team}`;
            if (!matEntry.entries.has(entryKey)) {
                matEntry.entries.set(entryKey, { teamPlant: tp, team, qty: 0, sampleRow: row });
            }
            matEntry.entries.get(entryKey).qty += qty;
        });

        const sortedMaterials = [...matMap.values()].sort((a, b) =>
            a.material.localeCompare(b.material, undefined, { numeric: true, sensitivity: 'base' })
        );

        const flatRows = [];
        sortedMaterials.forEach((matObj, matIdx) => {
            const subEntries = [...matObj.entries.values()].sort((a, b) =>
                a.teamPlant.localeCompare(b.teamPlant, 'th', { numeric: true, sensitivity: 'base' })
                || a.team.localeCompare(b.team, 'th', { numeric: true, sensitivity: 'base' })
            );
            subEntries.forEach((sub, subIdx) => {
                const engMatch = engByMatTeam.get(`${matObj.matKey}__${sub.team}`);
                flatRows.push({
                    key: `${matObj.material}_${sub.teamPlant}_${sub.team}_${subIdx}`,
                    matIdx,
                    material: matObj.material,
                    description: matObj.description,
                    matTotalQty: matObj.totalQty,
                    matRowSpan: subIdx === 0 ? subEntries.length : 0,
                    teamPlant: sub.teamPlant,
                    team: sub.team,
                    teamEngQty: engMatch ? engMatch.qty : 0,
                    teamEngTitle: engMatch?.techs?.length ? engMatch.techs.join(', ') : '',
                    sampleRow: sub.sampleRow,
                    totalQty: sub.qty
                });
            });
        });

        return {
            totalCalls: ticketSet.size,
            teamCount: teamSet.size,
            totalMaterialCount: sortedMaterials.length,
            grandTotalQty,
            flatRows
        };
    }, [data, engByMatTeam, normAllocMat]);

    const allocationData = useMemo(() => {
        if (!isAllocationMode || !data || data.length === 0) return null;

        // Prefer exact material match if any exists, otherwise substring match
        const exactRows = data.filter((row) => normalizeMaterial(row["Material"] || "") === normAllocMat);
        const matchedRows = exactRows.length > 0
            ? exactRows
            : data.filter((row) => normalizeMaterial(row["Material"] || "").includes(normAllocMat));

        // Sort by ผ่านมา (DayRepair) descending, then Ticket Number ascending
        const sortedRows = [...matchedRows].sort((a, b) => {
            const dayA = parseFloat(a["DayRepair"]) || 0;
            const dayB = parseFloat(b["DayRepair"]) || 0;
            if (dayB !== dayA) return dayB - dayA;
            return String(a["Ticket Number"] || "").localeCompare(String(b["Ticket Number"] || ""));
        });

        const remainingEng = new Map();
        engByMatTeam.forEach((val, key) => remainingEng.set(key, val.qty));

        let remainingPool = parsedAllocQty;
        let totalAllocated = 0;
        let totalDeductedEng = 0;
        let totalRequested = 0;
        const rows = [];

        for (const row of sortedRows) {
            const matKey = normalizeMaterial(row["Material"] || "");
            const material = String(row["Material"] || "").replace(/^'/, '').trim() || "-";
            const description = String(getDesc(row) || "").trim() || "-";
            const storeName = String(row["Brand"] || row["Store Name"] || "").trim() || "-";
            const ticket = String(row["Ticket Number"] || "").trim() || "-";
            const tp = getCleanTeamPlant(row["TeamPlant"]) || "ไม่ระบุ";
            const team = String(row["Team"] || "").trim() || "ไม่ระบุ";
            const dayRepair = !isNaN(parseFloat(row["DayRepair"])) ? Math.floor(parseFloat(row["DayRepair"])) : 0;
            const reqQty = parseFloat(String(row["จำนวน"] ?? "1").replace(/,/g, "")) || 1;

            const engKey = `${matKey}__${team}`;
            const availEng = remainingEng.get(engKey) || 0;
            const deductedEng = Math.min(reqQty, availEng);
            const netNeed = Math.max(0, reqQty - deductedEng);

            if (netNeed > 0 && remainingPool <= 0) {
                continue;
            }

            if (deductedEng > 0) {
                remainingEng.set(engKey, availEng - deductedEng);
            }

            const allocatedQty = netNeed > 0 ? Math.min(netNeed, remainingPool) : 0;
            remainingPool -= allocatedQty;

            totalRequested += reqQty;
            totalDeductedEng += deductedEng;
            totalAllocated += allocatedQty;

            let allocStatus = 'ได้เบิกครบ';
            if (netNeed === 0) allocStatus = 'ใช้จากช่างในทีม';
            else if (allocatedQty < netNeed) allocStatus = `ได้เบิกบางส่วน (${allocatedQty}/${netNeed})`;

            rows.push({
                key: `${ticket}_${matKey}_${rows.length}`,
                ticket,
                storeName,
                dayRepair,
                material,
                description,
                teamPlant: tp,
                team,
                reqQty,
                deductedEng,
                allocatedQty,
                allocStatus,
                sampleRow: row
            });

            if (remainingPool <= 0) break;
        }

        return {
            inputQty: parsedAllocQty,
            totalMatchedTickets: sortedRows.length,
            allocatedTickets: rows.length,
            totalRequested,
            totalDeductedEng,
            totalAllocated,
            remainingPool,
            rows
        };
    }, [isAllocationMode, data, normAllocMat, parsedAllocQty, engByMatTeam]);

    const handlePrint = () => {
        const printContent = document.getElementById('summary-print-area');
        if (!printContent) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>สรุปข้อมูล Call ค้าง</title>
            <style>
                body { font-family: 'Prompt', sans-serif; padding: 14px; color: #1e293b; }
                .summary-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
                .stat-card { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; vertical-align: middle; }
                th { background: #f1f5f9; font-weight: 700; }
                th:last-child, td:last-child { text-align: right; }
            </style>
        </head><body>${printContent.innerHTML}</body></html>`);
        w.document.close();
        w.print();
    };

    const handleExportCsv = () => {
        const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const dateStr = new Date().toISOString().split('T')[0];
        let lines = [];
        let filename = `Call_Summary_${dateStr}.csv`;

        if (isAllocationMode && allocationData?.rows?.length) {
            const headers = ['ลำดับ', 'ศูนย์พื้นที่', 'Material', 'Team', 'Store Name', 'ผ่านมา(วัน)', 'ขอเบิก', 'หักช่าง', 'ได้เบิก', 'หมายเหตุ'];
            lines = [
                headers.map(escapeCsv).join(','),
                ...allocationData.rows.map((r, idx) => [
                    idx + 1,
                    r.teamPlant,
                    r.material,
                    r.team,
                    r.storeName,
                    r.dayRepair,
                    r.reqQty,
                    r.deductedEng,
                    r.allocatedQty,
                    r.allocStatus
                ].map(escapeCsv).join(','))
            ];
            filename = `Call_Allocation_${normAllocMat}_${dateStr}.csv`;
        } else if (summaryData?.flatRows?.length) {
            const headers = ['Material', 'Description', 'ศูนย์พื้นที่', 'Team', 'ช่าง', 'จำนวนรวม'];
            lines = [
                headers.map(escapeCsv).join(','),
                ...summaryData.flatRows.map((r) => [
                    r.material,
                    r.description,
                    r.teamPlant,
                    r.team,
                    r.teamEngQty > 0 ? r.teamEngQty : '',
                    r.totalQty
                ].map(escapeCsv).join(','))
            ];
        } else {
            return;
        }

        const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="premium-modal-content" style={{ maxWidth: '960px' }}>
                <div className="premium-modal-header" style={{ padding: '12px 18px' }}>
                    <h3 style={{ fontSize: '16px' }}><i className="fas fa-chart-pie" style={{ marginRight: 8 }}></i> สรุปข้อมูล Call ค้าง (ตามตารางที่กรอง)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            className="action-button premium-button"
                            onClick={handleExportCsv}
                            disabled={!summaryData?.flatRows?.length}
                            title="Export CSV"
                            aria-label="Export CSV"
                            style={{ padding: '6px 10px', fontSize: '14px' }}
                        >
                            <i className="fas fa-file-csv"></i>
                        </button>
                        <button
                            type="button"
                            className="action-button premium-button"
                            onClick={handlePrint}
                            title="พิมพ์สรุป"
                            aria-label="พิมพ์สรุป"
                            style={{ padding: '6px 12px', fontSize: '12.5px' }}
                        >
                            <i className="fas fa-print"></i> พิมพ์สรุป
                        </button>
                        <span className="premium-modal-close" onClick={onClose}>×</span>
                    </div>
                </div>
                <div className="premium-modal-body" style={{ padding: '14px 18px' }}>
                    {!summaryData ? (
                        <div style={{ textAlign: 'center', padding: '32px' }}>ไม่มีข้อมูล</div>
                    ) : (
                        <div id="summary-print-area">
                            {/* Allocation Calculator Bar */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 12px',
                                marginBottom: '12px',
                                borderRadius: '10px',
                                background: '#f8fbff',
                                border: '1px solid #bfdbfe'
                            }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                    <i className="fas fa-calculator" style={{ color: '#2563eb' }}></i>
                                    คำนวณจัดสรรเบิก:
                                </span>
                                <input
                                    type="text"
                                    list="summary-material-list"
                                    placeholder="กรอก Material..."
                                    value={allocMaterial}
                                    onChange={(e) => setAllocMaterial(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '12.5px',
                                        width: '155px',
                                        fontWeight: 600
                                    }}
                                />
                                <datalist id="summary-material-list">
                                    {availableMaterials.map((m) => (
                                        <option key={m.code} value={m.code}>{m.desc}</option>
                                    ))}
                                </datalist>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="จำนวน"
                                    value={allocQty}
                                    onChange={(e) => setAllocQty(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '12.5px',
                                        width: '92px',
                                        fontWeight: 700
                                    }}
                                />
                                {(allocMaterial || allocQty) && (
                                    <button
                                        type="button"
                                        onClick={() => { setAllocMaterial(''); setAllocQty(''); }}
                                        style={{
                                            padding: '5px 10px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#475569',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <i className="fas fa-times" style={{ marginRight: 4 }}></i>ล้าง
                                    </button>
                                )}
                                {isAllocationMode && allocationData && (
                                    <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, marginLeft: 'auto' }}>
                                        จัดสรรได้ {allocationData.totalAllocated.toLocaleString()} / {allocationData.inputQty.toLocaleString()} ชิ้น
                                        {allocationData.totalDeductedEng > 0 ? ` (หักช่าง ${allocationData.totalDeductedEng.toLocaleString()})` : ''}
                                        {allocationData.remainingPool > 0 ? ` • คงเหลือ ${allocationData.remainingPool.toLocaleString()}` : ''}
                                    </span>
                                )}
                            </div>

                            <div className="summary-stat-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                gap: '10px',
                                marginBottom: '12px'
                            }}>
                                <div className="stat-card" style={{
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                    color: 'white',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                                        <i className="fas fa-phone-alt"></i>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>{isAllocationMode ? 'Ticket ที่ได้เบิก' : 'จำนวน Call'}</div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1.15 }}>
                                            {isAllocationMode && allocationData
                                                ? `${allocationData.allocatedTickets} / ${allocationData.totalMatchedTickets}`
                                                : summaryData.totalCalls.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card" style={{
                                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                    color: 'white',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                                        <i className={isAllocationMode ? 'fas fa-user-cog' : 'fas fa-users'}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>{isAllocationMode ? 'หักจากช่างในทีม' : 'Material / Team'}</div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1.15 }}>
                                            {isAllocationMode && allocationData
                                                ? `${allocationData.totalDeductedEng.toLocaleString()} ชิ้น`
                                                : `${summaryData.totalMaterialCount.toLocaleString()} / ${summaryData.teamCount}`}
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card" style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                    color: 'white',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                                        <i className="fas fa-cubes"></i>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>{isAllocationMode ? 'เบิกจ่ายจริง / คงเหลือ' : 'จำนวนรวมทั้งหมด'}</div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1.15 }}>
                                            {isAllocationMode && allocationData
                                                ? `${allocationData.totalAllocated.toLocaleString()} / ${allocationData.remainingPool.toLocaleString()}`
                                                : `${summaryData.grandTotalQty.toLocaleString()} ชิ้น`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: '#ffffff',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden'
                            }}>
                                <div style={{ maxHeight: '58vh', overflow: 'auto' }}>
                                    {isAllocationMode && allocationData ? (
                                        allocationData.rows.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                                                ไม่พบรายการ Material "{allocMaterial}" ในตารางที่กรองปัจจุบัน
                                            </div>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9', color: '#1e293b' }}>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 8px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'center', width: '40px' }}>#</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' }}>ศูนย์พื้นที่</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' }}>Material</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' }}>Team</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left' }}>Store Name</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 8px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '74px' }}>ผ่านมา ▼</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 8px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'right', whiteSpace: 'nowrap', width: '66px' }}>ขอเบิก</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 8px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'right', whiteSpace: 'nowrap', width: '66px' }}>หักช่าง</th>
                                                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right', whiteSpace: 'nowrap', width: '76px' }}>ได้เบิก</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {allocationData.rows.map((r, idx) => (
                                                        <tr key={r.key} className="summary-row-hover" style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }} title={`Ticket: ${r.ticket}`}>
                                                            <td style={{ padding: '5px 8px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                                            <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', fontWeight: 600, color: '#1e3a8a', whiteSpace: 'nowrap' }}>{r.teamPlant}</td>
                                                            <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }} title={r.description}>{r.material}</td>
                                                            <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{r.team}</td>
                                                            <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', color: '#334155' }}>{r.storeName}</td>
                                                            <td style={{ padding: '5px 8px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 700, color: r.dayRepair > 7 ? '#dc2626' : '#334155', whiteSpace: 'nowrap' }}>{r.dayRepair} วัน</td>
                                                            <td style={{ padding: '5px 8px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>{r.reqQty.toLocaleString()}</td>
                                                            <td style={{ padding: '5px 8px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: r.deductedEng > 0 ? '#ea580c' : '#cbd5e1' }}>
                                                                {r.deductedEng > 0 ? r.deductedEng.toLocaleString() : '-'}
                                                            </td>
                                                            <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 800, color: r.allocatedQty > 0 ? '#16a34a' : '#0d9488', whiteSpace: 'nowrap' }} title={r.allocStatus}>
                                                                {r.allocatedQty > 0 ? r.allocatedQty.toLocaleString() : 'จากช่าง'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr style={{ background: '#eff6ff', fontWeight: 800 }}>
                                                        <td colSpan={6} style={{ padding: '7px 10px', borderTop: '2px solid #93c5fd', textAlign: 'right', color: '#1e3a8a' }}>
                                                            รวมจัดสรร ({allocationData.allocatedTickets} รายการ)
                                                        </td>
                                                        <td style={{ padding: '7px 8px', borderTop: '2px solid #93c5fd', textAlign: 'right', color: '#334155' }}>
                                                            {allocationData.totalRequested.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '7px 8px', borderTop: '2px solid #93c5fd', textAlign: 'right', color: '#ea580c' }}>
                                                            {allocationData.totalDeductedEng.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '7px 10px', borderTop: '2px solid #93c5fd', textAlign: 'right', color: '#16a34a' }}>
                                                            {allocationData.totalAllocated.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        )
                                    ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', color: '#1e293b' }}>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap', width: '110px' }}>Material ▲</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left' }}>Description</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap', width: '115px' }}>ศูนย์พื้นที่</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap', width: '120px' }}>Team</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '70px' }}>ช่าง</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f1f5f9', padding: '7px 10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right', whiteSpace: 'nowrap', width: '80px' }}>จำนวนรวม</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summaryData.flatRows.map((r) => {
                                                const groupBg = r.matIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
                                                return (
                                                    <tr key={r.key} className="summary-row-hover" style={{ background: groupBg }}>
                                                        {r.matRowSpan > 0 && (
                                                            <>
                                                                <td
                                                                    rowSpan={r.matRowSpan}
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderBottom: '1px solid #cbd5e1',
                                                                        borderRight: '1px solid #e2e8f0',
                                                                        fontWeight: 700,
                                                                        color: '#0f172a',
                                                                        background: r.matIdx % 2 === 0 ? '#f8fbff' : '#f1f5f9',
                                                                        verticalAlign: 'middle',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{ cursor: 'pointer', textDecoration: 'underline', color: '#1d4ed8' }}
                                                                        title="คลิกเพื่อนำรหัสไปคำนวณจัดสรรเบิก"
                                                                        onClick={() => setAllocMaterial(r.material)}
                                                                    >
                                                                        {r.material}
                                                                    </div>
                                                                    {r.matRowSpan > 1 && (
                                                                        <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#2563eb' }}>รวม {r.matTotalQty.toLocaleString()}</div>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    rowSpan={r.matRowSpan}
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderBottom: '1px solid #cbd5e1',
                                                                        borderRight: '1px solid #e2e8f0',
                                                                        color: '#334155',
                                                                        verticalAlign: 'middle'
                                                                    }}
                                                                >
                                                                    {r.description}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', fontWeight: 600, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                                                            {r.teamPlant}
                                                        </td>
                                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                                            {r.team}
                                                        </td>
                                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', borderRight: '1px solid #f1f5f9', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            {r.teamEngQty > 0 ? (
                                                                <span
                                                                    className="request-pill"
                                                                    style={{ backgroundColor: '#fd7e14', color: '#fff', cursor: onEngClick ? 'pointer' : 'default' }}
                                                                    title={r.teamEngTitle || `อะไหล่ในทีม ${r.team}`}
                                                                    onClick={() => onEngClick?.(r.sampleRow)}
                                                                >
                                                                    {r.teamEngQty.toLocaleString()}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#cbd5e1' }}>-</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 800, color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                                                            {r.totalQty.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr style={{ background: '#eff6ff', fontWeight: 800 }}>
                                                <td colSpan={5} style={{ padding: '7px 10px', borderTop: '2px solid #93c5fd', textAlign: 'right', color: '#1e3a8a' }}>
                                                    รวมทั้งหมด
                                                </td>
                                                <td style={{ padding: '7px 10px', borderTop: '2px solid #93c5fd', textAlign: 'right', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                                                    {summaryData.grandTotalQty.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .summary-row-hover:hover {
                    background-color: #f1f8ff !important;
                }
                .summary-row-hover:hover td {
                    background-color: #f1f8ff !important;
                }
                .premium-button {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .premium-button:hover {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-1px);
                }
                @media print {
                    .modal { position: static; background: none; }
                    .premium-modal-content { box-shadow: none; border: none; }
                    .premium-modal-header, .premium-modal-close { display: none; }
                }
            `}</style>
        </div>
    );
}

// ===== Spare Summary Modal (Full Port from call.js) =====
export function SpareSummaryModal({ isOpen, onClose, data = [], rawSources = {}, isLoading }) {
    const [deptGroupFilter, setDeptGroupFilter] = useState('Stock'); // Default to Stock always
    const [prgFilter, setPrgFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');

    const handleDeptGroupChange = (val) => {
        setDeptGroupFilter(val);
        setSupplierFilter('');
    };

    // Filter data by department group (default: Stock)
    const filteredByGroupData = useMemo(() => {
        if (!deptGroupFilter) return data;
        return data.filter(row => matchesDeptGroup(row["ค้างหน่วยงาน"], deptGroupFilter));
    }, [data, deptGroupFilter]);

    const computedData = useMemo(() => computeSpareSummaryData(filteredByGroupData, rawSources), [filteredByGroupData, rawSources]);

    // Supplier options filtered by current PRG selection
    const supplierOptions = useMemo(() => {
        if (!computedData) return [];
        const { sortedMaterials, prgMap, poDetailMap, nawaMap, pivotData } = computedData;
        const opts = new Set();
        sortedMaterials.forEach(matDesc => {
            const [material] = matDesc.split('|');
            const nawaVal = nawaMap[material] || 0;
            if (pivotData[matDesc].total <= nawaVal && nawaVal > 0) return;
            if (prgFilter && prgMap[material] !== prgFilter) return;
            const detail = poDetailMap[material];
            if (detail && detail.supplier && detail.supplier !== '-') {
                opts.add(detail.supplier);
            }
        });
        return [...opts].sort();
    }, [computedData, prgFilter]);

    // Apply PRG + Supplier filter to rows
    const displayRows = useMemo(() => {
        if (!computedData) return [];
        const { sortedMaterials, pivotData, prgMap, poDetailMap, nawaMap } = computedData;

        return sortedMaterials.filter(matDesc => {
            const [material] = matDesc.split('|');
            const nawaVal = nawaMap[material] || 0;
            const total = pivotData[matDesc].total;

            // Skip rows where total <= nawa (matching original)
            if (total <= nawaVal && nawaVal > 0) return false;

            // PRG filter
            if (prgFilter && prgMap[material] !== prgFilter) return false;

            // Supplier filter
            if (supplierFilter) {
                const detail = poDetailMap[material];
                if (!detail || detail.supplier !== supplierFilter) return false;
            }

            return true;
        });
    }, [computedData, prgFilter, supplierFilter]);

    if (!isOpen) return null;

    if (isLoading && (!data || data.length === 0)) {
        return (
            <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
                <div className="modal-content" style={{
                    maxWidth: '95vw', width: '95vw', minHeight: 420,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', overflow: 'hidden', position: 'relative',
                    background: 'var(--card-bg)'
                }}>
                    <span className="close" onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, zIndex: 5 }}>×</span>
                    <style>{`
                        @keyframes sp-cw   { to { transform: rotate(360deg); } }
                        @keyframes sp-ccw  { to { transform: rotate(-360deg); } }
                        @keyframes sp-pulse {
                            0%,100% { box-shadow: 0 0 0 0 rgba(0,123,255,0.5); transform: scale(1); }
                            50%     { box-shadow: 0 0 24px 8px rgba(0,123,255,0.12); transform: scale(1.07); }
                        }
                        @keyframes sp-bounce {
                            0%,80%,100% { transform: translateY(0); opacity: 0.35; }
                            40%         { transform: translateY(-10px); opacity: 1; }
                        }
                        @keyframes sp-shimmer {
                            0%   { transform: translateX(-100%); }
                            100% { transform: translateX(400%); }
                        }
                        @keyframes sp-float {
                            0%   { transform: translateY(0) translateX(0); opacity: 0; }
                            10%  { opacity: 0.5; }
                            90%  { opacity: 0.5; }
                            100% { transform: translateY(-70px) translateX(12px); opacity: 0; }
                        }
                        @keyframes sp-fadein {
                            from { opacity: 0; transform: translateY(16px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    {[...Array(7)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
                            width: `${6 + (i % 4) * 4}px`, height: `${6 + (i % 4) * 4}px`,
                            background: i % 3 === 0 ? 'rgba(0,123,255,0.2)' : i % 3 === 1 ? 'rgba(253,126,20,0.16)' : 'rgba(25,135,84,0.16)',
                            left: `${8 + i * 12}%`, bottom: `${8 + (i % 3) * 10}%`,
                            animation: `sp-float ${2.6 + i * 0.38}s ease-in-out ${i * 0.3}s infinite`
                        }} />
                    ))}

                    <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 32 }}>
                        <div style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            border: '3px solid transparent',
                            borderTopColor: '#007bff', borderRightColor: 'rgba(0,123,255,0.22)',
                            animation: 'sp-cw 1.4s linear infinite'
                        }} />
                        <div style={{
                            position: 'absolute', inset: 16, borderRadius: '50%',
                            border: '3px solid transparent',
                            borderTopColor: '#fd7e14', borderLeftColor: 'rgba(253,126,20,0.22)',
                            animation: 'sp-ccw 1.0s linear infinite'
                        }} />
                        <div style={{
                            position: 'absolute', inset: 32, borderRadius: '50%',
                            border: '3px solid transparent',
                            borderTopColor: '#198754', borderRightColor: 'rgba(25,135,84,0.22)',
                            animation: 'sp-cw 0.7s linear infinite'
                        }} />
                        <div style={{
                            position: 'absolute', inset: 47, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'sp-pulse 2s ease-in-out infinite'
                        }}>
                            <i className="fas fa-boxes-stacked" style={{ fontSize: 20, color: '#fff' }} />
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', animation: 'sp-fadein 0.7s ease both' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.3px' }}>
                            กำลังเตรียมข้อมูลอะไหล่
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                            รวบรวม PR · PO · Stock นวนคร · แต่ละสาขา
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                            {['#007bff', '#fd7e14', '#198754'].map((c, i) => (
                                <span key={i} style={{
                                    display: 'inline-block', width: 10, height: 10,
                                    borderRadius: '50%', background: c,
                                    animation: `sp-bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                                }} />
                            ))}
                        </div>
                        <div style={{
                            width: 260, height: 4, borderRadius: 999,
                            background: 'var(--border-color)', overflow: 'hidden',
                            position: 'relative', margin: '0 auto'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
                                borderRadius: 999,
                                background: 'linear-gradient(90deg, transparent, #007bff, transparent)',
                                animation: 'sp-shimmer 1.6s ease-in-out infinite'
                            }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    if (!computedData) return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content">
                <span className="close" onClick={onClose}>×</span>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}></i>
                    <p>ไม่พบรายการอะไหล่รอของเข้า</p>
                </div>
            </div>
        </div>
    );

    const { pivotData, pendingUnits, prgMap, prMap, poMap, poDetailMap, nawaMap, prgOptions } = computedData;
    const totalQuantity = displayRows.reduce((sum, matDesc) => sum + (pivotData[matDesc]?.total || 0), 0);
    const topMaterial = displayRows.length > 0 ? displayRows[0].replace('|', ' - ') : '-';

    const exportCSV = () => {
        const rows = [['Material', 'Description', 'PRG', 'PR', 'PO', 'กำหนดส่ง', 'PO Document', 'Supplier', 'จำนวนส่ง', 'นวนคร', 'รวม', ...pendingUnits]];
        displayRows.forEach(matDesc => {
            const [material, description] = matDesc.split('|');
            const d = pivotData[matDesc];
            const detail = poDetailMap[material] || {};
            rows.push([
                material, description, prgMap[material] || '-',
                prMap[normalizeMaterial(material)] || '-',
                poMap[material] || '-',
                detail.delivDate || '-', detail.poDoc || '-', detail.supplier || '-', detail.qtyDeliv || '-',
                nawaMap[material] || '-',
                d.total, ...pendingUnits.map(u => d[u] || 0)
            ]);
        });
        const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'spare_summary.csv';
        link.click();
    };

    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content" style={{ maxWidth: '95vw', width: '95vw' }}>
                <span className="close" onClick={onClose}>×</span>

                {/* Header with filters */}
                <div className="spare-header" style={{ margin: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div className="spare-title" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                            <i className="fas fa-cube"></i> สรุปรายการอะไหล่ (ยกเว้นระหว่างขนส่ง)
                        </div>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <i className="fas fa-layer-group" style={{ position: 'absolute', left: '10px', color: '#0d6efd', fontSize: '11px', pointerEvents: 'none' }}></i>
                            <select value={deptGroupFilter} onChange={(e) => handleDeptGroupChange(e.target.value)}
                                style={{ padding: '6px 14px 6px 28px', borderRadius: '20px', border: '2px solid #0d6efd', fontSize: '12px', fontWeight: 700, color: '#0d6efd', background: '#fff', cursor: 'pointer', outline: 'none', minWidth: '130px' }}>
                                <option value="">กลุ่ม: ทั้งหมด</option>
                                {DEPT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                            </select>
                        </div>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <i className="fas fa-filter" style={{ position: 'absolute', left: '10px', color: '#fd7e14', fontSize: '11px', pointerEvents: 'none' }}></i>
                            <select value={prgFilter} onChange={(e) => { setPrgFilter(e.target.value); }}
                                style={{ padding: '6px 14px 6px 28px', borderRadius: '20px', border: '2px solid #fd7e14', fontSize: '12px', fontWeight: 600, color: '#fd7e14', background: '#fff', cursor: 'pointer', outline: 'none', minWidth: '120px' }}>
                                <option value="">PRG: ทั้งหมด</option>
                                {prgOptions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <i className="fas fa-truck" style={{ position: 'absolute', left: '10px', color: '#6f42c1', fontSize: '11px', pointerEvents: 'none' }}></i>
                            <select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); }}
                                style={{ padding: '6px 14px 6px 28px', borderRadius: '20px', border: '2px solid #6f42c1', fontSize: '12px', fontWeight: 600, color: '#6f42c1', background: '#fff', cursor: 'pointer', outline: 'none', minWidth: '140px' }}>
                                <option value="">Supplier: ทั้งหมด</option>
                                {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="pill" style={{ background: 'var(--info-color)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                            {computedData.filteredRows.length} รายการ
                        </span>
                        <button onClick={exportCSV} title="Export CSV" style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #198754, #20c997)', color: '#fff',
                            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 3px 8px rgba(25,135,84,0.35)'
                        }}><i className="fas fa-file-csv"></i></button>
                        <button onClick={() => {
                            const printContent = document.getElementById('spareSummaryTableArea');
                            if (printContent) {
                                const w = window.open('', '_blank');
                                w.document.write(`<html><head><title>สรุปอะไหล่</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:center;font-size:11px}th{background:#f4f4f4}</style></head><body>${printContent.innerHTML}</body></html>`);
                                w.document.close(); w.print();
                            }
                        }} title="พิมพ์" style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #0d6efd, #6ea8fe)', color: '#fff',
                            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 3px 8px rgba(13,110,253,0.35)'
                        }}><i className="fas fa-print"></i></button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="spare-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2.5fr', gap: '10px', margin: '10px' }}>
                    <div className="stat-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7 }}>จำนวนรายการรวม</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-color)' }}>{displayRows.length}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7 }}>จำนวนชิ้นรวม</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)' }}>{totalQuantity}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7 }}>รอมากที่สุด</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--danger-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={topMaterial}>{topMaterial}</div>
                    </div>
                </div>

                {/* Table */}
                <div id="spareSummaryTableArea" className="desktop-table-wrap" style={{ margin: '10px', overflow: 'auto', maxHeight: '60vh' }}>
                    <table className="detail-table" style={{ fontSize: '12px', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '12%' }}>Material</th>
                                <th style={{ width: '22%' }}>Description</th>
                                <th style={{ width: '7%', backgroundColor: '#fd7e14', color: '#fff' }}>PRG</th>
                                <th style={{ width: '5%' }}>PR</th>
                                <th style={{ width: '5%' }}>PO</th>
                                <th style={{ width: '7%' }}>กำหนดส่ง</th>
                                <th style={{ width: '7%' }}>PO Document</th>
                                <th style={{ width: '8%' }}>Supplier</th>
                                <th style={{ width: '5%' }}>จำนวนส่ง</th>
                                <th style={{ width: '5%', backgroundColor: '#fd7e14', color: '#fff' }}>นวนคร</th>
                                <th className="fixed-width" style={{ background: 'rgba(0,0,0,0.02)' }}>รวม</th>
                                {pendingUnits.map(u => <th key={u} className="fixed-width">{u}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {displayRows.length === 0 ? (
                                <tr><td colSpan={11 + pendingUnits.length} style={{ textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</td></tr>
                            ) : displayRows.map(matDesc => {
                                const [material, description] = matDesc.split('|');
                                const d = pivotData[matDesc];
                                const materialPrg = prgMap[material] || '-';
                                const matNorm = normalizeMaterial(material);
                                const prVal = prMap[matNorm] || 0;
                                const poVal = poMap[material] || 0;
                                const detail = poDetailMap[material] || {};
                                const nawaVal = nawaMap[material] || 0;

                                return (
                                    <tr key={matDesc}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{material}</td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'left' }}>{description}</td>
                                        <td style={{ textAlign: 'center', color: materialPrg === 'ในประเทศ' ? '#0d6efd' : materialPrg === 'ต่างประเทศ' ? '#dc3545' : '#fd7e14', fontWeight: 'bold' }}>{materialPrg}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {prVal > 0 ? <span className="request-pill" style={{ backgroundColor: '#e83e8c', color: '#fff', cursor: 'pointer' }}>{prVal}</span> : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {poVal > 0 ? <span className="request-pill" style={{ backgroundColor: '#0d6efd', color: '#fff', cursor: 'pointer' }}>{poVal}</span> : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '11px' }}>{detail.delivDate || '-'}</td>
                                        <td style={{ textAlign: 'center', fontSize: '11px' }}>{detail.poDoc || '-'}</td>
                                        <td style={{ textAlign: 'left', fontSize: '11px' }}>{detail.supplier || '-'}</td>
                                        <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#198754' }}>{detail.qtyDeliv || '-'}</td>
                                        <td style={{ textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>{nawaVal > 0 ? nawaVal : '-'}</td>
                                        <td className="fixed-width" style={{ background: 'rgba(0,0,0,0.02)' }}>
                                            {d.total === 0 ? '-' : <span style={{ backgroundColor: 'var(--danger-color)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 10px', borderRadius: '99px', fontWeight: 'bold', fontSize: '13px' }}>{d.total}</span>}
                                        </td>
                                        {pendingUnits.map(u => (
                                            <td key={u} className="fixed-width" style={{ fontWeight: d[u] > 0 ? 'bold' : 'normal', color: d[u] > 0 ? 'var(--danger-color)' : '#ccc' }}>
                                                {d[u] === 0 ? '-' : d[u]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mobile-deck-list modal-deck-list" style={{ margin: '6px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {displayRows.length === 0 ? (
                        <div className="mobile-deck-empty">ไม่มีข้อมูล</div>
                    ) : displayRows.map(matDesc => {
                        const [material, description] = matDesc.split('|');
                        const d = pivotData[matDesc];
                        const materialPrg = prgMap[material] || '-';
                        const matNorm = normalizeMaterial(material);
                        const prVal = prMap[matNorm] || 0;
                        const poVal = poMap[material] || 0;
                        const detail = poDetailMap[material] || {};
                        const nawaVal = nawaMap[material] || 0;

                        return (
                            <div key={matDesc} className="mobile-deck-card">
                                <div className="deck-top">
                                    <div className="deck-top-left">
                                        <span className="deck-mat">{material}</span>
                                        {materialPrg !== '-' && <span className="deck-type">{materialPrg}</span>}
                                    </div>
                                    <span className="deck-pill dark-red">รวม: {d.total}</span>
                                </div>
                                <div className="deck-mid">
                                    <span className="deck-desc" title={description}>{description}</span>
                                </div>
                                <div className="deck-pills">
                                    {prVal > 0 && <span className="deck-pill pink">PR:{prVal}</span>}
                                    {poVal > 0 && <span className="deck-pill blue">PO:{poVal}</span>}
                                    {nawaVal > 0 && <span className="deck-pill green">นว:{nawaVal}</span>}
                                    {detail.delivDate && detail.delivDate !== '-' && <span className="deck-pill orange">ส่ง:{detail.delivDate}</span>}
                                    {pendingUnits.map(u => d[u] > 0 ? (
                                        <span key={u} className="deck-ans-user">{u}:{d[u]}</span>
                                    ) : null)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ===== Action Modal =====
export function ActionModal({
    isOpen,
    onClose,
    title,
    ticket,
    material,
    children,
    onSubmit,
    onDelete,
    cancelText = "ยกเลิก"
}) {
    if (!isOpen) return null;
    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                <span className="close" onClick={onClose}>×</span>
                <h2>{title}</h2>
                <p style={{ marginBottom: '20px' }}>
                    Ticket: <span style={{ fontWeight: 'bold' }}>{ticket}</span><br />
                    {material && <>Material: <span style={{ fontWeight: 'bold' }}>{material}</span></>}
                </p>
                {children}
                <div style={{ display: 'grid', gridTemplateColumns: onDelete ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                    <button className="action-button" style={{ background: 'var(--success-color)', width: '100%' }} onClick={onSubmit}>
                        <i className="fas fa-check"></i> ตกลง
                    </button>
                    {onDelete && (
                        <button className="action-button" style={{ background: 'var(--danger-color)', width: '100%' }} onClick={onDelete}>
                            <i className="fas fa-trash"></i> ลบ
                        </button>
                    )}
                    <button className="action-button logout-button" style={{ width: '100%', fontSize: '0.9em', padding: '10px 5px' }} onClick={onClose}>
                        <i className="fas fa-times"></i> {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== Outside Request (นอกรอบ) Modal =====
export function OutsideRequestModal({ isOpen, onClose, row, onSubmit }) {
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen || !row) return null;

    const desc = getDesc(row);
    // Parse user object from localStorage
    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : {};

    const userName = userObj.Name || localStorage.getItem('userName') || 'ไม่ระบุ';
    const employeeCode = userObj.IDRec || localStorage.getItem('username') || '-';
    const rowIdPlant = row["IDPlant"] || PLANT_MAPPING[(row["ค้างหน่วยงาน"] || "").toString().trim()] || "";
    const userPlant = rowIdPlant || userObj.Plant || localStorage.getItem('userPlant') || '-';

    const customer = `${row["Team"] || "-"} (${row["Brand"] || "-"})`;
    const defaultPhone = "0909082850";

    const handleSubmit = async () => {
        if (quantity < 1 || isNaN(quantity)) {
            alert('กรุณากรอกจำนวนที่ถูกต้อง (อย่างน้อย 1)');
            return;
        }

        setIsSubmitting(true);
        // Construct payload matching the original gasUrl expectations
        const payload = {
            material: row["Material"] || "-",
            description: desc || "-",
            quantity: quantity,
            contact: defaultPhone,
            employeeCode: employeeCode,
            team: customer,
            employeeName: userName,
            callNumber: row["Ticket Number"] || "-",
            callType: row["Call Type"] || "-",
            remark: "",
            status: "รอเบิก",
            plant: userPlant
        };

        try {
            await onSubmit(payload);
            setIsSubmitting(false);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 500); // Wait 500ms to show success checkmark before closing
        } catch (err) {
            console.error('Outside request failed:', err);
            setIsSubmitting(false);
            alert(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    return (
        <div className="modal" onClick={(e) => e.target.className.includes('modal') && onClose()}>
            <div className="modal-content compact-modal" style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '20px',
                    color: 'white',
                    position: 'relative'
                }}>
                    <span className="close" onClick={onClose} style={{ color: 'white', position: 'absolute', top: '15px', right: '20px', textShadow: 'none' }}>×</span>
                    <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}>
                        <i className="fas fa-shopping-cart" style={{ marginRight: '8px' }}></i> เบิกอะไหล่นอกรอบ
                    </h3>

                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>Material:</strong>
                                <span style={{ textAlign: 'right', flex: 1 }}>{row["Material"] || "-"}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>Description:</strong>
                                <span style={{ textAlign: 'right', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }} title={desc}>{desc || "-"}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>Ticket Number:</strong>
                                <span style={{ textAlign: 'right', flex: 1 }}>{row["Ticket Number"] || "-"}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>Call Type:</strong>
                                <span style={{ textAlign: 'right', flex: 1 }}>{row["Call Type"] || "-"}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>User:</strong>
                                <span style={{ textAlign: 'right', flex: 1 }}>{userName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>Plant:</strong>
                                <span style={{ textAlign: 'right', flex: 1 }}>{userPlant}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>Customer:</strong>
                                <span style={{ textAlign: 'right', flex: 1, fontWeight: 'bold' }}>{customer}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <strong style={{ color: '#ffd700' }}>เบอร์ติดต่อ:</strong>
                                <span style={{ textAlign: 'right', flex: 1, fontWeight: 'bold' }}>{defaultPhone}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="outside-quantity" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>จำนวน:</label>
                        <input
                            type="number"
                            id="outside-quantity"
                            value={quantity}
                            min="1"
                            onChange={(e) => setQuantity(parseInt(e.target.value) || '')}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: 'none',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.9)',
                                fontSize: '16px',
                                color: '#333',
                                outline: 'none',
                                boxSizing: 'border-box',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || isSuccess}
                            style={{
                                padding: '10px 20px',
                                background: isSuccess ? '#198754' : (isSubmitting ? '#6c757d' : '#28a745'),
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: (isSubmitting || isSuccess) ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                minWidth: '90px',
                                justifyContent: 'center'
                            }}
                        >
                            {isSubmitting ? (
                                <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                            ) : isSuccess ? (
                                <><i className="fas fa-check"></i> สำเร็จ</>
                            ) : (
                                "ยืนยัน"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== Sticker Print Modal (80x100 mm) =====
export function StickerModal({ isOpen, onClose, row }) {
    const [qrCode, setQrCode] = useState({ material: '', url: '' });
    const material = (row?.["Material"] || "").toString().trim();

    useEffect(() => {
        let isMounted = true;
        if (isOpen && material) {
            QRCode.toDataURL(material, {
                margin: 0,
                width: 100,
                errorCorrectionLevel: 'M'
            })
            .then(url => {
                if (isMounted) setQrCode({ material, url });
            })
            .catch(err => {
                console.error("QR Code error:", err);
            });
        }
        return () => { isMounted = false; };
    }, [isOpen, material]);

    if (!isOpen || !row) return null;

    const qrCodeUrl = qrCode.material === material ? qrCode.url : '';
    const handlePrint = () => {
        printStickers(row);
    };

    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content sticker-modal-content" style={{ maxWidth: '400px' }}>
                <span className="close" onClick={onClose}>×</span>
                <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>ตัวอย่างสติกเกอร์ (80x100 mm)</h3>

                <div id="sticker-preview" className="sticker-preview-box">
                    <div className="sticker-mockup">
                        <div className="sticker-mockup-header">SPARE PART STICKER</div>
                        <div className="sticker-mockup-ticket">{row["Ticket Number"] || "-"}</div>
                        <div className="sticker-mockup-field highlight-field">
                            <strong>Store Name:</strong> <span className="highlight-value">{row["Brand"] || "-"}</span>
                        </div>
                        <div className="sticker-mockup-field highlight-field">
                            <strong>Team:</strong> <span className="highlight-value">{row["Team"] || "-"}</span>
                        </div>

                        {/* Material & QR Row */}
                        <div className="sticker-mockup-mat-qr">
                            <div className="mat-info">
                                <div className="mat-label">Material:</div>
                                <div className="mat-val">{row["Material"] || "-"}</div>
                            </div>
                            {qrCodeUrl && (
                                <div className="qr-box">
                                    <img src={qrCodeUrl} alt="Material QR" />
                                </div>
                            )}
                        </div>

                        {/* Desc Block */}
                        <div className="sticker-mockup-desc">
                            <div className="desc-label">Desc:</div>
                            <div className="desc-val">{getDesc(row)}</div>
                        </div>

                        <div className="sticker-mockup-footer">
                            <div className="footer-label">ศูนย์พื้นที่:</div>
                            <div className="footer-value">{getCleanTeamPlant(row["TeamPlant"])}</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button className="action-button" style={{ flex: 1, backgroundColor: 'var(--success-color)' }} onClick={handlePrint}>
                        <i className="fas fa-print"></i> พิมพ์สติกเกอร์
                    </button>
                    <button className="action-button logout-button" style={{ flex: 1 }} onClick={onClose}>
                        <i className="fas fa-times"></i> ปิด
                    </button>
                </div>
            </div>
        </div>
    );
}
// ===== Update Guide Modal =====
export function UpdateGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const steps = [
        "ดึงข้อมูล Call ค้างทั้งหมด (หัวข้อที่ 3: รายการงานสำหรับติดตาม Call ค้าง และ OverP)",
        "ไม่ต้องใส่อะไร แล้วกดปุ่ม \"ค้นหา\"",
        "หน้า Call แสดงข้อมูลทั้งหมด กดปุ่ม \"Excel\" เพื่อดาวน์โหลด",
        "กลับมาที่หน้าคลังสินค้า Dashboard Call แล้วกดปุ่ม \"Data\"",
        "เปิดไฟล์ปลายทาง แล้ว Import ข้อมูลจาก Excel ที่ดาวน์โหลด",
        "เลือก Import > Upload > เลือกไฟล์ Excel > แทนที่สเปรดชีต > ตกลง",
        "รอระบบรีเฟรชประมาณ 15 วินาที จากนั้นปิดไฟล์ เป็นอันเสร็จ"
    ];

    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content premium-modal-content" style={{ maxWidth: '550px' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-info-circle" style={{ marginRight: 10 }}></i> วิธีอัพข้อมูล</h3>
                    <span className="premium-modal-close" onClick={onClose}>&times;</span>
                </div>
                <div className="premium-modal-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {steps.map((step, index) => (
                            <div key={index} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                <div style={{
                                    minWidth: '28px',
                                    height: '28px',
                                    background: 'var(--info-color)',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    {index + 1}
                                </div>
                                <div style={{ fontSize: '15px', color: '#2c3e50', lineHeight: '1.4', paddingTop: '4px' }}>
                                    {step}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                        <button
                            className="action-button"
                            style={{
                                padding: '12px 40px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #28a745, #218838)',
                                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                                border: 'none'
                            }}
                            onClick={onClose}
                        >
                            เข้าใจไหม
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
