import { useEffect, useRef, useState } from 'react';
import {
  fetchAgedItemCount,
  fetchDeadStockItems,
  fetchLowStockItems,
  fetchZeroStockItems,
} from '../api/stock';

function DashboardPage({ todayCount, loadingTodayCount, totalEmployeeCount, loadingTotalEmployeeCount }) {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [zeroStockCount, setZeroStockCount] = useState(0);
  const [oldStockCount, setOldStockCount] = useState(0);
  const [deadStockCount, setDeadStockCount] = useState(0);
  const [loadingStockSummary, setLoadingStockSummary] = useState(true);
  const [stockError, setStockError] = useState('');
  const [pullRefreshOffset, setPullRefreshOffset] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullStartY = useRef(null);
  const dashboardRef = useRef(null);

  const loadingPercentage = loadingTodayCount || loadingTotalEmployeeCount;
  const attendancePercentage =
    !loadingPercentage && totalEmployeeCount > 0 && typeof todayCount === 'number'
      ? Math.round((todayCount / totalEmployeeCount) * 100)
      : null;

  const loadDashboardData = async () => {
    setLoadingStockSummary(true);
    setStockError('');
    try {
      const [lowData, zeroData, agedCount, deadData] = await Promise.all([
        fetchLowStockItems(),
        fetchZeroStockItems(),
        fetchAgedItemCount(),
        fetchDeadStockItems(),
      ]);
      setLowStockCount(Array.isArray(lowData) ? lowData.length : 0);
      setZeroStockCount(Array.isArray(zeroData) ? zeroData.length : 0);
      setOldStockCount(Number.isFinite(Number(agedCount)) ? Number(agedCount) : 0);
      setDeadStockCount(Array.isArray(deadData) ? deadData.length : 0);
    } catch (err) {
      setStockError(err.message || 'Failed to load stock summary');
    } finally {
      setLoadingStockSummary(false);
      setIsPullRefreshing(false);
      setPullRefreshOffset(0);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      await loadDashboardData();
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    if (loadingStockSummary) return;
    setIsPullRefreshing(true);
    await loadDashboardData();
  };

  const handlePullStart = (event) => {
    if (event.touches.length !== 1) return;
    const container = dashboardRef.current;
    if (!container) return;
    const atTop = container.scrollTop <= 0;
    if (!atTop) return;
    pullStartY.current = event.touches[0].clientY;
  };

  const handlePullMove = (event) => {
    if (pullStartY.current == null) return;
    const container = dashboardRef.current;
    if (!container) return;
    const delta = event.touches[0].clientY - pullStartY.current;
    if (delta <= 0) return;
    event.preventDefault();
    setPullRefreshOffset(Math.min(delta, 90));
  };

  const handlePullEnd = async () => {
    if (pullStartY.current == null) return;
    pullStartY.current = null;
    if (pullRefreshOffset >= 70) {
      await handleRefresh();
    } else {
      setPullRefreshOffset(0);
    }
  };

  return (
    <div
      ref={dashboardRef}
      className="dashboard-shell"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      onTouchCancel={handlePullEnd}
    >
      <div className={`pull-refresh-indicator ${isPullRefreshing || pullRefreshOffset > 0 ? 'visible' : ''}`} style={{ height: `${Math.max(pullRefreshOffset, isPullRefreshing ? 48 : 0)}px` }}>
        {isPullRefreshing ? 'Refreshing…' : pullRefreshOffset >= 70 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      <div className="dashboard-header">
        <p className="eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p className="subtitle">A quick overview of attendance and inventory activity.</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="stat-label">Employees checked in today</span>
          <strong className="stat-value">
            {loadingTodayCount ? 'Loading…' : todayCount ?? '—'}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Attendance percentage</span>
          <strong className="stat-value">
            {loadingPercentage ? 'Loading…' : attendancePercentage !== null ? `${attendancePercentage}%` : '—'}
          </strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="stat-label">Low stock items</span>
          <strong className="stat-value">
            {loadingStockSummary ? '…' : stockError ? '!' : lowStockCount}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Zero stock items</span>
          <strong className="stat-value">
            {loadingStockSummary ? '…' : stockError ? '!' : zeroStockCount}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Older than 6 months</span>
          <strong className="stat-value">
            {loadingStockSummary ? '…' : stockError ? '!' : oldStockCount}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Dead stock</span>
          <strong className="stat-value">
            {loadingStockSummary ? '…' : stockError ? '!' : deadStockCount}
          </strong>
        </div>
      </div>

      {stockError ? <p className="error-text">{stockError}</p> : null}
    </div>
  );
}

export default DashboardPage;
