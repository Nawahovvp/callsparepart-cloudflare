import React from 'react';

export default function AnalyticsCards({
    data = {},
    onOpenGraph,
    onOpenSpareSummary,
    onOver7Click,
    onWaitingResponseClick,
    onMaxCardClick,
    dashboardFilter,
    callTypeStats = [],
    onCallTypeClick,
    isAdmin = false,
    showAllCards = false
}) {
    const summary = {
        over7: data.over7 || 0,
        over7Percent: data.over7Percent || '0%',
        waitingResponse: data.waitingResponse || 0,
        waitingResponsePercent: data.waitingResponsePercent || '0%',
        maxPendingUnit: data.maxPendingUnit || '-',
        maxPendingCount: data.maxPendingCount || 0
    };

    return (
        <div id="analyticsDashboard" className="dashboard">
            <div
                id="over7Card"
                className={`dashboard-card over7-card ${dashboardFilter === 'over7' ? 'active' : ''}`}
                onClick={onOver7Click}
                style={{ cursor: 'pointer' }}
            >
                <h3>Call เกิน 7 วัน</h3>
                <div className="value">{summary.over7}</div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: summary.over7Percent }}></div>
                </div>
                <div className="progress-text">{summary.over7Percent}</div>
            </div>

            <div
                id="waitingResponseCard"
                className={`dashboard-card new-card ${dashboardFilter === 'waitingResponse' ? 'active' : ''}`}
                onClick={onWaitingResponseClick}
                style={{ cursor: 'pointer' }}
            >
                <h3>Call (รอตรวจสอบ)</h3>
                <div className="value">{summary.waitingResponse}</div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: summary.waitingResponsePercent }}></div>
                </div>
                <div className="progress-text">{summary.waitingResponsePercent}</div>
            </div>

            <div
                id="maxCard"
                className="dashboard-card max-card"
                onClick={onMaxCardClick}
                style={{ cursor: 'pointer' }}
            >
                <h3>Call ค้างสูงสุด</h3>
                <div className="value" style={{ fontSize: '0.95em', paddingBottom: '2px', lineHeight: 1.2 }}>
                    {String(summary.maxPendingUnit || '-').replace(/^Stock\s*/i, '').trim() || summary.maxPendingUnit}
                </div>
                <div className="progress-text" style={{ fontSize: '0.78em', color: 'rgba(255,255,255,0.9)' }}>
                    {summary.maxPendingCount} Call
                </div>
            </div>

            <div id="graphCard" className="dashboard-card graph-card" style={{ cursor: 'pointer' }} onClick={onOpenGraph}>
                <h3><i className="fas fa-chart-line"></i> กราฟสรุป</h3>
                <div className="value"><i className="fas fa-chart-line"></i></div>
            </div>

            <div id="spareSummaryCard" className="dashboard-card spare-card" style={{ cursor: 'pointer' }} onClick={onOpenSpareSummary}>
                <h3><i className="fas fa-list-alt"></i> สรุปอะไหล่</h3>
                <div className="value"><i className="fas fa-list-alt"></i></div>
            </div>

            {isAdmin && showAllCards && (
                <div id="gmSummaryCard" className="dashboard-card gm-summary-card" style={{ cursor: 'pointer' }} onClick={() => onMaxCardClick?.('gmSummary')}>
                    <h3><i className="fas fa-chart-pie"></i> สรุป GM (Executive)</h3>
                    <div className="value"><i className="fas fa-user-tie"></i></div>
                </div>
            )}
        </div>
    );
}
