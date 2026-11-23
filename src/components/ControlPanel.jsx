import React from 'react';
import { formatStockAnswerLabel } from '../utils/helpers';
import { getCusLogo } from '../utils/cusLogos';

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
                    <span className="quick-unit-label">
                        <i className="fas fa-layer-group"></i>
                        <span>ค้างหน่วยงาน</span>
                    </span>
                    <div className="quick-unit-chips">
                        <button
                            type="button"
                            className={`quick-unit-chip ${!pendingUnitFilter ? 'active' : ''}`}
                            onClick={() => onPendingUnitChange('')}
                        >
                            <span>ทั้งหมด</span>
                            <span className="quick-unit-count">{totalPendingUnitItems}</span>
                        </button>
                        {sortedPendingUnits.map(([key, count]) => {
                            const isActive = pendingUnitFilter === key;
                            const isClear = pendingUnitAllDone?.[key] === true;
                            const isUserUnit = Boolean(userPendingUnit && userPendingUnit === key);
                            const displayLabel = String(key).replace(/^Stock\s*/i, '').trim() || key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className={`quick-unit-chip ${isActive ? 'active' : ''} ${isClear ? 'clear' : ''} ${isUserUnit ? 'is-user-unit' : ''}`}
                                    onClick={() => onPendingUnitChange(isActive ? '' : key)}
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
