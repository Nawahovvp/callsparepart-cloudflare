import React, { useState, useMemo } from 'react';
import { normalizeMaterial, matchesDeptGroup, DEPT_GROUPS } from '../utils/helpers';
import { PoDetailsModal, PrDetailsModal, OtherPlantModal } from './TableModals';
import { computeSpareSummaryData } from '../utils/syncHelpers';

export default function SpareSummaryPage({ data = [], rawSources = {}, isLoading, onClose }) {
    const [deptGroupFilter, setDeptGroupFilter] = useState('Stock'); // Default to Stock always
    const [prgFilter, setPrgFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');

    const handleDeptGroupChange = (val) => {
        setDeptGroupFilter(val);
        setSupplierFilter('');
    };

    // Modal states
    const [poModal, setPoModal] = useState({ open: false, row: null });
    const [prModal, setPrModal] = useState({ open: false, row: null });
    const [otherPlantModal, setOtherPlantModal] = useState({ open: false, row: null });

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
            // must pass nawa filter
            const nawaVal = nawaMap[material] || 0;
            if (pivotData[matDesc].total <= nawaVal && nawaVal > 0) return;
            // must match PRG filter
            if (prgFilter && prgMap[material] !== prgFilter) return;
            const detail = poDetailMap[material];
            if (detail && detail.supplier && detail.supplier !== '-') {
                opts.add(detail.supplier);
            }
        });
        return [...opts].sort();
    }, [computedData, prgFilter]);

    const displayRows = useMemo(() => {
        if (!computedData) return [];
        const { sortedMaterials, pivotData, prgMap, poDetailMap, nawaMap } = computedData;

        return sortedMaterials.filter(matDesc => {
            const [material] = matDesc.split('|');
            const nawaVal = nawaMap[material] || 0;
            const total = pivotData[matDesc].total;

            if (total <= nawaVal && nawaVal > 0) return false;
            if (prgFilter && prgMap[material] !== prgFilter) return false;
            if (supplierFilter) {
                const detail = poDetailMap[material];
                if (!detail || detail.supplier !== supplierFilter) return false;
            }
            return true;
        });
    }, [computedData, prgFilter, supplierFilter]);

    if (isLoading && (!data || data.length === 0)) {
        return (
            <div className="spare-page-container" style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', flexDirection: 'column', background: 'var(--bg-color)',
                overflow: 'hidden', position: 'relative'
            }}>
                <style>{`
                    @keyframes sp-cw   { to { transform: rotate(360deg); } }
                    @keyframes sp-ccw  { to { transform: rotate(-360deg); } }
                    @keyframes sp-pulse {
                        0%,100% { box-shadow: 0 0 0 0 rgba(0,123,255,0.5); transform: scale(1); }
                        50%     { box-shadow: 0 0 28px 10px rgba(0,123,255,0.12); transform: scale(1.07); }
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
                        10%  { opacity: 0.55; }
                        90%  { opacity: 0.55; }
                        100% { transform: translateY(-90px) translateX(15px); opacity: 0; }
                    }
                    @keyframes sp-fadein {
                        from { opacity: 0; transform: translateY(18px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                `}</style>

                {[...Array(9)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
                        width: `${7 + (i % 4) * 4}px`, height: `${7 + (i % 4) * 4}px`,
                        background: i % 3 === 0 ? 'rgba(0,123,255,0.22)' : i % 3 === 1 ? 'rgba(253,126,20,0.18)' : 'rgba(25,135,84,0.18)',
                        left: `${8 + i * 10}%`, bottom: `${12 + (i % 4) * 7}%`,
                        animation: `sp-float ${2.8 + i * 0.35}s ease-in-out ${i * 0.28}s infinite`
                    }} />
                ))}

                <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 38 }}>
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: '3.5px solid transparent',
                        borderTopColor: '#007bff', borderRightColor: 'rgba(0,123,255,0.25)',
                        animation: 'sp-cw 1.4s linear infinite'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 18, borderRadius: '50%',
                        border: '3.5px solid transparent',
                        borderTopColor: '#fd7e14', borderLeftColor: 'rgba(253,126,20,0.25)',
                        animation: 'sp-ccw 1.0s linear infinite'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 36, borderRadius: '50%',
                        border: '3.5px solid transparent',
                        borderTopColor: '#198754', borderRightColor: 'rgba(25,135,84,0.25)',
                        animation: 'sp-cw 0.7s linear infinite'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 53, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'sp-pulse 2s ease-in-out infinite'
                    }}>
                        <i className="fas fa-boxes-stacked" style={{ fontSize: 22, color: '#fff' }} />
                    </div>
                </div>

                <div style={{ textAlign: 'center', animation: 'sp-fadein 0.7s ease both' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.4px' }}>
                        กำลังเตรียมข้อมูลอะไหล่
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 26 }}>
                        รวบรวม PR · PO · Stock นวนคร · แต่ละสาขา
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                        {['#007bff', '#fd7e14', '#198754'].map((c, i) => (
                            <span key={i} style={{
                                display: 'inline-block', width: 10, height: 10,
                                borderRadius: '50%', background: c,
                                animation: `sp-bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                            }} />
                        ))}
                    </div>
                    <div style={{
                        width: 280, height: 4, borderRadius: 999,
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
        );
    }


    const pivotData = computedData?.pivotData || {};
    const pendingUnits = computedData?.pendingUnits || [];
    const totalQuantity = computedData?.totalQuantity || 0;
    const topMaterial = computedData?.topMaterial || '-';
    const prgMap = computedData?.prgMap || {};
    const prMap = computedData?.prMap || {};
    const poMap = computedData?.poMap || {};
    const poDetailMap = computedData?.poDetailMap || {};
    const nawaMap = computedData?.nawaMap || {};
    const prgOptions = computedData?.prgOptions || [];

    const exportCSV = () => {
        if (!computedData || displayRows.length === 0) return;
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
        link.download = `spare_summary_${deptGroupFilter || 'all'}.csv`;
        link.click();
    };

    return (
        <div className="spare-page-container" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div className="premium-modal-content" style={{ width: '100%', margin: '0', animation: 'none', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-list-alt" style={{ marginRight: 10 }}></i> สรุปรายการอะไหล่รอของเข้า (Standalone Page)</h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => window.print()} className="detail-button" style={{ background: 'rgba(255,255,255,0.2)', fontSize: '14px', padding: '10px 20px' }}>
                            <i className="fas fa-print"></i> พิมพ์
                        </button>
                        <button onClick={onClose} className="premium-modal-close" title="ปิดหน้านี้">&times;</button>
                    </div>
                </div>

                <div className="premium-modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 0 }}>
                    {/* Filters & Actions Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div className="modal-info-bar" style={{ margin: 0, padding: '5px 15px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <div className="modal-info-item">
                                    <i className="fas fa-layer-group" style={{ color: 'var(--info-color, #0d6efd)' }}></i>
                                    <span className="modal-info-label">กลุ่ม:</span>
                                    <select value={deptGroupFilter} onChange={(e) => handleDeptGroupChange(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                                        <option value="">ทั้งหมด</option>
                                        {DEPT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                                    </select>
                                </div>
                                <div className="modal-info-item" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: 15 }}>
                                    <i className="fas fa-filter" style={{ color: 'var(--info-color)' }}></i>
                                    <span className="modal-info-label">PRG:</span>
                                    <select value={prgFilter} onChange={(e) => setPrgFilter(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                                        <option value="">ทั้งหมด</option>
                                        {prgOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="modal-info-item" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: 15 }}>
                                    <i className="fas fa-truck" style={{ color: 'var(--success-color)' }}></i>
                                    <span className="modal-info-label">Supplier:</span>
                                    <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', maxWidth: '200px' }}>
                                        <option value="">ทั้งหมด</option>
                                        {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Group Filter Pills */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleDeptGroupChange('')}
                                    style={{
                                        border: 'none',
                                        borderRadius: '16px',
                                        padding: '5px 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: deptGroupFilter === '' ? '#0d6efd' : 'rgba(0,0,0,0.06)',
                                        color: deptGroupFilter === '' ? '#fff' : 'var(--text-primary)',
                                        boxShadow: deptGroupFilter === '' ? '0 2px 6px rgba(13,110,253,0.35)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ทั้งหมด
                                </button>
                                {DEPT_GROUPS.map(g => {
                                    const isActive = deptGroupFilter === g.key;
                                    return (
                                        <button
                                            key={g.key}
                                            onClick={() => handleDeptGroupChange(g.key)}
                                            style={{
                                                border: 'none',
                                                borderRadius: '16px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: isActive ? '#0d6efd' : 'rgba(0,0,0,0.06)',
                                                color: isActive ? '#fff' : 'var(--text-primary)',
                                                boxShadow: isActive ? '0 2px 6px rgba(13,110,253,0.35)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {g.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={exportCSV} className="action-button" style={{ background: '#198754' }} disabled={!computedData || displayRows.length === 0}>
                                <i className="fas fa-file-csv"></i> Export CSV
                            </button>
                        </div>
                    </div>

                    {(!computedData || displayRows.length === 0) ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                            <i className="fas fa-box-open" style={{ fontSize: 56, opacity: 0.3, marginBottom: 16 }}></i>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                                ไม่พบรายการอะไหล่รอของเข้า {deptGroupFilter ? `สำหรับกลุ่ม "${deptGroupFilter}"` : ''}
                            </h3>
                            <p style={{ fontSize: '13px', margin: 0, opacity: 0.85 }}>ลองเลือกดูข้อมูลกลุ่มอื่น หรือกดปุ่ม "ทั้งหมด" ด้านบน</p>
                            {deptGroupFilter && (
                                <button
                                    onClick={() => handleDeptGroupChange('')}
                                    className="action-button"
                                    style={{ marginTop: 18, background: '#0d6efd', padding: '8px 20px', fontSize: '13px' }}
                                >
                                    <i className="fas fa-layer-group" style={{ marginRight: 6 }}></i> แสดงข้อมูลทุกกลุ่ม
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Quick Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginBottom: 20 }}>
                        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(0,123,255,0.1)', color: 'var(--info-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className="fas fa-box"></i>
                            </div>
                            <div>
                                <div className="stat-label">จำนวนรายการ</div>
                                <div className="stat-value" style={{ fontSize: 20, fontWeight: 800 }}>{displayRows.length}</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(40,167,69,0.1)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className="fas fa-boxes-stacked"></i>
                            </div>
                            <div>
                                <div className="stat-label">จำนวนชิ้นรวม</div>
                                <div className="stat-value" style={{ fontSize: 20, fontWeight: 800 }}>{totalQuantity}</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 15, gridColumn: 'span 1' }}>
                            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(220,53,69,0.1)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className="fas fa-fire"></i>
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div className="stat-label">รอมากที่สุด</div>
                                <div className="stat-value" style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topMaterial}</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Table Content */}
                    <div className="compact-table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
                        <table className="compact-table ultra-compact">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ width: '1%' }}>Material</th>
                                    <th style={{ textAlign: 'left' }}>Description</th>
                                    <th style={{ textAlign: 'center', width: '1%' }}>PRG</th>
                                    <th className="narrow-cell">PR</th>
                                    <th className="narrow-cell">PO</th>
                                    <th style={{ textAlign: 'center', width: '1%' }}>กำหนดส่ง</th>
                                    <th style={{ textAlign: 'left' }}>Supplier</th>
                                    <th style={{ textAlign: 'left' }}>PO Document</th>
                                    <th className="narrow-cell">จำนวนส่ง</th>
                                    <th className="narrow-cell">นวนคร</th>
                                    <th className="narrow-cell" style={{ background: 'rgba(0,123,255,0.1)', color: 'var(--info-color)' }}>รวม</th>
                                    {pendingUnits.map(u => <th key={u} className="narrow-cell">{u}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.map(matDesc => {
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
                                            <td style={{ fontWeight: 700, color: 'var(--info-color)' }}>{material}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{description}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '1px 6px', borderRadius: 4,
                                                    background: materialPrg === 'ในประเทศ' ? 'rgba(13,110,253,0.1)' : materialPrg === 'ต่างประเทศ' ? 'rgba(220,53,69,0.1)' : 'rgba(0,0,0,0.05)',
                                                    color: materialPrg === 'ในประเทศ' ? '#0d6efd' : materialPrg === 'ต่างประเทศ' ? '#dc3545' : 'inherit',
                                                    fontWeight: 600, fontSize: '10.5px', display: 'inline-block'
                                                }}>
                                                    {materialPrg}
                                                </span>
                                            </td>
                                            <td className="narrow-cell">
                                                {prVal > 0 ? (
                                                    <span className="request-pill" style={{ cursor: 'pointer', background: '#e83e8c' }}
                                                        onClick={() => setPrModal({ open: true, row: { Material: material, Description: description } })}>
                                                        {prVal}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="narrow-cell">
                                                {poVal > 0 ? (
                                                    <span className="request-pill" style={{ cursor: 'pointer', background: '#0d6efd' }}
                                                        onClick={() => setPoModal({ open: true, row: { Material: material, Description: description } })}>
                                                        {poVal}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {detail.delivDate !== '-' ? (
                                                    <span style={{ fontWeight: 600 }}>{detail.delivDate}</span>
                                                ) : '-'}
                                            </td>
                                            <td title={detail.supplier}>
                                                {detail.supplier}
                                            </td>
                                            <td style={{ textAlign: 'left' }}>
                                                {detail.poDoc}
                                            </td>
                                            <td className="narrow-cell" style={{ fontWeight: 700, color: detail.qtyDeliv !== '-' ? '#198754' : '#ccc' }}>
                                                {detail.qtyDeliv}
                                            </td>
                                            <td className="narrow-cell" style={{ fontWeight: 700, color: nawaVal > 0 ? '#1a237e' : '#ccc' }}>
                                                {nawaVal > 0 ? nawaVal : '-'}
                                            </td>
                                            <td className="narrow-cell" style={{ background: 'rgba(0,123,255,0.03)' }}>
                                                <span style={{
                                                    background: 'var(--danger-color)', color: '#fff',
                                                    padding: '1px 5px', borderRadius: 10, fontWeight: 800, fontSize: '10px'
                                                }}>
                                                    {d.total}
                                                </span>
                                            </td>
                                            {pendingUnits.map(u => (
                                                <td key={u} className="narrow-cell" style={{
                                                    fontWeight: d[u] > 0 ? 700 : 400,
                                                    color: d[u] > 0 ? 'var(--text-primary)' : '#eee',
                                                    background: d[u] > 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                                                    cursor: d[u] > 0 ? 'pointer' : 'default'
                                                }} onClick={() => d[u] > 0 && setOtherPlantModal({ open: true, row: { Material: material, Description: description } })}>
                                                    {d[u] === 0 ? '-' : d[u]}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                        </>
                    )}
                </div>
            </div>

            {/* Redesigned Modals Integration */}
            <PoDetailsModal
                isOpen={poModal.open}
                onClose={() => setPoModal({ open: false, row: null })}
                material={poModal.row?.["Material"]}
                description={poModal.row?.["Description"]}
                poRawData={rawSources.poRawData}
                nawaRawData={rawSources.nawaRawData}
            />
            <PrDetailsModal
                isOpen={prModal.open}
                onClose={() => setPrModal({ open: false, row: null })}
                material={prModal.row?.["Material"]}
                description={prModal.row?.["Description"]}
                prRawData={rawSources.prRawData}
            />
            <OtherPlantModal
                isOpen={otherPlantModal.open}
                onClose={() => setOtherPlantModal({ open: false, row: null })}
                material={otherPlantModal.row?.["Material"]}
                description={otherPlantModal.row?.["Description"]}
                plantStockData={rawSources.plantStockData}
            />

        </div>
    );
}
