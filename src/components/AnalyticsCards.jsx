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
    isAdmin = false
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
                <div className="value" style={{ fontSize: '1.2em', paddingBottom: '3px' }}>
                    {summary.maxPendingUnit}
                </div>
                <div className="progress-text" style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.9)' }}>
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

            {isAdmin && (
                <div id="gmSummaryCard" className="dashboard-card gm-summary-card" style={{ cursor: 'pointer' }} onClick={() => onMaxCardClick?.('gmSummary')}>
                    <h3><i className="fas fa-chart-pie"></i> สรุป GM (Executive)</h3>
                    <div className="value"><i className="fas fa-user-tie"></i></div>
                </div>
            )}
            {callTypeStats.filter((item) => item.value > 0).map((item, index) => {
                const filter = `calltype_${item.label}`;
                const typeClass = `calltype-${String(item.label).toLowerCase()}-card`;
                return (
                    <div
                        key={filter}
                        id={`callTypeCard${index}`}
                        className={`dashboard-card group-card ${typeClass} ${dashboardFilter === filter ? 'active' : ''}`}
                        onClick={() => onCallTypeClick?.(filter)}
                        style={{ minWidth: '130px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '0.8em', margin: 0 }}>{item.label}</h3>
                            {dashboardFilter === filter && (
                                <div style={{
                                    background: '#fff',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    <i className="fas fa-check-circle" style={{ fontSize: '16px', color: '#e74c3c' }}></i>
                                </div>
                            )}
                        </div>
                        <div className="value" style={{ fontSize: '1.2em' }}>{item.value}</div>
                        <div className="progress-container" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                            <div className="progress-bar" style={{ width: `${item.percent}%`, backgroundColor: '#fff' }}></div>
                        </div>
                        <div className="progress-text" style={{ color: '#fff' }}>{item.percent}%</div>
                    </div>
                );
            })}
        </div>
    );
}
