import React from 'react';

export default function ControlPanel({
    searchTerm,
    onSearchChange,
    onSearch,
    teamPlantFilter,
    pendingUnitFilter,
    stockAnswerFilter,
    statusCallFilter,
    dashboardFilter,
    gmFilter,
    onTeamPlantChange,
    onPendingUnitChange,
    onStockAnswerChange,
    onClearAllFilters,
    onOpenFilters,
    totalCount = 0,
    totalQuantity = 0,
    activeFilterCount = 0
}) {
    const activeChips = [];
    if (teamPlantFilter) activeChips.push({ key: 'tp', label: `ศูนย์พื้นที่: ${teamPlantFilter}`, onClear: () => onTeamPlantChange('') });
    if (pendingUnitFilter) activeChips.push({ key: 'pu', label: `ค้างหน่วยงาน: ${pendingUnitFilter}`, onClear: () => onPendingUnitChange('') });
    if (stockAnswerFilter) activeChips.push({ key: 'sa', label: `คลังตอบ: ${stockAnswerFilter}`, onClear: () => onStockAnswerChange('') });
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
