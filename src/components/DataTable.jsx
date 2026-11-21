import React from 'react';
import { TABLE_COLUMNS } from '../utils/helpers';

const HIDDEN_COLUMN_KEYS = new Set(['StockStartDate', 'Answer1', 'IDPlant', 'Equipment']);
const COLUMNS = TABLE_COLUMNS.filter(({ key }) => !HIDDEN_COLUMN_KEYS.has(key));

const MERGEABLE_COLUMNS = {
    StatusGroup: (row) => `${row['StatusCall'] ?? ''}__${row._isManualStatusCall ? '1' : '0'}`,
    DayRepair: (row) => (!isNaN(parseFloat(row['DayRepair'])) ? String(Math.floor(parseFloat(row['DayRepair']))) : '-'),
    DateTime: (row) => String(extractDate(row['DateTime']) ?? ''),
    Brand: (row) => String(row['Brand'] ?? '').trim(),
    'Call Type': (row) => String(row['Call Type'] ?? '').trim(),
    Team: (row) => String(row['Team'] ?? '').trim(),
    TeamPlant: (row) => cleanTeamPlant(row['TeamPlant']),
    'ค้างหน่วยงาน': (row) => String(row['ค้างหน่วยงาน'] ?? '').trim(),
    'Ticket Number': (row) => String(row['Ticket Number'] ?? '').trim(),
    PendingStockDays: (row) => (!row['PendingStockDays'] || row['PendingStockDays'] === '0' || row['PendingStockDays'] === '-') ? '0' : String(row['PendingStockDays']).trim(),
    'คลังตอบ': (row) => String(row['คลังตอบ'] ?? '').trim(),
    'วันที่ตอบ': (row) => formatAnswerDate(row['วันที่ตอบ']),
    UserAns: (row) => `${String(row['UserAns'] ?? '').trim()}__${String(row['คลังตอบ'] ?? '').trim()}`
};

function getTicketKey(row) {
    const ticket = String(row?.['Ticket Number'] ?? '').trim();
    return ticket && ticket !== '-' ? ticket : '';
}

function computeRowSpans(rows) {
    const mergeKeys = Object.keys(MERGEABLE_COLUMNS);
    const spans = rows.map(() => {
        const obj = {};
        mergeKeys.forEach((k) => { obj[k] = 1; });
        return obj;
    });

    let i = 0;
    while (i < rows.length) {
        const ticketKey = getTicketKey(rows[i]);
        if (!ticketKey) {
            i += 1;
            continue;
        }
        let j = i + 1;
        while (j < rows.length && getTicketKey(rows[j]) === ticketKey) {
            j += 1;
        }
        if (j - i > 1) {
            mergeKeys.forEach((colKey) => {
                const getter = MERGEABLE_COLUMNS[colKey];
                let start = i;
                while (start < j) {
                    const baseVal = getter(rows[start]);
                    let end = start + 1;
                    while (end < j && getter(rows[end]) === baseVal) {
                        end += 1;
                    }
                    const runLen = end - start;
                    if (runLen > 1) {
                        spans[start][colKey] = runLen;
                        for (let k = start + 1; k < end; k++) {
                            spans[k][colKey] = 0;
                        }
                    }
                    start = end;
                }
            });
        }
        i = j;
    }

    return spans;
}

function addTicketGroupClasses(data) {
    let lastTicket = null;
    let isEvenGroup = false;
    return data.map((row) => {
        const currentTicket = row['Ticket Number'];
        if (currentTicket !== lastTicket) {
            isEvenGroup = !isEvenGroup;
            lastTicket = currentTicket;
        }
        return { ...row, _groupClass: isEvenGroup ? 'row-group-even' : 'row-group-odd' };
    });
}

