import React, { useState, useEffect, useRef } from 'react';

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

function DrawerFilterGroup({ title, icon, options, activeValue, onSelect, useStatusColors, defaultOpen = true, sectioned = false, noWaitingByKey, percentByKey }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const sorted = Object.entries(options || {}).sort((a, b) => b[1] - a[1]);

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
                        <span className="drawer-chip-label">{key}</span>
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
                            <i className="fas fa-times-circle"></i> ล้างตัวกรอง "{activeValue}"
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

export default function RightMenuBar({
    activeTab,
    onTabChange,
    // Filters
    availableFilters,
    teamPlantFilter,
    pendingUnitFilter,
    stockAnswerFilter,
    callTypeStats = [],
    dashboardFilter = null,
    onTeamPlantChange,
    onPendingUnitChange,
    onStockAnswerChange,
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

    return (
        <aside ref={dockRef} className={`right-dock ${activeTab ? 'drawer-open' : ''}`} aria-label="แถบเครื่องมือด้านขวา">
            {/* Expandable Inspector Drawer */}
            {activeTab && (
                <div className="right-drawer">
                    <div className="right-drawer-header">
                        <div className="right-drawer-title">
                            {activeTab === 'filters' && <><i className="fas fa-sliders-h"></i> ตัวกรองข้อมูล</>}
                            {activeTab === 'reports' && <><i className="fas fa-chart-pie"></i> รายงานและวิเคราะห์</>}
                            {activeTab === 'tools' && <><i className="fas fa-toolbox"></i> เครื่องมือข้อมูล</>}
                            {activeTab === 'settings' && <><i className="fas fa-cog"></i> โปรไฟล์ & ตั้งค่า</>}
                        </div>
                        <button
                            type="button"
                            className="right-drawer-close"
                            onClick={() => onTabChange(null)}
                            title="พับแผงด้านข้าง"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="right-drawer-content">
                        {activeTab === 'filters' && (
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
                                <DrawerFilterGroup
                                    title="ศูนย์พื้นที่"
                                    icon="fas fa-building"
                                    options={availableFilters?.teamPlant}
                                    activeValue={teamPlantFilter}
                                    onSelect={onTeamPlantChange}
                                    sectioned={true}
                                    defaultOpen={true}
                                />
                                <DrawerFilterGroup
                                    title="ค้างหน่วยงาน"
                                    icon="fas fa-layer-group"
                                    options={availableFilters?.pendingUnit}
                                    activeValue={pendingUnitFilter}
                                    onSelect={onPendingUnitChange}
                                    noWaitingByKey={availableFilters?.pendingUnitNoWaiting}
                                    defaultOpen={true}
                                />
                                <DrawerFilterGroup
                                    title="คลังตอบ"
                                    icon="fas fa-reply-all"
                                    options={availableFilters?.stockAnswer}
                                    activeValue={stockAnswerFilter}
                                    onSelect={onStockAnswerChange}
                                    useStatusColors={true}
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
                                        defaultOpen={true}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="drawer-action-list">
                                <button type="button" className="drawer-action-card" onClick={onOpenGraph}>
                                    <div className="drawer-action-icon blue"><i className="fas fa-chart-bar"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>กราฟภาพรวม</strong>
                                        <span>ดูกราฟสถานะแยกตามหน่วยงาน</span>
                                    </div>
                                    <i className="fas fa-chevron-right drawer-action-arrow"></i>
                                </button>
                                <button type="button" className="drawer-action-card" onClick={onOpenSpareSummary}>
                                    <div className="drawer-action-icon indigo"><i className="fas fa-boxes"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>สรุปอะไหล่รอของเข้า</strong>
                                        <span>เปิดหน้ารายการ Pivot & กำหนดส่ง</span>
                                    </div>
                                    <i className="fas fa-external-link-alt drawer-action-arrow"></i>
                                </button>
                                <button type="button" className="drawer-action-card" onClick={onOpenSummary}>
                                    <div className="drawer-action-icon emerald"><i className="fas fa-list-alt"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>สรุปข้อมูลรายการ</strong>
                                        <span>สรุปสถานะภาพรวมทั้งหมด</span>
                                    </div>
                                    <i className="fas fa-chevron-right drawer-action-arrow"></i>
                                </button>
                            </div>
                        )}

                        {activeTab === 'tools' && (
                            <div className="drawer-action-list">
                                <button type="button" className="drawer-action-card" onClick={onPrintTable}>
                                    <div className="drawer-action-icon blue"><i className="fas fa-print"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>{selectedCount > 0 ? `พิมพ์สติกเกอร์ (${selectedCount} รายการ)` : 'พิมพ์ตาราง'}</strong>
                                        <span>{selectedCount > 0 ? 'พิมพ์สติกเกอร์สำหรับแถวที่เลือก' : 'สั่งพิมพ์หน้าตารางข้อมูล'}</span>
                                    </div>
                                </button>
                                <button type="button" className="drawer-action-card" onClick={onExportCSV}>
                                    <div className="drawer-action-icon emerald"><i className="fas fa-file-csv"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>Export CSV</strong>
                                        <span>ดาวน์โหลดข้อมูลที่กรองอยู่เป็นไฟล์ CSV</span>
                                    </div>
                                </button>
                                <a
                                    className="drawer-action-card"
                                    href="https://docs.google.com/spreadsheets/d/112KOJI227dvyHy4w_gD8wuANrVPmFK_ezzZyV_uWVrE/edit?gid=1496713252#gid=1496713252"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <div className="drawer-action-icon green"><i className="fas fa-database"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>ฐานข้อมูล Google Sheets</strong>
                                        <span>เปิดดูชีตข้อมูลต้นทาง</span>
                                    </div>
                                    <i className="fas fa-external-link-alt drawer-action-arrow"></i>
                                </a>
                                <button type="button" className="drawer-action-card" onClick={onUpdateGuide}>
                                    <div className="drawer-action-icon amber"><i className="fas fa-info-circle"></i></div>
                                    <div className="drawer-action-text">
                                        <strong>วิธีอัพข้อมูล</strong>
                                        <span>คู่มือขั้นตอนการอัปเดตข้อมูล</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="drawer-settings-stack">
                                <div className="sheet-user" style={{ marginBottom: '14px' }}>
                                    <div className="sheet-avatar">
                                        {user?.Name ? user.Name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/, '').charAt(0) : 'U'}
                                    </div>
                                    <div className="name">{user?.Name || '-'}</div>
                                    <div className="meta">
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            <span className="sheet-badge"><i className="fas fa-id-badge" style={{ marginRight: '6px' }}></i>{user?.IDRec || '-'}</span>
                                            {user?.Status && user.Status !== 'None' && (
                                                <span className="sheet-badge success" title="ระดับผู้ใช้งาน">
                                                    <i className="fas fa-user-shield" style={{ marginRight: '6px' }}></i>{user.Status}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ marginTop: '0' }}>หน่วยงาน: {user?.['หน่วยงาน'] || '-'} • ทีม: {user?.Unit || '-'} • Plant {user?.Plant || '-'}</span>
                                    </div>
                                </div>

                                <div className="sheet-toggle-row">
                                    <div className="sheet-toggle-info">
                                        <div className="sheet-toggle-title">
                                            <i className="fas fa-layer-group" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                                            แสดงการ์ดสรุปทั้งหมด
                                        </div>
                                        <div className="sheet-toggle-desc">
                                            {showAllCards ? 'เปิดแสดงการ์ด GM และกลุ่มหน่วยงาน' : 'ปิดการ์ด GM และกลุ่มหน่วยงาน'}
                                        </div>
                                    </div>
                                    <label className="toggle-switch" title={showAllCards ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}>
                                        <input
                                            type="checkbox"
                                            checked={showAllCards}
                                            onChange={onToggleAllCards}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <button className="header-button danger" onClick={handleLogoutClick} style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>
                                    <i className="fas fa-sign-out-alt"></i><span>ออกจากระบบ</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Slim Icon Rail */}
            <nav className="right-rail" aria-label="เมนูนำทางด้านขวา">
                <div className="right-rail-group">
                    <button
                        type="button"
                        className={`right-rail-btn ${activeTab === 'filters' ? 'active' : ''}`}
                        onClick={() => toggleTab('filters')}
                        title="ตัวกรองข้อมูล (Filters)"
                    >
                        <i className="fas fa-sliders-h"></i>
                        <span className="rail-label">ตัวกรอง</span>
                        {activeFilterCount > 0 && <span className="rail-badge">{activeFilterCount}</span>}
                    </button>

                    <button
                        type="button"
                        className={`right-rail-btn ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => toggleTab('reports')}
                        title="รายงานและกราฟ (Reports)"
                    >
                        <i className="fas fa-chart-pie"></i>
                        <span className="rail-label">รายงาน</span>
                    </button>

                    <button
                        type="button"
                        className={`right-rail-btn ${activeTab === 'tools' ? 'active' : ''}`}
                        onClick={() => toggleTab('tools')}
                        title="เครื่องมือและส่งออก (Tools & Export)"
                    >
                        <i className="fas fa-toolbox"></i>
                        <span className="rail-label">เครื่องมือ</span>
                        {selectedCount > 0 && <span className="rail-badge accent">{selectedCount}</span>}
                    </button>
                </div>

                <div className="right-rail-group bottom">
                    <button
                        type="button"
                        className={`right-rail-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => toggleTab('settings')}
                        title="โปรไฟล์และตั้งค่า (Settings)"
                    >
                        <i className="fas fa-cog"></i>
                        <span className="rail-label">ตั้งค่า</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}
