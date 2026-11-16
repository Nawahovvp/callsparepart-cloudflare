import React, { useState, useEffect, useRef } from 'react';

export default function AppHeader({
    user,
    onLogout,
    lastUpdated,
    showAllCards = false,
    onToggleAllCards,
    isScrolled = false
}) {
    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const popoverRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
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
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [popoverRef, buttonRef]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        onLogout();
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

                <button
                    ref={buttonRef}
                    id="quickSettingButton"
                    className="header-button"
                    onClick={() => setShowQuickSettings(!showQuickSettings)}
                >
                    <i className="fas fa-cog"></i><span>Setting</span>
                </button>

                {showQuickSettings && (
                    <div ref={popoverRef} id="quickSettingPopover" className="quick-setting-popover show">
                        <div className="sheet-header">
                            <div className="sheet-title">โปรไฟล์ & การตั้งค่า</div>
                            <button className="sheet-close" onClick={() => setShowQuickSettings(false)}>
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

                        {/* Combined Toggle Switch: GM Cards & Department Group Cards */}
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

                        <div className="sheet-actions">
                            <button className="header-button danger" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
                                <i className="fas fa-sign-out-alt"></i><span>ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
