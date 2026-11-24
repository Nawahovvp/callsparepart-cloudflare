import React from 'react';
import { DEPT_GROUPS, getDeptGroups, formatStockAnswerLabel } from '../utils/helpers';
import { getCusLogo } from '../utils/cusLogos';

const GROUP_TAG_COLORS = {
    Stock: { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' },
    วิศวกรรม: { bg: '#f3e8ff', border: '#c4b5fd', color: '#5b21b6' },
    Repair: { bg: '#fff7ed', border: '#fdba74', color: '#c2410c' },
    จัดซื้อ: { bg: '#ecfdf5', border: '#6ee7b7', color: '#047857' },
    ลูกค้า: { bg: '#fdf2f8', border: '#f9a8d4', color: '#be185d' },
    Sale: { bg: '#f5f3ff', border: '#c4b5fd', color: '#6d28d9' },
    จัดส่ง: { bg: '#f1f5f9', border: '#cbd5e1', color: '#334155' },
    อื่นๆ: { bg: '#f8fafc', border: '#cbd5e1', color: '#475569' }
};

export default function ControlPanel({
    searchTerm,
    onSearchChange,
    onSearch,
    teamPlantFilter,
    pendingUnitFilter,
    stockAnswerFilter,
    statusCallFilter,
    companyFilter,
    dashboardFilter,
    gmFilter,
    onTeamPlantChange,
    onPendingUnitChange,
    onStockAnswerChange,
    onCompanyChange,
    onClearAllFilters,
    onOpenFilters,
    totalCount = 0,
    totalQuantity = 0,
    activeFilterCount = 0,
    pendingUnitOptions = {},
    pendingUnitAllDone = {},
    userPendingUnit = ''
}) {
    const [showOtherPendingGroups, setShowOtherPendingGroups] = React.useState(false);

    const activeChips = [];
    if (companyFilter) activeChips.push({ key: 'cus', label: `ลูกค้า: ${getCusLogo(companyFilter)?.shortName || companyFilter}`, onClear: () => onCompanyChange?.('') });
    if (teamPlantFilter) activeChips.push({ key: 'tp', label: `ศูนย์พื้นที่: ${teamPlantFilter}`, onClear: () => onTeamPlantChange('') });
    if (stockAnswerFilter) activeChips.push({ key: 'sa', label: `คลังตอบ: ${formatStockAnswerLabel(stockAnswerFilter)}`, onClear: () => onStockAnswerChange('') });
    if (statusCallFilter) activeChips.push({ key: 'sc', label: `StatusCall: ${statusCallFilter}`, onClear: onClearAllFilters });
    if (dashboardFilter) {
        const isCallType = dashboardFilter.startsWith?.('calltype_');
        activeChips.push({
            key: 'df',
            label: isCallType ? `Call Type: ${dashboardFilter.replace('calltype_', '')}` : `กลุ่มสถานะ: ${dashboardFilter}`,
            onClear: onClearAllFilters
        });
    }
    if (gmFilter) activeChips.push({ key: 'gm', label: `GM: ${gmFilter.replace('gm_', '')}`, onClear: onClearAllFilters });

    const sortedPendingUnits = React.useMemo(() => {
        const entries = Object.entries(pendingUnitOptions || {}).sort((a, b) => b[1] - a[1]);
        if (!userPendingUnit) return entries;
        const userIdx = entries.findIndex(([key]) => key === userPendingUnit);
        if (userIdx <= 0) return entries;
        const [userEntry] = entries.splice(userIdx, 1);
        return [userEntry, ...entries];
    }, [pendingUnitOptions, userPendingUnit]);

    const totalPendingUnitItems = React.useMemo(
        () => sortedPendingUnits.reduce((sum, [, count]) => sum + count, 0),
        [sortedPendingUnits]
    );

    const selectedPendingUnits = React.useMemo(
        () => (Array.isArray(pendingUnitFilter) ? pendingUnitFilter : (pendingUnitFilter ? [pendingUnitFilter] : [])),
        [pendingUnitFilter]
    );

    const togglePendingUnit = (unitKey) => {
        const next = selectedPendingUnits.includes(unitKey)
            ? selectedPendingUnits.filter((item) => item !== unitKey)
            : [...selectedPendingUnits, unitKey];
        onPendingUnitChange(next);
    };

    const groupedPendingUnits = React.useMemo(() => {
        const buckets = new Map();
        const groupOrder = [...DEPT_GROUPS.map(g => g.key), 'อื่นๆ'];
        groupOrder.forEach(k => buckets.set(k, []));

        sortedPendingUnits.forEach(([key, count]) => {
            const matched = getDeptGroups(key)[0] || 'อื่นๆ';
            if (!buckets.has(matched)) buckets.set(matched, []);
            buckets.get(matched).push([key, count]);
        });

        return [...buckets.entries()]
            .filter(([, items]) => items.length > 0)
            .map(([groupKey, items]) => ({
                key: groupKey,
                label: groupKey,
                items,
                total: items.reduce((sum, [, count]) => sum + count, 0)
            }));
    }, [sortedPendingUnits]);

    const stockGroup = React.useMemo(
        () => groupedPendingUnits.find((g) => g.key === 'Stock') || null,
        [groupedPendingUnits]
    );

    const otherPendingGroups = React.useMemo(
        () => groupedPendingUnits.filter((g) => g.key !== 'Stock'),
        [groupedPendingUnits]
    );

    const otherGroupsTotal = React.useMemo(
        () => otherPendingGroups.reduce((sum, g) => sum + g.total, 0),
        [otherPendingGroups]
    );

    const renderPendingGroupBox = (group, isStock = false) => {
        const tagStyle = GROUP_TAG_COLORS[group.key] || GROUP_TAG_COLORS['อื่นๆ'];
        return (
            <div
                key={group.key}
                className={`quick-unit-group-box ${isStock ? 'is-stock-box' : ''}`}
            >
                <span
                    className="quick-unit-group-tag"
                    style={{
                        backgroundColor: tagStyle.bg,
                        borderColor: tagStyle.border,
                        color: tagStyle.color
                    }}
                    title={`กลุ่ม ${group.label} (${group.total})`}
                >
                    <span>{group.label}</span>
                    <span className="quick-unit-group-total">{group.total}</span>
                </span>
                <div className="quick-unit-chips">
                    {group.items.map(([key, count]) => {
                        const isActive = selectedPendingUnits.includes(key);
                        const isClear = pendingUnitAllDone?.[key] === true;
                        const isUserUnit = Boolean(userPendingUnit && userPendingUnit === key);
                        const displayLabel = String(key).replace(/^Stock\s*/i, '').trim() || key;
                        return (
                            <button
                                key={key}
                                type="button"
                                className={`quick-unit-chip ${isActive ? 'active' : ''} ${isClear ? 'clear' : ''} ${isUserUnit ? 'is-user-unit' : ''}`}
                                onClick={() => togglePendingUnit(key)}
                                title={isUserUnit ? `หน่วยงานของคุณ (${key})` : `กรองค้างหน่วยงาน: ${key}`}
                            >
                                {isUserUnit && <i className="fas fa-user quick-unit-user-icon" aria-hidden="true"></i>}
                                <span>{displayLabel}</span>
                                <span className="quick-unit-count">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div id="searchContainer" className="modern-search-bar">
            <div className="search-row-primary">
                <div className="search-input-wrap">
                    <i className="fas fa-search search-input-icon"></i>
                    <input
                        type="text"
                        id="searchInput"
                        placeholder="ค้นหา Ticket Number, Team, Material, TeamPlant, Store Name, Equipment, Call Type, ค้างหน่วยงาน..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className="search-clear-icon"
                            onClick={() => onSearchChange('')}
                            title="ล้างคำค้นหา"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                <button id="searchButton" className="action-button" onClick={onSearch}>
                    <i className="fas fa-search"></i> ค้นหา
                </button>

                <button
                    type="button"
                    className={`action-button ghost filter-trigger-btn ${activeFilterCount > 0 ? 'has-active' : ''}`}
                    onClick={onOpenFilters}
                    title="เปิดแถบตัวกรองด้านขวา"
                >
                    <i className="fas fa-sliders-h"></i>
                    <span>ตัวกรอง</span>
                    {activeFilterCount > 0 && <span className="filter-trigger-badge">{activeFilterCount}</span>}
                </button>

                <span className="result-count-pill">
                    พบ <strong>{totalCount.toLocaleString()}</strong> รายการ
                </span>
                <span className="result-count-pill qty-pill">
                    รวมจำนวน <strong>{totalQuantity.toLocaleString()}</strong> ชิ้น
                </span>
            </div>

            {sortedPendingUnits.length > 0 && (
                <div className="quick-unit-bar" role="group" aria-label="ตัวกรองด่วน ค้างหน่วยงาน">
                    <div className="quick-unit-header-col">
                        {stockGroup && otherPendingGroups.length > 0 && (
                            <button
                                type="button"
                                className={`quick-unit-expand-btn ${showOtherPendingGroups ? 'expanded' : ''}`}
                                onClick={() => setShowOtherPendingGroups((prev) => !prev)}
                                title={showOtherPendingGroups
                                    ? 'ซ่อนค้างหน่วยงานกลุ่มอื่น'
                                    : `แสดงค้างหน่วยงานกลุ่มอื่นทั้งหมด (${otherPendingGroups.length} กลุ่ม • ${otherGroupsTotal})`}
                                aria-expanded={showOtherPendingGroups}
                                aria-label="แสดงหรือซ่อนค้างหน่วยงานกลุ่มอื่น"
                            >
                                <i className={`fas fa-chevron-${showOtherPendingGroups ? 'up' : 'down'}`} aria-hidden="true"></i>
                            </button>
                        )}
                        <span className="quick-unit-label">
                            <i className="fas fa-layer-group"></i>
                            <span>ค้างหน่วยงาน</span>
                        </span>
                        <button
                            type="button"
                            className={`quick-unit-chip ${selectedPendingUnits.length === 0 ? 'active' : ''}`}
                            onClick={() => onPendingUnitChange([])}
                        >
                            <span>ทั้งหมด</span>
                            <span className="quick-unit-count">{totalPendingUnitItems}</span>
                        </button>
                    </div>
                    <div className="quick-unit-groups-stack">
                        {stockGroup && renderPendingGroupBox(stockGroup, true)}
                        {(showOtherPendingGroups || !stockGroup) &&
                            otherPendingGroups.map((group) => renderPendingGroupBox(group, false))}
                    </div>
                </div>
            )}

            {activeChips.length > 0 && (
                <div className="active-filters-strip">
                    <span className="active-filters-label">ตัวกรองที่เลือก:</span>
                    {activeChips.map(chip => (
                        <span key={chip.key} className="active-filter-chip">
                            <span>{chip.label}</span>
                            <button type="button" onClick={chip.onClear} title="ลบตัวกรองนี้">
                                <i className="fas fa-times"></i>
                            </button>
                        </span>
                    ))}
                    <button type="button" className="active-filters-clear-all" onClick={onClearAllFilters}>
                        ล้างทั้งหมด
                    </button>
                </div>
            )}
        </div>
    );
}
