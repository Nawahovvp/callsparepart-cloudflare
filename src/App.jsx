import React, { lazy, Suspense, useState, useEffect } from 'react';
import './index.css';

// Components
import LoginModal from './components/LoginModal';
import AppHeader from './components/AppHeader';
import DashboardCards from './components/DashboardCards';
import AnalyticsCards from './components/AnalyticsCards';
import GroupCards from './components/GroupCards';
import ControlPanel from './components/ControlPanel';
import DataTable from './components/DataTable';
import RightMenuBar from './components/RightMenuBar';
import { useAppData } from './hooks/useAppData';
import { PLANT_MAPPING, exportToCSV } from './utils/helpers';

const lazyNamed = (loadModule, exportName) =>
  lazy(() => loadModule().then((module) => ({ default: module[exportName] })));

const GraphModal = lazyNamed(() => import('./components/Modals'), 'GraphModal');
const SummaryModal = lazyNamed(() => import('./components/Modals'), 'SummaryModal');
const SpareSummaryModal = lazyNamed(() => import('./components/Modals'), 'SpareSummaryModal');
const OutsideRequestModal = lazyNamed(() => import('./components/Modals'), 'OutsideRequestModal');
const StickerModal = lazyNamed(() => import('./components/Modals'), 'StickerModal');
const UpdateGuideModal = lazyNamed(() => import('./components/Modals'), 'UpdateGuideModal');
const PoDetailsModal = lazyNamed(() => import('./components/TableModals'), 'PoDetailsModal');
const PrDetailsModal = lazyNamed(() => import('./components/TableModals'), 'PrDetailsModal');
const OtherPlantModal = lazyNamed(() => import('./components/TableModals'), 'OtherPlantModal');
const StatusEditModal = lazyNamed(() => import('./components/TableModals'), 'StatusEditModal');
const ProjectModal = lazyNamed(() => import('./components/TableModals'), 'ProjectModal');
const TimelineModal = lazyNamed(() => import('./components/TableModals'), 'TimelineModal');
const EngDetailsModal = lazyNamed(() => import('./components/TableModals'), 'EngDetailsModal');
const SpareSummaryPage = lazy(() => import('./components/SpareSummaryPage'));
const GMSummaryPage = lazy(() => import('./components/GMSummaryPage'));

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [rightDrawerTab, setRightDrawerTab] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'day');
    document.body.className = 'theme-day';
    localStorage.removeItem('app_theme');
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const top = window.scrollY || document.documentElement.scrollTop;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          setScrollY(top);
          setScrollProgress(max > 0 ? Math.min(100, Math.max(0, (top / max) * 100)) : 0);
          setShowScrollTop(top > 220);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAllCards, setShowAllCards] = useState(() => {
    const saved = localStorage.getItem('showAllCards');
    if (saved !== null) return saved === 'true';
    const legacyHide = localStorage.getItem('hideDeptCards') ?? localStorage.getItem('hideNonStockDept');
    return legacyHide !== null ? legacyHide === 'false' : false;
  });

  useEffect(() => {
    const cachedUserStr = localStorage.getItem('user');
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr);
        const loginTime = cachedUser.loginTime || 0;
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (now - loginTime > twentyFourHours) {
          localStorage.removeItem('user');
          setIsLoggedIn(false);
          setCurrentUser(null);
        } else {
          setCurrentUser(cachedUser);
          setIsLoggedIn(true);
        }
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const {
    data,
    allData,
    isLoading,
    error,
    lastUpdated,
    summary,
    availableFilters,
    rawSources,
    teamPlantFilter, setTeamPlantFilter,
    pendingUnitFilter, setPendingUnitFilter,
    stockAnswerFilter, setStockAnswerFilter,
    statusCallFilter, setStatusCallFilter,
    searchTerm, setSearchTerm,
    dashboardFilter, setDashboardFilter,
    gmFilter, setGmFilter,
    deptGroupFilter, setDeptGroupFilter,
    engData,
    refreshData,
    refreshDataBackground,
    updateRowLocally,
    handleOutsideRequest
  } = useAppData();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState({ key: 'StatusCall', direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState([]);

  // Modal states
  const [graphOpen, setGraphOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [spareSummaryOpen, setSpareSummaryOpen] = useState(false);
  const [gmSummaryOpen, setGmSummaryOpen] = useState(false);

  // Table interaction modal states
  const [poModal, setPoModal] = useState({ open: false, row: null });
  const [prModal, setPrModal] = useState({ open: false, row: null });
  const [otherPlantModal, setOtherPlantModal] = useState({ open: false, row: null });
  const [rebuiltModal, setRebuiltModal] = useState({ open: false, row: null });
  const [statusEditModal, setStatusEditModal] = useState({ open: false, row: null });
  const [spacialModal, setSpacialModal] = useState({ open: false, row: null });
  const [timelineModal, setTimelineModal] = useState({ open: false, row: null });
  const [outsideRequestModal, setOutsideRequestModal] = useState({ open: false, row: null });
  const [stickerModal, setStickerModal] = useState({ open: false, row: null });
  const [engModal, setEngModal] = useState({ open: false, row: null });
  const [updateGuideOpen, setUpdateGuideOpen] = useState(false);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Default sort: StatusCall ascending
  const tableData = React.useMemo(() => {
    const ticketCounts = new Map();
    allData.forEach(row => {
      const ticket = String(row?.['Ticket Number'] || '').replace(/^'/, '').trim();
      if (ticket) ticketCounts.set(ticket, (ticketCounts.get(ticket) || 0) + 1);
    });

    const isWrongCodeRow = (row) => {
      const statusX = String(row?.StatusX || row?.StatusCall || '').trim();
      const description = String(row?.Description || '').trim();
      return statusX === 'แจ้งCodeผิด' || description === 'Code ผิด';
    };

    return data
      .filter(row => {
        const ticket = String(row?.['Ticket Number'] || '').replace(/^'/, '').trim();
        return !(ticketCounts.get(ticket) > 1 && isWrongCodeRow(row));
      })
      .map(row => {
        const ticket = String(row?.['Ticket Number'] || '').replace(/^'/, '').trim();
        if ((ticketCounts.get(ticket) || 0) <= 1 && isWrongCodeRow(row)) {
          return {
            ...row,
            _rawMaterial: row._rawMaterial ?? row.Material,
            Material: ''
          };
        }
        return row;
      });
  }, [data, allData]);

  const sortedData = React.useMemo(() => {
    let items = [...tableData];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'DayRepair') {
          const dayA = parseFloat(valA) || 0;
          const dayB = parseFloat(valB) || 0;
          if (dayA !== dayB) return sortConfig.direction === 'asc' ? dayA - dayB : dayB - dayA;
          return (a["Ticket Number"] || "").localeCompare(b["Ticket Number"] || "");
        }
        if (sortConfig.key === 'PendingStockDays') {
          const daysA = parseFloat(String(valA ?? "0").replace(/,/g, "")) || 0;
          const daysB = parseFloat(String(valB ?? "0").replace(/,/g, "")) || 0;
          if (daysA !== daysB) return sortConfig.direction === 'asc' ? daysA - daysB : daysB - daysA;
          return (a["Ticket Number"] || "").localeCompare(b["Ticket Number"] || "");
        }
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        return sortConfig.direction === 'asc'
          ? (valA > valB ? 1 : valA < valB ? -1 : 0)
          : (valA < valB ? 1 : valA > valB ? -1 : 0);
      });
    } else {
      // Default sort: StatusGroup ASC (StatusCall น้อยไปมาก), then DayRepair DESC (ผ่านมา มากไปน้อย), then Ticket Number ASC
      items.sort((a, b) => {
        const statusA = String(a["StatusGroup"] || a["StatusCall"] || "").toLowerCase();
        const statusB = String(b["StatusGroup"] || b["StatusCall"] || "").toLowerCase();
        if (statusA !== statusB) return statusA > statusB ? 1 : -1;
        const dayA = parseFloat(a["DayRepair"]) || 0;
        const dayB = parseFloat(b["DayRepair"]) || 0;
        if (dayA !== dayB) return dayB - dayA;
        return (a["Ticket Number"] || "").localeCompare(b["Ticket Number"] || "");
      });
    }
    return items;
  }, [tableData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalQuantity = React.useMemo(
    () => sortedData.reduce((sum, r) => sum + (parseFloat(String(r['จำนวน'] || '0').replace(/,/g, '')) || 0), 0),
    [sortedData]
  );

  // Resolve logged-in user's default "ค้างหน่วยงาน" unit from available pending units
  const userDefaultPendingUnit = React.useMemo(() => {
    const unitMap = availableFilters?.pendingUnit;
    if (!currentUser || !unitMap) return '';
    const keys = Object.keys(unitMap);
    if (keys.length === 0) return '';

    const normalize = (val) => String(val || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const findKey = (target) => {
      const normTarget = normalize(target);
      if (!normTarget) return '';
      return keys.find((k) => normalize(k) === normTarget) || '';
    };

    const byDept = findKey(currentUser['หน่วยงาน']);
    if (byDept) return byDept;

    const userPlant = String(currentUser.Plant || '').trim();
    if (userPlant) {
      const mappedEntry = Object.entries(PLANT_MAPPING).find(
        ([unit, code]) => !/^\d+$/.test(unit) && String(code).trim() === userPlant
      );
      if (mappedEntry) {
        const byPlant = findKey(mappedEntry[0]);
        if (byPlant) return byPlant;
      }
    }

    const byUnit = findKey(currentUser.Unit);
    if (byUnit) return byUnit;

    return '';
  }, [currentUser, availableFilters?.pendingUnit]);

  const appliedDefaultUnitUserRef = React.useRef(null);
  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      appliedDefaultUnitUserRef.current = null;
      return;
    }
    const userKey = currentUser.IDRec || currentUser.Name || 'logged_in';
    if (appliedDefaultUnitUserRef.current === userKey) return;
    if (!availableFilters?.pendingUnit || Object.keys(availableFilters.pendingUnit).length === 0) return;

    appliedDefaultUnitUserRef.current = userKey;
    if (userDefaultPendingUnit) {
      setPendingUnitFilter(userDefaultPendingUnit);
      setCurrentPage(1);
    }
  }, [isLoggedIn, currentUser, availableFilters?.pendingUnit, userDefaultPendingUnit, setPendingUnitFilter]);

  const secondaryFilterCount = [
    teamPlantFilter,
    stockAnswerFilter,
    statusCallFilter,
    dashboardFilter,
    gmFilter
  ].filter(Boolean).length;

  const activeFilterCount = secondaryFilterCount + (pendingUnitFilter ? 1 : 0);

  const handlePrintAction = async () => {
    if (selectedRows.length > 0) {
      const selectedData = allData.filter(r => selectedRows.includes(r.id));
      try {
        const { printStickers } = await import('./utils/stickerPrint');
        await printStickers(selectedData);
      } catch (error) {
        console.error('Sticker printing failed:', error);
        alert('ไม่สามารถพิมพ์สติกเกอร์ได้');
      }
    } else {
      window.print();
    }
  };

  const handleExportCsvAction = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(sortedData, `Call_Export_${timestamp}.csv`);
  };

  // Toggle all summary cards (GM & Dept Group) and show/hide full data
  const handleToggleAllCards = () => {
    setShowAllCards(prev => {
      const next = !prev;
      localStorage.setItem('showAllCards', String(next));
      localStorage.setItem('hideDeptCards', String(!next));
      if (next) {
        setDeptGroupFilter(null);
      } else {
        setDeptGroupFilter('Stock');
      }
      return next;
    });
    setCurrentPage(1);
  };

  // Dashboard card click handler
  const handleDashboardClick = (filter) => {
    setCurrentPage(1);

    // Case 1: Total Reset
    if (filter === 'total') {
      setDashboardFilter(null);
      setGmFilter(null);
      setDeptGroupFilter(showAllCards ? null : 'Stock');
      // Reset all other filters
      setTeamPlantFilter('');
      setPendingUnitFilter('');
      setStockAnswerFilter('');
      setStatusCallFilter('');
      setSearchTerm('');
      return;
    }

    // Case 2: GM Hierarchical Filter
    if (filter.startsWith && filter.startsWith('gm_')) {
      const gmName = filter.replace('gm_', '');
      // Toggle logic for GM
      setGmFilter(prev => prev === gmName ? null : gmName);
      return;
    }

    // Case 2b: Dept Group Filter
    if (filter.startsWith && filter.startsWith('dept_')) {
      const deptName = filter.replace('dept_', '');
      setDeptGroupFilter(prev => prev === deptName ? null : deptName);
      return;
    }

    // Case 3: Status/Type Dashboard Filter
    // Toggle logic for general dashboard filters
    setDashboardFilter(prev => prev === filter ? null : filter);
  };

  // Analytics card handlers
  const handleOver7Click = () => {
    setDashboardFilter('over7');
    setCurrentPage(1);
  };

  const handleWaitingResponseClick = () => {
    setDashboardFilter('waitingResponse');
    setCurrentPage(1);
  };

  const handleMaxCardClick = (type) => {
    if (type === 'gmSummary') {
      if (currentUser?.Status !== 'Admin') return; // Admin only
      setGmSummaryOpen(true);
      return;
    }
    if (summary.maxPendingUnit && summary.maxPendingUnit !== '-') {
      setPendingUnitFilter(summary.maxPendingUnit);
      setDashboardFilter(null);
      setCurrentPage(1);
    }
  };

  // Table interaction handlers
  const handlePoClick = (row) => setPoModal({ open: true, row });
  const handlePrClick = (row) => setPrModal({ open: true, row });
  const handleOtherPlantClick = (row) => setOtherPlantModal({ open: true, row });
  const handleRebuiltClick = (row) => setRebuiltModal({ open: true, row });
  const handleStatusXClick = (row) => setStatusEditModal({ open: true, row });
  const handleStatusGroupClick = (row) => setSpacialModal({ open: true, row });
  const handleDetailClick = (row) => setTimelineModal({ open: true, row });
  const handleEngClick = (row) => setEngModal({ open: true, row });
  const handleNawaClick = (row) => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const userPlant = user.Plant || localStorage.getItem('userPlant') || '';
    const pendingUnit = row["ค้างหน่วยงาน"] ? row["ค้างหน่วยงาน"].toString().trim() : '';
    const requiredPlant = PLANT_MAPPING[pendingUnit];

    if (!userPlant || !requiredPlant || userPlant.trim() !== requiredPlant.trim()) {
      return;
    }
    setOutsideRequestModal({ open: true, row });
  };
  const handleTicketClick = (row) => setStickerModal({ open: true, row });

  // After status edit save, refresh data optimistically
  const handleStatusEditSaved = (actionType, ticket, material, newStatus) => {
    console.log(`Status ${actionType}: Ticket=${ticket}, Material=${material}, Status=${newStatus}`);
    if (actionType === 'delete') {
      const targetRow = allData.find(r =>
        String(r["Ticket Number"]).trim() === String(ticket).trim() &&
        String(r["Material"]).trim() === String(material).trim()
      );
      const fallbackStatus = targetRow?.TempStatusX || "รอของเข้า";
      console.log(`Fallback optimistic to: ${fallbackStatus}`);
      updateRowLocally(ticket, material, { StatusX: fallbackStatus, StatusCall: fallbackStatus, _highlight: 'delete', _highlightKey: Date.now() });
    } else {
      updateRowLocally(ticket, material, { StatusX: newStatus, StatusCall: newStatus, _highlight: 'update', _highlightKey: Date.now() });
    }
    // Delayed fresh background re-fetch after GAS has processed the write
    setTimeout(() => refreshDataBackground(true), 4000);
  };

  // After project save, refresh data optimistically
  const handleSpacialSaved = (actionType, ticket, statusCall, project) => {
    console.log(`SPACIAL ${actionType}: Ticket=${ticket}, StatusCall=${statusCall}, Project=${project}`);
    if (actionType === 'delete') {
      const targetRow = allData.find(r => String(r["Ticket Number"]).trim() === String(ticket).trim());
      const fallbackStatus = targetRow?.TempStatusX || "รอของเข้า";
      updateRowLocally(ticket, null, { StatusCall: fallbackStatus, Answer1: "-", _highlight: 'delete', _highlightKey: Date.now() });
    } else {
      updateRowLocally(ticket, null, { StatusCall: statusCall, Answer1: project, _highlight: 'update', _highlightKey: Date.now() });
    }
    // Delayed fresh background re-fetch after GAS has processed the write
    setTimeout(() => refreshDataBackground(true), 4000);
  };

  // Simple routing logic
  const queryParams = new URLSearchParams(window.location.search);
  const currentPagePath = queryParams.get('page');

  if (currentPagePath === 'spare-summary') {
    return (
      <Suspense fallback={null}>
        <SpareSummaryPage
          data={data}
          rawSources={rawSources}
          isLoading={isLoading}
          onClose={() => window.close()}
        />
      </Suspense>
    );
  }

  if ((currentPagePath === 'gm-summary' || gmSummaryOpen) && currentUser?.Status === 'Admin') {
    return (
      <Suspense fallback={null}>
        <GMSummaryPage
          data={allData}
          onClose={() => setGmSummaryOpen(false)}
        />
      </Suspense>
    );
  }

  return (
    <>
      {/* Scroll Progress Indicator Bar */}
      <div className="scroll-progress-container" aria-hidden="true">
        <div
          className="scroll-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Ambient Parallax Orbs */}
      <div className="ambient-parallax-bg" aria-hidden="true">
        <div
          className="ambient-orb orb-1"
          style={{ transform: `translate3d(0, ${scrollY * 0.12}px, 0)` }}
        />
        <div
          className="ambient-orb orb-2"
          style={{ transform: `translate3d(0, ${scrollY * -0.08}px, 0)` }}
        />
        <div
          className="ambient-orb orb-3"
          style={{ transform: `translate3d(0, ${scrollY * 0.05}px, 0)` }}
        />
      </div>

      {!isLoggedIn && (
        <LoginModal onLoginSuccess={(user) => {
          const userWithTime = { ...user, loginTime: Date.now() };
          setIsLoggedIn(true);
          setCurrentUser(userWithTime);
          localStorage.setItem('user', JSON.stringify(userWithTime));
        }} />
      )}

      {isLoggedIn && (
        <div id="appContent" className="app-content">
          <AppHeader
            user={currentUser}
            onLogout={() => {
              localStorage.removeItem('user');
              setIsLoggedIn(false);
              setCurrentUser(null);
              setPendingUnitFilter('');
            }}
            lastUpdated={lastUpdated}
            onRefresh={refreshData}
            isLoading={isLoading}
            isScrolled={scrollY > 25}
            showAllCards={showAllCards}
            onToggleAllCards={handleToggleAllCards}
            onOpenGraph={() => setGraphOpen(true)}
            onOpenSpareSummary={() => window.open('?page=spare-summary', '_blank')}
            onOpenSummary={() => setSummaryOpen(true)}
            onPrintTable={handlePrintAction}
            onExportCSV={handleExportCsvAction}
            onUpdateGuide={() => setUpdateGuideOpen(true)}
            selectedCount={selectedRows.length}
            onOpenFilters={() => setRightDrawerTab(prev => prev === 'filters' ? null : 'filters')}
            isFiltersOpen={rightDrawerTab === 'filters'}
            activeFilterCount={secondaryFilterCount}
          />

          {error && (
            <div role="alert" style={{
              margin: '12px 20px',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#842029',
              background: '#f8d7da',
              border: '1px solid #f5c2c7'
            }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-color)', overflow: 'hidden'
            }}>
              <style>{`
                @keyframes app-cw    { to { transform: rotate(360deg); } }
                @keyframes app-ccw   { to { transform: rotate(-360deg); } }
                @keyframes app-pulse {
                  0%,100% { box-shadow: 0 0 0 0 rgba(0,123,255,0.45); transform: scale(1); }
                  50%     { box-shadow: 0 0 36px 14px rgba(0,123,255,0.1); transform: scale(1.08); }
                }
                @keyframes app-bounce {
                  0%,80%,100% { transform: translateY(0); opacity: 0.3; }
                  40%         { transform: translateY(-12px); opacity: 1; }
                }
                @keyframes app-shimmer {
                  0%   { transform: translateX(-100%); }
                  100% { transform: translateX(400%); }
                }
                @keyframes app-float {
                  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
                  10%  { opacity: 0.55; }
                  90%  { opacity: 0.55; }
                  100% { transform: translateY(-110px) translateX(18px) scale(1.1); opacity: 0; }
                }
                @keyframes app-fadein {
                  from { opacity: 0; transform: translateY(22px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes app-scan {
                  0%   { top: -8%; }
                  100% { top: 108%; }
                }
              `}</style>

              {/* Floating ambient particles */}
              {[...Array(12)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
                  width: `${5 + (i % 5) * 5}px`, height: `${5 + (i % 5) * 5}px`,
                  background: i % 3 === 0 ? 'rgba(0,123,255,0.2)' : i % 3 === 1 ? 'rgba(253,126,20,0.16)' : 'rgba(25,135,84,0.18)',
                  left: `${5 + i * 8}%`, bottom: `${8 + (i % 5) * 6}%`,
                  animation: `app-float ${3 + i * 0.32}s ease-in-out ${i * 0.22}s infinite`
                }} />
              ))}

              {/* Outer glow ring (decorative) */}
              <div style={{
                position: 'absolute', width: 280, height: 280, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,123,255,0.06) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              {/* Triple-orbit spinner */}
              <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 44 }}>
                {/* Orbit 1 — blue, fast cw */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '4px solid transparent',
                  borderTopColor: '#007bff',
                  borderRightColor: 'rgba(0,123,255,0.2)',
                  animation: 'app-cw 1.6s linear infinite'
                }} />
                {/* Orbit 2 — orange, medium ccw */}
                <div style={{
                  position: 'absolute', inset: 20, borderRadius: '50%',
                  border: '4px solid transparent',
                  borderTopColor: '#fd7e14',
                  borderLeftColor: 'rgba(253,126,20,0.2)',
                  animation: 'app-ccw 1.1s linear infinite'
                }} />
                {/* Orbit 3 — green, fast2 cw */}
                <div style={{
                  position: 'absolute', inset: 40, borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: '#198754',
                  borderRightColor: 'rgba(25,135,84,0.2)',
                  animation: 'app-cw 0.75s linear infinite'
                }} />
                {/* Center badge pulsing */}
                <div style={{
                  position: 'absolute', inset: 58, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'app-pulse 2.2s ease-in-out infinite',
                  boxShadow: '0 8px 24px rgba(0,123,255,0.35)'
                }}>
                  <i className="fas fa-truck-fast" style={{ fontSize: 26, color: '#fff' }} />
                </div>
              </div>

              {/* Text block */}
              <div style={{ textAlign: 'center', animation: 'app-fadein 0.8s ease both' }}>
                <div style={{
                  fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px',
                  color: 'var(--text-primary)', marginBottom: 8
                }}>
                  กำลังเตรียมระบบ
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
                  ดึงข้อมูล Call · PR · PO · Stock เพื่อแสดงผล
                </div>

                {/* Bounce dots */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
                  {[
                    { color: '#007bff', delay: '0s' },
                    { color: '#fd7e14', delay: '0.18s' },
                    { color: '#198754', delay: '0.36s' },
                  ].map(({ color, delay }, i) => (
                    <span key={i} style={{
                      display: 'inline-block', width: 12, height: 12,
                      borderRadius: '50%', background: color,
                      animation: `app-bounce 1.3s ease-in-out ${delay} infinite`
                    }} />
                  ))}
                </div>

                {/* Shimmer progress bar */}
                <div style={{
                  width: 320, height: 5, borderRadius: 999,
                  background: 'rgba(0,0,0,0.08)', overflow: 'hidden',
                  position: 'relative', margin: '0 auto'
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', width: '35%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, transparent, #007bff 50%, transparent)',
                    animation: 'app-shimmer 1.7s ease-in-out infinite'
                  }} />
                </div>
              </div>
            </div>

          ) : (
            <div className="workspace-shell">
              <div className="workspace-main">
                {showAllCards && (
                  <div className="scroll-reveal-section delay-1">
                    <GroupCards
                      title="สรุปผลตาม GM"
                      stats={summary.gmStats}
                      onCardClick={handleDashboardClick}
                      activeFilter={gmFilter}
                      prefix="gm_"
                    />
                  </div>
                )}

                {showAllCards && (
                  <div className="scroll-reveal-section delay-2">
                    <GroupCards
                      title="สรุปผลตามกลุ่มหน่วยงาน"
                      stats={summary.deptGroupStats}
                      onCardClick={handleDashboardClick}
                      activeFilter={deptGroupFilter}
                      prefix="dept_"
                      showZero={true}
                    />
                  </div>
                )}

                <div className="scroll-reveal-section delay-3">
                  <DashboardCards
                    data={summary}
                    onCardClick={handleDashboardClick}
                    activeCard={dashboardFilter}
                  />
                </div>

                <div className="scroll-reveal-section delay-4">
                  <AnalyticsCards
                    data={summary}
                    onOpenGraph={() => setGraphOpen(true)}
                    onOpenSpareSummary={() => window.open('?page=spare-summary', '_blank')}
                    onOver7Click={handleOver7Click}
                    onWaitingResponseClick={handleWaitingResponseClick}
                    onMaxCardClick={handleMaxCardClick}
                    dashboardFilter={dashboardFilter}
                    callTypeStats={summary.callTypeStats}
                    onCallTypeClick={handleDashboardClick}
                    isAdmin={currentUser?.Status === 'Admin'}
                    showAllCards={showAllCards}
                  />
                </div>

                <div className="scroll-reveal-section delay-5">
                  <ControlPanel
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={() => setCurrentPage(1)}
                    teamPlantFilter={teamPlantFilter}
                    pendingUnitFilter={pendingUnitFilter}
                    stockAnswerFilter={stockAnswerFilter}
                    statusCallFilter={statusCallFilter}
                    dashboardFilter={dashboardFilter}
                    gmFilter={gmFilter}
                    onTeamPlantChange={(v) => { setTeamPlantFilter(v); setCurrentPage(1); }}
                    onPendingUnitChange={(v) => { setPendingUnitFilter(v); setCurrentPage(1); }}
                    onStockAnswerChange={(v) => { setStockAnswerFilter(v); setCurrentPage(1); }}
                    onClearAllFilters={() => handleDashboardClick('total')}
                    onOpenFilters={() => setRightDrawerTab(prev => prev === 'filters' ? null : 'filters')}
                    totalCount={sortedData.length}
                    totalQuantity={totalQuantity}
                    activeFilterCount={secondaryFilterCount}
                    pendingUnitOptions={availableFilters?.pendingUnit}
                    pendingUnitAllDone={availableFilters?.pendingUnitAllDone}
                    userPendingUnit={userDefaultPendingUnit}
                  />
                </div>

                <div className="scroll-reveal-section delay-6">
                  <DataTable
                    data={paginatedData}
                    isLoading={isLoading}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                    selectedRows={selectedRows}
                    onSelectAll={(e) => setSelectedRows(e.target.checked ? paginatedData.map(r => r.id) : [])}
                    onSelectRow={(id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onPoClick={handlePoClick}
                    onPrClick={handlePrClick}
                    onOtherPlantClick={handleOtherPlantClick}
                    onRebuiltClick={handleRebuiltClick}
                    onStatusXClick={handleStatusXClick}
                    onStatusGroupClick={handleStatusGroupClick}
                    onDetailClick={handleDetailClick}
                    onEngClick={handleEngClick}
                    onNawaClick={handleNawaClick}
                    onTicketClick={handleTicketClick}
                  />
                </div>
              </div>

              <RightMenuBar
                activeTab={rightDrawerTab}
                onTabChange={setRightDrawerTab}
                availableFilters={availableFilters}
                teamPlantFilter={teamPlantFilter}
                pendingUnitFilter={pendingUnitFilter}
                stockAnswerFilter={stockAnswerFilter}
                callTypeStats={summary.callTypeStats}
                dashboardFilter={dashboardFilter}
                onTeamPlantChange={(v) => { setTeamPlantFilter(v); setCurrentPage(1); }}
                onPendingUnitChange={(v) => { setPendingUnitFilter(v); setCurrentPage(1); }}
                onStockAnswerChange={(v) => { setStockAnswerFilter(v); setCurrentPage(1); }}
                onCallTypeClick={handleDashboardClick}
                onClearAllFilters={() => handleDashboardClick('total')}
                activeFilterCount={activeFilterCount}
                onOpenGraph={() => setGraphOpen(true)}
                onOpenSpareSummary={() => window.open('?page=spare-summary', '_blank')}
                onOpenSummary={() => setSummaryOpen(true)}
                onPrintTable={handlePrintAction}
                onExportCSV={handleExportCsvAction}
                onUpdateGuide={() => setUpdateGuideOpen(true)}
                selectedCount={selectedRows.length}
                user={currentUser}
                onLogout={() => {
                  localStorage.removeItem('user');
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                }}
                showAllCards={showAllCards}
                onToggleAllCards={handleToggleAllCards}
              />

              {selectedRows.length > 0 && (
                <div className="floating-selection-bar">
                  <span className="floating-selection-count">
                    <i className="fas fa-check-square"></i> เลือกแล้ว <strong>{selectedRows.length}</strong> รายการ
                  </span>
                  <button type="button" className="floating-sel-btn primary" onClick={handlePrintAction}>
                    <i className="fas fa-print"></i> พิมพ์สติกเกอร์
                  </button>
                  <button type="button" className="floating-sel-btn ghost" onClick={() => setSelectedRows([])}>
                    <i className="fas fa-times"></i> ยกเลิก
                  </button>
                </div>
              )}
            </div>
          )}

          <Suspense fallback={null}>
            {graphOpen && (
              <GraphModal
                isOpen
                onClose={() => setGraphOpen(false)}
                data={data}
                onFilterPendingUnit={(unit) => {
                  setPendingUnitFilter(unit);
                  setTeamPlantFilter('');
                  setStockAnswerFilter('');
                  setStatusCallFilter('');
                  setSearchTerm('');
                  setDashboardFilter(null);
                  setCurrentPage(1);
                }}
              />
            )}
            {summaryOpen && (
              <SummaryModal
                isOpen
                onClose={() => setSummaryOpen(false)}
                data={data}
              />
            )}
            {spareSummaryOpen && (
              <SpareSummaryModal
                isOpen
                onClose={() => setSpareSummaryOpen(false)}
                data={data}
                rawSources={rawSources}
                isLoading={isLoading}
              />
            )}

            {poModal.open && (
              <PoDetailsModal
                isOpen
                onClose={() => setPoModal({ open: false, row: null })}
                material={poModal.row?.["Material"]}
                description={poModal.row?.["Description"] || poModal.row?.["Discription"] || ""}
                poRawData={rawSources.poRawData}
                nawaRawData={rawSources.nawaRawData}
              />
            )}
            {prModal.open && (
              <PrDetailsModal
                isOpen
                onClose={() => setPrModal({ open: false, row: null })}
                material={prModal.row?.["Material"]}
                description={prModal.row?.["Description"] || prModal.row?.["Discription"] || ""}
                prRawData={rawSources.prRawData}
              />
            )}
            {otherPlantModal.open && (
              <OtherPlantModal
                isOpen
                onClose={() => setOtherPlantModal({ open: false, row: null })}
                material={otherPlantModal.row?.["Material"]}
                description={otherPlantModal.row?.["Description"] || otherPlantModal.row?.["Discription"] || ""}
                plantStockData={rawSources.plantStockData}
              />
            )}
            {rebuiltModal.open && (
              <OtherPlantModal
                isOpen
                onClose={() => setRebuiltModal({ open: false, row: null })}
                material={rebuiltModal.row?.["Rebuilt"]}
                description={rebuiltModal.row?.["RebuiltDescription"] || ""}
                plantStockData={rawSources.plantStockData}
                title="รายละเอียดพื้นที่อื่น (อะไหล่ทดแทน)"
              />
            )}
            {statusEditModal.open && (
              <StatusEditModal
                isOpen
                onClose={() => setStatusEditModal({ open: false, row: null })}
                row={statusEditModal.row}
                allData={allData}
                onSaved={handleStatusEditSaved}
                currentUser={currentUser}
              />
            )}
            {spacialModal.open && (
              <ProjectModal
                isOpen
                onClose={() => setSpacialModal({ open: false, row: null })}
                row={spacialModal.row}
                onSaved={handleSpacialSaved}
                currentUser={currentUser}
              />
            )}
            {timelineModal.open && (
              <TimelineModal
                isOpen
                onClose={() => setTimelineModal({ open: false, row: null })}
                row={timelineModal.row}
              />
            )}
            {outsideRequestModal.open && (
              <OutsideRequestModal
                isOpen
                onClose={() => setOutsideRequestModal({ open: false, row: null })}
                row={outsideRequestModal.row}
                onSubmit={async (payload) => {
                  try {
                    await handleOutsideRequest(payload);
                  } catch (err) {
                    alert('ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                    throw err;
                  }
                }}
              />
            )}
            {stickerModal.open && (
              <StickerModal
                isOpen
                onClose={() => setStickerModal({ open: false, row: null })}
                row={stickerModal.row}
              />
            )}
            {engModal.open && (
              <EngDetailsModal
                isOpen
                onClose={() => setEngModal({ open: false, row: null })}
                row={engModal.row}
                engData={engData}
              />
            )}
            {updateGuideOpen && (
              <UpdateGuideModal
                isOpen
                onClose={() => setUpdateGuideOpen(false)}
              />
            )}
          </Suspense>

          {/* Interactive Floating Back-to-Top Button with Circular Progress Ring */}
          <button
            type="button"
            className={`floating-back-to-top ${showScrollTop ? 'visible' : ''}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="เลื่อนขึ้นด้านบนสุด (Scroll to Top)"
            aria-label="เลื่อนขึ้นด้านบนสุด"
          >
            <svg className="progress-ring" width="46" height="46" viewBox="0 0 46 46">
              <circle
                className="progress-ring-track"
                cx="23"
                cy="23"
                r="19"
              />
              <circle
                className="progress-ring-fill"
                cx="23"
                cy="23"
                r="19"
                style={{
                  strokeDasharray: 119.38,
                  strokeDashoffset: 119.38 - (119.38 * (scrollProgress || 0)) / 100
                }}
              />
            </svg>
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>
      )}
    </>
  );
}

export default App;