export default function DataTable({
    data = [],
    isLoading,
    sortConfig,
    onSort,
    selectedRows,
    onSelectAll,
    onSelectRow,
    currentPage,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    totalPages,
    onPoClick,
    onPrClick,
    onOtherPlantClick,
    onRebuiltClick,
    onStatusXClick,
    onStatusGroupClick,
    onDetailClick,
    onNawaClick,
    onTicketClick,
    onEngClick
}) {
    const dataWithGroup = React.useMemo(() => addTicketGroupClasses(data), [data]);
    const rowSpans = React.useMemo(() => computeRowSpans(dataWithGroup), [dataWithGroup]);

    const mobileDeckGroups = React.useMemo(() => {
        const groups = [];
        const map = new Map();
        dataWithGroup.forEach((row, idx) => {
            const ticketKey = String(row['Ticket Number'] || `__row_${idx}`);
            let group = map.get(ticketKey);
            if (!group) {
                group = { ticket: row['Ticket Number'], head: row, items: [] };
                map.set(ticketKey, group);
                groups.push(group);
            }
            group.items.push(row);
        });
        return groups;
    }, [dataWithGroup]);

    return (
        <>
            <div className="table-container desktop-table-wrap">
                <table id="data-table" className="compact">
                    <thead>
                        <tr>
                            <th style={{ width: 28, minWidth: 28, textAlign: 'center' }}>
                                <input type="checkbox" onChange={onSelectAll} />
                            </th>
                            {COLUMNS.map(col => (
                                <th
                                    key={col.key}
                                    data-column={col.key}
                                    className="sortable"
                                    onClick={() => onSort(col.key)}
                                >
                                    {col.label}
                                    {sortConfig?.key === col.key && (
                                        <span className="arrow">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </th>
                            ))}
                            <th data-column="detail" style={{ width: 70, minWidth: 70 }}>รายละเอียด</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr key="loading">
                                <td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center', padding: '60px 0' }}>
                                    <div className="premium-loader-wrapper">
                                        <div className="master-loader"></div>
                                        <div className="loader-text-premium">กำลังโหลดข้อมูล...</div>
                                    </div>
                                </td>
                            </tr>
                        ) : dataWithGroup.length === 0 ? (
                            <tr><td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center' }}>ไม่พบข้อมูล</td></tr>
                        ) : (
                            dataWithGroup.map((row, index) => {
                                const nawaVal = pf(row['Nawa']);
                                const vipaVal = pf(row['Vipa']);
                                const requestVal = pf(row['Request']);
                                const qtyPlantVal = pf(row['QtyPlant']);
                                const otherPlantVal = pf(row['OtherPlant']);
                                const prVal = pf(row['PR']);
                                const poVal = pf(row['PO']);
                                const statusXVal = row['StatusX'] || row['StatusCall'] || '';
                                const pendingUnit = (row['ค้างหน่วยงาน'] || '').trim();
                                const teamPlantCleaned = cleanTeamPlant(row['TeamPlant']);
                                const materialVal = (row['Material'] || '').toString().trim();
                                const descVal = (row['Description'] || '').toString().trim();
                                const isMismatchVipa = pendingUnit === 'Stock วิภาวดี 62'
                                    && teamPlantCleaned !== 'วิภาวดี 62'
                                    && materialVal !== '' && materialVal !== '-'
                                    && descVal !== '' && descVal !== '-';
                                const paddingClass = row._highlight ? `row-pulse-${row._highlight}` : '';
                                const rowClassName = [row._groupClass, paddingClass].filter(Boolean).join(' ');
                                const spans = rowSpans[index] || {};
                                const mergedProps = (colKey, extraClass = '') => {
                                    const span = spans[colKey] ?? 1;
                                    const cls = [extraClass, span > 1 ? 'merged-ticket-cell' : ''].filter(Boolean).join(' ');
                                    return {
                                        rowSpan: span > 1 ? span : undefined,
                                        className: cls || undefined
                                    };
                                };
                                return (
                                    <tr key={row.id || index} className={rowClassName}>
                                        <td style={{ textAlign: 'center', width: 28 }}>
                                            <input type="checkbox" checked={selectedRows?.includes(row.id)} onChange={() => onSelectRow(row.id)} />
                                        </td>
                                        {/* StatusGroup */}
                                        {spans['StatusGroup'] > 0 && (
                                            <td data-column="StatusGroup" {...mergedProps('StatusGroup', row._isManualStatusCall ? 'manual-indicator' : '')}>
                                                <span style={{
                                                    cursor: 'pointer', textDecoration: 'underline',
                                                    color: getStatusColor(row['StatusCall']), fontWeight: 'bold'
                                                }} onClick={(e) => { e.stopPropagation(); onStatusGroupClick?.(row); }}>
                                                    {row['StatusCall']}
                                                </span>
                                                {row._isManualStatusCall && <span className="manual-pill">Manual</span>}
                                            </td>
                                        )}
                                        {/* DayRepair */}
                                        {spans['DayRepair'] > 0 && (
                                            <td data-column="DayRepair" {...mergedProps('DayRepair')} style={{ textAlign: 'center' }}>
                                                {!isNaN(parseFloat(row['DayRepair'])) ? Math.floor(parseFloat(row['DayRepair'])) : '-'}
                                            </td>
                                        )}
                                        {spans['DateTime'] > 0 && (
                                            <td data-column="DateTime" {...mergedProps('DateTime')}>{extractDate(row['DateTime'])}</td>
                                        )}
                                        {spans['Brand'] > 0 && (
                                            <td data-column="Brand" {...mergedProps('Brand')}>{row['Brand']}</td>
                                        )}
                                        {spans['Call Type'] > 0 && (
                                            <td data-column="Call Type" {...mergedProps('Call Type')}>{row['Call Type']}</td>
                                        )}
                                        {spans['Team'] > 0 && (
                                            <td data-column="Team" {...mergedProps('Team')}>{row['Team']}</td>
                                        )}
                                        {spans['TeamPlant'] > 0 && (
                                            <td data-column="TeamPlant" {...mergedProps('TeamPlant')}>{cleanTeamPlant(row['TeamPlant'])}</td>
                                        )}
                                        {spans['ค้างหน่วยงาน'] > 0 && (
                                            <td data-column="ค้างหน่วยงาน" {...mergedProps('ค้างหน่วยงาน')}>{row['ค้างหน่วยงาน']}</td>
                                        )}
                                        {spans['Ticket Number'] > 0 && (
                                            <td data-column="Ticket Number" {...mergedProps('Ticket Number')}>
                                                <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#0d6efd', fontWeight: 'bold' }}
                                                    onClick={(e) => { e.stopPropagation(); onTicketClick?.(row); }}>
                                                    {row['Ticket Number']}
                                                </span>
                                            </td>
                                        )}
                                        <td data-column="Material" style={isMismatchVipa ? { textDecoration: 'line-through', color: 'var(--danger-color)', fontWeight: 'bold' } : undefined}>{row['Material']}</td>
                                        <td data-column="Description" style={isMismatchVipa ? { textDecoration: 'line-through', color: 'var(--danger-color)', fontWeight: 'bold' } : undefined}>{row['Description']}</td>
                                        {/* Rebuilt */}
                                        <td data-column="Rebuilt" style={{ textAlign: 'center' }}>
                                            {row['Rebuilt'] && String(row['Rebuilt']).trim() !== '-' && String(row['Rebuilt']).trim() !== '0' ? (
                                                <span className="request-pill" style={{ backgroundColor: '#0d6efd', color: '#fff', cursor: 'pointer' }}
                                                    title="คลิกเพื่อดูสต็อกพื้นที่อื่นของอะไหล่ทดแทน"
                                                    onClick={(e) => { e.stopPropagation(); onRebuiltClick?.(row); }}>{row['Rebuilt']}</span>
                                            ) : ''}
                                        </td>
                                        <td data-column="จำนวน" style={{ textAlign: 'center' }}>
                                            {row['จำนวน'] !== undefined && row['จำนวน'] !== null && row['จำนวน'] !== '' ? (
                                                <span className="request-pill" style={{ backgroundColor: '#8b0000', color: '#fff' }}>
                                                    {row['จำนวน']}
                                                </span>
                                            ) : ''}
                                        </td>
                                        {/* PR */}
                                        <td data-column="PR" style={{ textAlign: 'center' }}>
                                            {prVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#e83e8c', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onPrClick?.(row); }}>{row['PR']}</span>
                                            ) : ''}
                                        </td>
                                        {/* PO */}
                                        <td data-column="PO" style={{ textAlign: 'center' }}>
                                            {poVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#0d6efd', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onPoClick?.(row); }}>{row['PO']}</span>
                                            ) : ''}
                                        </td>
                                        {/* Nawa */}
                                        <td data-column="Nawa" style={{ textAlign: 'center' }}>
                                            {nawaVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: 'var(--success-color)', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onNawaClick?.(row); }}>{row['Nawa']}</span>
                                            ) : ''}
                                        </td>
                                        {/* Vipa */}
                                        <td data-column="Vipa" style={{ textAlign: 'center' }}>
                                            {vipaVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#fd7e14', color: '#fff' }}>{row['Vipa']}</span>
                                            ) : ''}
                                        </td>
                                        {/* Request */}
                                        <td data-column="Request" style={{ textAlign: 'center' }}>
                                            {requestVal > 0 ? (<span className="request-pill">{row['Request']}</span>) : ''}
                                        </td>
                                        {/* EngQty (ช่าง) */}
                                        <td data-column="EngQty" style={{ textAlign: 'center' }}>
                                            {pf(row['EngQty']) > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: row['hasMatchingEngTeam'] ? '#fd7e14' : '#17a2b8', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onEngClick?.(row); }}>{row['EngQty']}</span>
                                            ) : ''}
                                        </td>
                                        {/* QtyPlant */}
                                        <td data-column="QtyPlant" style={{ textAlign: 'center' }}>
                                            {qtyPlantVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#6f42c1', color: '#fff' }}>{row['QtyPlant']}</span>
                                            ) : ''}
                                        </td>
                                        {/* OtherPlant */}
                                        <td data-column="OtherPlant" style={{ textAlign: 'center' }}>
                                            {otherPlantVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#e91e63', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onOtherPlantClick?.(row); }}>{row['OtherPlant']}</span>
                                            ) : ''}
                                        </td>
                                        {/* PendingStockDays */}
                                        {spans['PendingStockDays'] > 0 && (
                                            <td data-column="PendingStockDays" {...mergedProps('PendingStockDays')} style={{ fontWeight: 'bold', color: 'var(--danger-color)', textAlign: 'center' }}>
                                                {(!row['PendingStockDays'] || row['PendingStockDays'] === "0" || row['PendingStockDays'] === "-") ? "0" : row['PendingStockDays']}
                                            </td>
                                        )}
                                        {/* คลังตอบ */}
                                        {spans['คลังตอบ'] > 0 && (
                                            <td data-column="คลังตอบ" {...mergedProps('คลังตอบ')} style={{
                                                color: row['คลังตอบ'] === 'รอตรวจสอบ' ? 'var(--danger-color)' :
                                                    row['คลังตอบ'] === 'ดำเนินการแล้ว' ? 'var(--success-color)' : 'inherit',
                                                fontWeight: ['รอตรวจสอบ', 'ดำเนินการแล้ว'].includes(row['คลังตอบ']) ? 'bold' : 'normal'
                                            }}>{row['คลังตอบ']}</td>
                                        )}
                                        {/* StatusCall (StatusX) */}
                                        <td data-column="StatusCall" className={row._isManualStatusX ? 'manual-indicator' : ''} style={{
                                            cursor: 'pointer', textDecoration: 'underline',
                                            color: getStatusColor(statusXVal), fontWeight: 'bold'
                                        }} onClick={(e) => { e.stopPropagation(); onStatusXClick?.(row); }}>
                                            {statusXVal}
                                            {row._isManualStatusX && <span className="manual-pill">Manual</span>}
                                        </td>
                                        {spans['วันที่ตอบ'] > 0 && (
                                            <td data-column="วันที่ตอบ" {...mergedProps('วันที่ตอบ')}>{formatAnswerDate(row['วันที่ตอบ'])}</td>
                                        )}
                                        {spans['UserAns'] > 0 && (
                                            <td data-column="UserAns" {...mergedProps('UserAns')}>
                                                {row['UserAns'] ? (
                                                    <span className="request-pill" style={{
                                                        backgroundColor: row['คลังตอบ'] === 'ดำเนินการแล้ว' ? 'var(--success-color)' :
                                                            row['คลังตอบ'] === 'รอตรวจสอบ' ? 'var(--danger-color)' : '#6c757d',
                                                        color: '#fff'
                                                    }}>{row['UserAns']}</span>
                                                ) : ''}
                                            </td>
                                        )}
                                        {/* Detail */}
                                        <td data-column="detail">
                                            <button className="detail-button" onClick={() => onDetailClick?.(row)}>ดูรายละเอียด</button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Ultra-Compact Deck View (Grouped by Ticket Number) */}
            <div className="mobile-deck-list">
                {isLoading && mobileDeckGroups.length === 0 ? (
                    <div className="mobile-deck-empty">กำลังโหลดข้อมูล...</div>
                ) : mobileDeckGroups.length === 0 ? (
                    <div className="mobile-deck-empty">ไม่พบข้อมูล</div>
                ) : (
                    mobileDeckGroups.map((group, gIdx) => {
                        const head = group.head;
                        const dayRepair = !isNaN(parseFloat(head['DayRepair'])) ? Math.floor(parseFloat(head['DayRepair'])) : '-';
                        const teamPlantCleaned = cleanTeamPlant(head['TeamPlant']);
                        const allSelected = group.items.every(r => selectedRows?.includes(r.id));
                        const toggleGroupSelect = () => {
                            group.items.forEach(r => {
                                const isSel = selectedRows?.includes(r.id);
                                if (allSelected && isSel) onSelectRow(r.id);
                                else if (!allSelected && !isSel) onSelectRow(r.id);
                            });
                        };

                        return (
                            <div key={group.ticket || gIdx} className={`mobile-deck-card ${head._groupClass || ''}`}>
                                {/* Shared Ticket Header */}
                                <div className="deck-top">
                                    <div className="deck-top-left">
                                        <input
                                            type="checkbox"
                                            className="deck-checkbox"
                                            checked={allSelected}
                                            onChange={toggleGroupSelect}
                                        />
                                        <span
                                            className="deck-ticket"
                                            onClick={(e) => { e.stopPropagation(); onTicketClick?.(head); }}
                                        >
                                            {head['Ticket Number']}
                                        </span>
                                        {head['Call Type'] && <span className="deck-type">{head['Call Type']}</span>}
                                        <span className="deck-brand" title={head['Brand']}>{head['Brand']}</span>
                                        <span className="deck-days">{dayRepair}ว.</span>
                                        {group.items.length > 1 && (
                                            <span className="deck-item-count">{group.items.length}</span>
                                        )}
                                    </div>
                                    <span
                                        className="deck-status-badge"
                                        style={{ color: getStatusColor(head['StatusCall']), borderColor: getStatusColor(head['StatusCall']) }}
                                        onClick={(e) => { e.stopPropagation(); onStatusGroupClick?.(head); }}
                                    >
                                        {head['StatusCall']}
                                    </span>
                                </div>

                                <div className="deck-unit-row">
                                    <span className="deck-unit">
                                        {teamPlantCleaned} → <strong>{head['ค้างหน่วยงาน']}</strong>
                                        {head['Team'] ? ` (${head['Team']})` : ''}
                                    </span>
                                </div>

                                {/* Items inside this Ticket */}
                                <div className="deck-items-stack">
                                    {group.items.map((row, idx) => {
                                        const nawaVal = pf(row['Nawa']);
                                        const vipaVal = pf(row['Vipa']);
                                        const requestVal = pf(row['Request']);
                                        const qtyPlantVal = pf(row['QtyPlant']);
                                        const otherPlantVal = pf(row['OtherPlant']);
                                        const engVal = pf(row['EngQty']);
                                        const prVal = pf(row['PR']);
                                        const poVal = pf(row['PO']);
                                        const statusXVal = row['StatusX'] || row['StatusCall'] || '';
                                        const pendingUnit = (row['ค้างหน่วยงาน'] || '').trim();
                                        const rowTeamPlant = cleanTeamPlant(row['TeamPlant']);
                                        const materialVal = (row['Material'] || '').toString().trim();
                                        const descVal = (row['Description'] || '').toString().trim();
                                        const isMismatchVipa = pendingUnit === 'Stock วิภาวดี 62'
                                            && rowTeamPlant !== 'วิภาวดี 62'
                                            && materialVal !== '' && materialVal !== '-'
                                            && descVal !== '' && descVal !== '-';
                                        const hasRebuilt = row['Rebuilt'] && String(row['Rebuilt']).trim() !== '-' && String(row['Rebuilt']).trim() !== '0';

                                        return (
                                            <div key={row.id || idx} className="deck-subitem">
                                                <div className="deck-mid">
                                                    <span className={`deck-mat ${isMismatchVipa ? 'strike' : ''}`}>{row['Material']}</span>
                                                    {row['จำนวน'] !== undefined && row['จำนวน'] !== null && row['จำนวน'] !== '' && (
                                                        <span className="deck-pill dark-red">×{row['จำนวน']}</span>
                                                    )}
                                                    <span className={`deck-desc ${isMismatchVipa ? 'strike' : ''}`} title={row['Description']}>
                                                        {row['Description']}
                                                    </span>
                                                    {hasRebuilt && (
                                                        <span
                                                            className="deck-pill blue"
                                                            onClick={(e) => { e.stopPropagation(); onRebuiltClick?.(row); }}
                                                        >
                                                            แทน:{row['Rebuilt']}
                                                        </span>
                                                    )}
                                                    <span
                                                        className="deck-item-status"
                                                        style={{ color: getStatusColor(statusXVal) }}
                                                        onClick={(e) => { e.stopPropagation(); onStatusXClick?.(row); }}
                                                    >
                                                        {statusXVal}
                                                    </span>
                                                </div>

                                                <div className="deck-foot">
                                                    <div className="deck-pills">
                                                        {prVal > 0 && <span className="deck-pill pink" onClick={(e) => { e.stopPropagation(); onPrClick?.(row); }}>PR:{row['PR']}</span>}
                                                        {poVal > 0 && <span className="deck-pill blue" onClick={(e) => { e.stopPropagation(); onPoClick?.(row); }}>PO:{row['PO']}</span>}
                                                        {nawaVal > 0 && <span className="deck-pill green" onClick={(e) => { e.stopPropagation(); onNawaClick?.(row); }}>นว:{row['Nawa']}</span>}
                                                        {vipaVal > 0 && <span className="deck-pill orange">วภ:{row['Vipa']}</span>}
                                                        {requestVal > 0 && <span className="deck-pill teal">นอก:{row['Request']}</span>}
                                                        {engVal > 0 && <span className="deck-pill cyan" onClick={(e) => { e.stopPropagation(); onEngClick?.(row); }}>ช่าง:{row['EngQty']}</span>}
                                                        {qtyPlantVal > 0 && <span className="deck-pill purple">คลัง:{row['QtyPlant']}</span>}
                                                        {otherPlantVal > 0 && <span className="deck-pill magenta" onClick={(e) => { e.stopPropagation(); onOtherPlantClick?.(row); }}>อื่น:{row['OtherPlant']}</span>}
                                                        {row['คลังตอบ'] && (
                                                            <span
                                                                className="deck-ans-text"
                                                                style={{
                                                                    color: row['คลังตอบ'] === 'รอตรวจสอบ' ? 'var(--danger-color)' :
                                                                        row['คลังตอบ'] === 'ดำเนินการแล้ว' ? 'var(--success-color)' : '#475569'
                                                                }}
                                                            >
                                                                {row['คลังตอบ']}
                                                            </span>
                                                        )}
                                                        {row['UserAns'] && <span className="deck-ans-user">{row['UserAns']}</span>}
                                                    </div>
                                                    <button type="button" className="deck-detail-btn" onClick={() => onDetailClick?.(row)}>
                                                        รายละเอียด
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="pagination">
                <button onClick={() => onPageChange(1)} disabled={currentPage === 1}><i className="fas fa-chevron-left"></i><i className="fas fa-chevron-left"></i></button>
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><i className="fas fa-chevron-left"></i></button>
                <div id="pageNumbers"><span>{currentPage} / {totalPages || 1}</span></div>
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><i className="fas fa-chevron-right"></i></button>
                <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}><i className="fas fa-chevron-right"></i><i className="fas fa-chevron-right"></i></button>
                <div className="items-per-page">
                    <label htmlFor="itemsPerPage">รายการต่อหน้า:</label>
                    <select id="itemsPerPage" value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                    </select>
                </div>
            </div>
        </>
    );
}

// Utilities
function pf(val) { return parseFloat((val || "0").toString().replace(/,/g, '')) || 0; }
function extractDate(s) { if (!s || typeof s !== 'string') return s || "-"; const m = s.match(/^(\d{2}\/\d{2}\/\d{4})/); return m ? m[1] : s; }
function formatAnswerDate(value) {
    if (!value) return '';
    const text = String(value).trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!match) return text;
    const year = match[3].slice(-2);
    const time = match[4] !== undefined ? ` ${match[4].padStart(2, '0')}:${match[5]}น` : '';
    return `${match[1]}/${match[2]}/${year}${time}`;
}
function cleanTeamPlant(tp) { return (tp || "").replace(/Stock\s*/gi, '').trim(); }
function getStatusColor(status) {
    const c = {
        "รอของเข้า": "var(--danger-color)", "เกินLeadtime": "#8b0000", "ดึงจากคลังอื่น": "#3f51b5",
        "เปิดรหัสใหม่": "#6f42c1", "สำเร็จ": "var(--success-color)", "ระหว่างขนส่ง": "var(--success-color)",
        "เบิกนวนคร": "var(--info-color)", "เบิกศูนย์อะไหล่": "var(--info-color)", "เบิกวิภาวดี": "#fd7e14",
        "เบิกทดแทน": "#0891b2", "มีอะไหล่ในทีม": "#059669",
        "ขอซื้อขอซ่อม": "#20c997", "SPACIAL": "#6c757d", "รอทดแทน": "#ffc107", "แจ้งCodeผิด": "var(--danger-color)"
    };
    return c[status] || "#6c757d";
}
