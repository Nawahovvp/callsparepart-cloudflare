import React, { useState, useEffect, useRef } from 'react';

export default function AppHeader({
    user,
    onLogout,
    lastUpdated,
    onRefresh,
    isLoading = false,
    isScrolled = false,
    showAllCards = false,
    onToggleAllCards,
    onOpenGraph,
    onOpenSpareSummary,
    onOpenSummary,
    onPrintTable,
    onExportCSV,
    onUpdateGuide,
    selectedCount = 0,
    onOpenFilters,
    isFiltersOpen = false,
    activeFilterCount = 0
}) {
    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const popoverRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!showQuickSettings) return undefined;
        function handleClickOutside(event) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setShowQuickSettings(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showQuickSettings]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        onLogout?.();
    };

    return (
        <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="brand-block">
                <div className="brand-logo">
                    <span>SP</span>
                    <div className="brand-logo-glow"></div>
                </div>
                <div className="brand-text">
                    <div className="brand-title">รายการอะไหล่ Call ค้างคลังสินค้า Sparepare</div>
                    <div className="brand-meta" style={{ display: lastUpdated ? 'block' : 'none' }}>
                        Data Update: <span>{lastUpdated || '-'}</span>
                    </div>
                </div>
            </div>

            <div className="header-actions">
                <div id="syncProgressText" style={{ fontSize: '11px', color: '#ced4da', marginRight: '5px', display: 'none', whiteSpace: 'nowrap' }}></div>
                <div id="syncStatus" className="sync-status" title="สถานะการซิงค์ข้อมูล"></div>

                {/* ตัวกรอง */}
                <button
                    type="button"
                    className={`header-button header-refresh-btn icon-only filter-trigger-btn ${isFiltersOpen ? 'active' : ''}`}
                    onClick={onOpenFilters}
                    title="ตัวกรองข้อมูล"
                    aria-label="ตัวกรองข้อมูล"
                    style={{ position: 'relative' }}
                >
                    <i className="fas fa-sliders-h"></i>
                    {activeFilterCount > 0 && <span className="header-icon-badge">{activeFilterCount}</span>}
                </button>

                <span className="header-divider" aria-hidden="true"></span>

                {/* Group 1: รายงาน */}
                <div className="header-icon-group" aria-label="รายงาน">
                    <button
                        type="button"
                        className="header-button header-refresh-btn icon-only"
                        onClick={onOpenGraph}
                        title="กราฟภาพรวม"
                        aria-label="กราฟภาพรวม"
                    >
                        <i className="fas fa-chart-bar"></i>
                    </button>

                    <button
                        type="button"
                        className="header-button header-refresh-btn icon-only"
                        onClick={onOpenSpareSummary}
                        title="สรุปอะไหล่รอของเข้า (อะไหล่ขาด)"
                        aria-label="สรุปอะไหล่รอของเข้า"
                    >
                        <i className="fas fa-boxes"></i>
                    </button>

                    <button
                        type="button"
                        className="header-button header-refresh-btn icon-only"
                        onClick={onOpenSummary}
                        title="สรุปข้อมูลรายการ"
                        aria-label="สรุปข้อมูลรายการ"
                    >
                        <i className="fas fa-list-alt"></i>
                    </button>
                </div>

                <span className="header-divider" aria-hidden="true"></span>

                {/* Group 2: จัดการข้อมูล & ซิงก์ */}
                <div className="header-icon-group" aria-label="เครื่องมือข้อมูล">
                    <button
                        type="button"
                        className="header-button header-refresh-btn icon-only"
                        onClick={onPrintTable}
                        title={selectedCount > 0 ? `พิมพ์สติกเกอร์ (${selectedCount} รายการ)` : 'พิมพ์ตาราง'}
                        aria-label="พิมพ์ตาราง"
                        style={{ position: 'relative' }}
                    >
                        <i className="fas fa-print"></i>
                        {selectedCount > 0 && <span className="header-icon-badge">{selectedCount}</span>}
                    </button>

                    <button
                        type="button"
                        className="header-button header-refresh-btn icon-only"
                        onClick={onExportCSV}
                        title="Export CSV"
                        aria-label="Export CSV"
                    >
                        <i className="fas fa-file-csv"></i>
                    </button>

                    <a
                        id="dataButton"
                        className="header-button header-refresh-btn icon-only"
                        href="https://docs.google.com/spreadsheets/d/112KOJI227dvyHy4w_gD8wuANrVPmFK_ezzZyV_uWVrE/edit?gid=1496713252#gid=1496713252"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="เปิดฐานข้อมูล Google Sheets"
                        aria-label="เปิดฐานข้อมูล Google Sheets"
                        style={{ textDecoration: 'none' }}
                    >
                        <i className="fas fa-database"></i>
                    </a>

                    <button
                        id="refreshButton"
                        type="button"
                        className={`header-button header-refresh-btn icon-only ${isLoading ? 'is-loading' : ''}`}
                        onClick={onRefresh}
                        disabled={isLoading}
                        title={isLoading ? 'กำลังโหลดข้อมูล...' : 'รีเฟรชข้อมูลล่าสุด'}
                        aria-label="รีเฟรชข้อมูลล่าสุด"
                    >
                        <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
                    </button>
                </div>

                <span className="header-divider" aria-hidden="true"></span>

                {/* Group 3: ตั้งค่า & โปรไฟล์ */}
                <button
                    ref={buttonRef}
                    id="quickSettingButton"
                    type="button"
                    className={`header-button header-refresh-btn icon-only ${showQuickSettings ? 'active' : ''}`}
                    onClick={() => setShowQuickSettings(prev => !prev)}
                    title="โปรไฟล์ & การตั้งค่า"
                    aria-label="ตั้งค่า"
                >
                    <i className="fas fa-cog"></i>
                </button>

                {showQuickSettings && (
                    <div ref={popoverRef} id="quickSettingPopover" className="quick-setting-popover show">
                        <div className="sheet-header">
                            <div className="sheet-title">โปรไฟล์ & การตั้งค่า</div>
                            <button type="button" className="sheet-close" onClick={() => setShowQuickSettings(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="sheet-user">
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

                        <div className="sheet-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                type="button"
                                className="header-button ghost"
                                onClick={() => {
                                    setShowQuickSettings(false);
                                    onUpdateGuide?.();
                                }}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <i className="fas fa-info-circle"></i><span>วิธีอัพข้อมูล</span>
                            </button>
                            <button
                                type="button"
                                className="header-button danger"
                                onClick={handleLogout}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <i className="fas fa-sign-out-alt"></i><span>ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
