import React, { useState, useEffect, useRef } from 'react';
import { formatStockAnswerLabel } from '../utils/helpers';
import { getCusLogo } from '../utils/cusLogos';

const STATUS_COLORS = {
    "รอของเข้า": "var(--danger-color)",
    "สำเร็จ": "var(--success-color)",
    "ระหว่างขนส่ง": "var(--success-color)",
    "เบิกนวนคร": "var(--info-color)",
    "เบิกวิภาวดี": "#fd7e14",
    "เบิกศูนย์อะไหล่": "var(--info-color)",
    "รอตรวจสอบ": "var(--danger-color)",
    "ดำเนินการแล้ว": "var(--success-color)",
    "เกินLeadtime": "var(--danger-color)",
    "ดึงจากคลังอื่น": "#3f51b5",
    "เปิดรหัสใหม่": "#6f42c1",
    "ขอซื้อขอซ่อม": "#20c997",
    "SPACIAL": "#6c757d",
    "รอทดแทน": "#ffc107",
    "แจ้งCodeผิด": "#e83e8c"
};

function DrawerFilterGroup({ title, icon, options, activeValue, onSelect, useStatusColors, defaultOpen = true, sectioned = false, noWaitingByKey, percentByKey, formatLabel }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const sorted = Object.entries(options || {}).sort((a, b) => b[1] - a[1]);
    const getLabel = (val) => (formatLabel ? formatLabel(val) : val);

    const renderChips = (items) => (
        <div className="drawer-chip-grid">
            {items.map(([key, count]) => {
                const isActive = activeValue === key;
                const color = useStatusColors ? STATUS_COLORS[key] : undefined;
                const isClear = noWaitingByKey?.[key] === true;
                const pct = percentByKey?.[key];
                return (
                    <button
                        key={key}
                        type="button"
                        className={`drawer-filter-chip ${isActive ? 'active' : ''} ${isClear ? 'clear' : ''}`}
                        onClick={() => onSelect(isActive ? '' : key)}
                        style={!isActive && color ? { borderColor: color, color } : {}}
                    >
                        <span className="drawer-chip-label">{getLabel(key)}</span>
                        <span className="drawer-chip-count">{pct !== undefined ? `${count} (${pct}%)` : count}</span>
                    </button>
                );
            })}
        </div>
    );

    const nonSA = sectioned ? sorted.filter(([key]) => !key.startsWith('SA')) : sorted;
    const sa = sectioned ? sorted.filter(([key]) => key.startsWith('SA')) : [];

    return (
        <div className="drawer-accordion">
            <button
                type="button"
                className="drawer-accordion-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="drawer-accordion-title">
                    <i className={icon}></i>
                    <span>{title}</span>
                    {activeValue && <span className="drawer-active-dot" title={`กำลังเลือก: ${getLabel(activeValue)}`}></span>}
                </span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} drawer-accordion-arrow`}></i>
            </button>

            {isOpen && (
                <div className="drawer-accordion-body">
                    {activeValue && (
                        <button
                            type="button"
                            className="drawer-clear-section"
                            onClick={() => onSelect('')}
                        >
                            <i className="fas fa-times-circle"></i> ล้างตัวกรอง "{getLabel(activeValue)}"
                        </button>
                    )}
                    {sectioned ? (
                        <>
                            {nonSA.length > 0 && (
                                <div className="drawer-sub-section">
                                    <div className="drawer-sub-label">ศูนย์บริการ / คลัง</div>
                                    {renderChips(nonSA)}
                                </div>
                            )}
                            {sa.length > 0 && (
                                <div className="drawer-sub-section">
                                    <div className="drawer-sub-label">Service Advisor (SA)</div>
                                    {renderChips(sa)}
                                </div>
                            )}
                        </>
                    ) : (
                        renderChips(sorted)
                    )}
                </div>
            )}
        </div>
    );
}

function DrawerCustomerGroup({ options, activeValue, onSelect, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const sorted = Object.entries(options || {}).sort((a, b) => b[1] - a[1]);
    const totalCalls = sorted.reduce((sum, [, count]) => sum + count, 0);
    const activeShortName = activeValue ? (getCusLogo(activeValue)?.shortName || activeValue) : '';

    return (
        <div className="drawer-accordion">
            <button
                type="button"
                className="drawer-accordion-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="drawer-accordion-title">
                    <i className="fas fa-store"></i>
                    <span>ลูกค้า</span>
                    {activeValue && <span className="drawer-active-dot" title={`กำลังเลือก: ${activeValue}`}></span>}
                </span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} drawer-accordion-arrow`}></i>
            </button>

            {isOpen && (
                <div className="drawer-accordion-body">
                    {activeValue && (
                        <button
                            type="button"
                            className="drawer-clear-section"
                            onClick={() => onSelect('')}
                        >
                            <i className="fas fa-times-circle"></i> ล้างตัวกรอง "{activeShortName}"
                        </button>
                    )}
                    <div className="drawer-cus-chips">
                        <button
                            type="button"
                            className={`quick-unit-chip drawer-cus-chip ${!activeValue ? 'active' : ''}`}
                            onClick={() => onSelect('')}
                        >
                            <span>ทั้งหมด</span>
                            <span className="quick-unit-count">{totalCalls}</span>
                        </button>
                        {sorted.map(([key, count]) => {
                            const isActive = activeValue === key;
                            const cusLogo = getCusLogo(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className={`quick-unit-chip drawer-cus-chip ${isActive ? 'active' : ''}`}
                                    onClick={() => onSelect(isActive ? '' : key)}
                                    title={`${key} (${count} Call)`}
                                    aria-label={`${key} (${count} Call)`}
                                >
                                    {cusLogo ? (
                                        <img
                                            src={cusLogo.logo}
                                            alt={key}
                                            className="drawer-cus-logo"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span className="drawer-cus-fallback">{key}</span>
                                    )}
                                    <span className="quick-unit-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RightMenuBar({
    activeTab,
    onTabChange,
    // Filters
    availableFilters,
    teamPlantFilter,
    pendingUnitFilter,
    stockAnswerFilter,
    companyFilter,
    callTypeStats = [],
    dashboardFilter = null,
    onTeamPlantChange,
    onPendingUnitChange,
    onStockAnswerChange,
    onCompanyChange,
    onCallTypeClick,
    onClearAllFilters,
    activeFilterCount = 0,
    // Reports & Tools
    onOpenGraph,
    onOpenSpareSummary,
    onOpenSummary,
    onPrintTable,
    onExportCSV,
    onUpdateGuide,
    selectedCount = 0,
    // User & Settings
    user,
    onLogout,
    showAllCards = false,
    onToggleAllCards
}) {
    const dockRef = useRef(null);

    useEffect(() => {
        if (!activeTab) return undefined;

        const handlePointerDown = (event) => {
            if (event.target.closest?.('.filter-trigger-btn')) return;
            if (dockRef.current && !dockRef.current.contains(event.target)) {
                onTabChange(null);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onTabChange(null);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown, { passive: true });
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeTab, onTabChange]);

    const toggleTab = (tab) => {
        onTabChange(activeTab === tab ? null : tab);
    };

    const handleLogoutClick = () => {
        localStorage.removeItem('user');
        onLogout();
    };

    if (!activeTab) return null;

    return (
        <aside ref={dockRef} className="right-dock drawer-open" aria-label="หน้าต่างตัวกรองข้อมูล">
            <div className="right-drawer">
                <div className="right-drawer-header">
                    <div className="right-drawer-title">
                        <i className="fas fa-sliders-h"></i> ตัวกรองเพิ่มเติม
                    </div>
                    <button
                        type="button"
                        className="right-drawer-close"
                        onClick={() => onTabChange(null)}
                        title="ปิดหน้าต่างตัวกรอง"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="right-drawer-content">
                    <div className="drawer-section-stack">
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                className="drawer-reset-all-btn"
                                onClick={onClearAllFilters}
                            >
                                <i className="fas fa-undo-alt"></i> ล้างตัวกรองทั้งหมด ({activeFilterCount})
                            </button>
                        )}
                        <DrawerCustomerGroup
                            options={availableFilters?.company}
                            activeValue={companyFilter}
                            onSelect={onCompanyChange}
                            defaultOpen={true}
                        />
                        <DrawerFilterGroup
                            title="คลังตอบ"
                            icon="fas fa-reply-all"
                            options={availableFilters?.stockAnswer}
                            activeValue={stockAnswerFilter}
                            onSelect={onStockAnswerChange}
                            useStatusColors={true}
                            formatLabel={formatStockAnswerLabel}
                            defaultOpen={true}
                        />
                        {callTypeStats.some(item => item.value > 0) && (
                            <DrawerFilterGroup
                                title="Call Type"
                                icon="fas fa-tags"
                                options={Object.fromEntries(callTypeStats.filter(i => i.value > 0).map(i => [i.label, i.value]))}
                                percentByKey={Object.fromEntries(callTypeStats.filter(i => i.value > 0).map(i => [i.label, i.percent]))}
                                activeValue={dashboardFilter?.startsWith('calltype_') ? dashboardFilter.replace('calltype_', '') : ''}
                                onSelect={(val) => onCallTypeClick?.(val ? `calltype_${val}` : dashboardFilter)}
                                defaultOpen={false}
                            />
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
