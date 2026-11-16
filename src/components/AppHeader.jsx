import React from 'react';

export default function AppHeader({
    lastUpdated,
    onRefresh,
    isLoading = false,
    isScrolled = false
}) {
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
                    id="refreshButton"
                    className={`header-button header-refresh-btn icon-only ${isLoading ? 'is-loading' : ''}`}
                    onClick={onRefresh}
                    disabled={isLoading}
                    title={isLoading ? 'กำลังโหลดข้อมูล...' : 'รีเฟรชข้อมูลล่าสุด'}
                    aria-label="รีเฟรชข้อมูลล่าสุด"
                >
                    <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
                </button>
            </div>
        </header>
    );
}
