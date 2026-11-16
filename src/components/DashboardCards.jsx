import React from 'react';

// Reusable card component
function DashboardCard({ title, value, percent, idBase, gradient = false, onClick, isActive }) {
    const isPercentString = typeof percent === 'string';
    const displayPercent = isPercentString ? percent : `${percent}%`;
    const widthPercent = isPercentString ? Number(percent.replace('%', '')) : percent;

    const style = gradient ? { background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)' } : {};
    const progressStyle = { width: `${widthPercent || 0}%`, ...gradient ? { backgroundColor: '#fff' } : {} };

    return (
        <div
            id={`${idBase}Card`}
            className={`dashboard-card ${idBase}-card ${isActive ? 'active' : ''}`}
            style={style}
            onClick={() => onClick(idBase)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>{title}</h3>
                {isActive && (
                    <div style={{
                        background: '#fff',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '18px', color: '#e74c3c' }}></i>
                    </div>
                )}
            </div>
            <div className="value" id={`${idBase}Value`}>{value}</div>
            <div className="progress-container">
                <div id={`${idBase}Progress`} className="progress-bar" style={progressStyle}></div>
            </div>
            <div className="progress-text" id={`${idBase}Percent`}>{displayPercent}</div>
        </div>
    );
}

export default function DashboardCards({ data = {}, onCardClick, activeCard }) {
    // Use mock values or defaults if data is empty
    const summary = {
        total: data.total || 0,
        exceedLeadtime: data.exceedLeadtime || 0,
        exceedLeadtimePercent: data.exceedLeadtimePercent || '0%',
        pending: data.pending || 0,
        pendingPercent: data.pendingPercent || '0%',
        otherPlant: data.otherPlant || 0,
        otherPlantPercent: data.otherPlantPercent || '0%',
        success: data.success || 0,
        successPercent: data.successPercent || '0%',
        nawaVipa: data.nawaVipa || 0,
        nawaVipaPercent: data.nawaVipaPercent || '0%',
        engInTeam: data.engInTeam || 0,
        engInTeamPercent: data.engInTeamPercent || '0%',
        rebuiltStock: data.rebuiltStock || 0,
        rebuiltStockPercent: data.rebuiltStockPercent || '0%',
        spacial: data.spacial || 0,
        spacialPercent: data.spacialPercent || '0%',
        request: data.request || 0,
        requestPercent: data.requestPercent || '0%',
        newPart: data.newPart || 0,
        newPartPercent: data.newPartPercent || '0%',
    };

    // totalCard is active when activeCard is null (show all)
    const isActive = (id) => {
        if (id === 'total') return activeCard === null || activeCard === 'total';
        return activeCard === id;
    };

    const hasRow1Group = summary.exceedLeadtime > 0 || summary.engInTeam > 0 || summary.rebuiltStock > 0 || summary.success > 0;
    const hasRow2Group = summary.nawaVipa > 0 || summary.request > 0 || summary.pending > 0 || summary.otherPlant > 0;

    return (
        <div id="dashboard" className="dashboard-grouped">
            {/* บรรทัดที่ 1: Call ทั้งหมด + กรอบที่ 1 */}
            <div className="dashboard-row-wrap">
                <div className="dashboard-total-slot">
                    <DashboardCard title="Call ทั้งหมด" value={summary.total} percent="100%" idBase="total" onClick={onCardClick} isActive={isActive('total')} />
                </div>

                {hasRow1Group && (
                    <div className="dashboard-group-frame">
                        {summary.exceedLeadtime > 0 && (
                            <DashboardCard title="Call (เกิน Leadtime)" value={summary.exceedLeadtime} percent={summary.exceedLeadtimePercent} idBase="exceedLeadtime" onClick={onCardClick} isActive={isActive('exceedLeadtime')} />
                        )}
                        {summary.engInTeam > 0 && (
                            <DashboardCard title="Call (มีอะไหล่ในทีม)" value={summary.engInTeam} percent={summary.engInTeamPercent} idBase="engInTeam" onClick={onCardClick} isActive={isActive('engInTeam')} />
                        )}
                        {summary.rebuiltStock > 0 && (
                            <DashboardCard title="Call (เบิกทดแทน)" value={summary.rebuiltStock} percent={summary.rebuiltStockPercent} idBase="rebuiltStock" onClick={onCardClick} isActive={isActive('rebuiltStock')} />
                        )}
                        {summary.success > 0 && (
                            <DashboardCard title="Call (ระหว่างขนส่ง)" value={summary.success} percent={summary.successPercent} idBase="success" onClick={onCardClick} isActive={isActive('success')} />
                        )}
                    </div>
                )}
            </div>

            {/* บรรทัดที่ 2: กรอบที่ 2 + การ์ดอื่นที่เหลือ */}
            {(hasRow2Group || summary.spacial > 0 || summary.newPart > 0) && (
                <div className="dashboard-row-wrap">
                    {hasRow2Group && (
                        <div className="dashboard-group-frame">
                            {summary.nawaVipa > 0 && (
                                <DashboardCard title="Call (เบิกศูนย์อะไหล่)" value={summary.nawaVipa} percent={summary.nawaVipaPercent} idBase="nawaVipa" onClick={onCardClick} isActive={isActive('nawaVipa')} />
                            )}
                            {summary.request > 0 && (
                                <DashboardCard title="Call (ขอซื้อขอซ่อม)" value={summary.request} percent={summary.requestPercent} idBase="request" onClick={onCardClick} isActive={isActive('request')} />
                            )}
                            {summary.pending > 0 && (
                                <DashboardCard title="Call ค้าง (รอของเข้า)" value={summary.pending} percent={summary.pendingPercent} idBase="pending" onClick={onCardClick} isActive={isActive('pending')} />
                            )}
                            {summary.otherPlant > 0 && (
                                <DashboardCard title="Call (ดึงจากคลังอื่น)" value={summary.otherPlant} percent={summary.otherPlantPercent} idBase="otherPlant" onClick={onCardClick} isActive={isActive('otherPlant')} />
                            )}
                        </div>
                    )}

                    {(summary.spacial > 0 || summary.newPart > 0) && (
                        <div className="dashboard-extra-slot">
                            {summary.spacial > 0 && (
                                <DashboardCard title="Call (SPACIAL)" value={summary.spacial} percent={summary.spacialPercent} idBase="spacial" gradient={true} onClick={onCardClick} isActive={isActive('spacial')} />
                            )}
                            {summary.newPart > 0 && (
                                <DashboardCard title="Call (เปิดรหัสใหม่)" value={summary.newPart} percent={summary.newPartPercent} idBase="newPart" onClick={onCardClick} isActive={isActive('newPart')} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
