import { useEffect, useState } from 'react';
import '../App.css';
import { getApiBaseUrl } from '../api/config';
import { fetchWithAuthJson, fetchWithAuth } from '../api/apiClient';

function AttendanceListPage({ activeView }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const [checkingOut, setCheckingOut] = useState({});
  const [checkoutSuccess, setCheckoutSuccess] = useState({});

  const loadAttendance = async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const data = await fetchWithAuthJson(`${getApiBaseUrl()}/attendance/date/${today}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load attendance');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'attendance-list') {
      loadAttendance();
    }
  }, [activeView]);

  const handleCheckout = async (row) => {
    const id = row.id ?? row.attendanceid ?? row.attendanceId;
    if (!id) return;

    setCheckingOut((s) => ({ ...s, [id]: true }));
    try {
      const now = new Date();
      const checkouttime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const empId = row.employee?.employeeid ?? row.employeeid ?? null;
      const payload = {
        ...row,
        checkouttime,
        employee: {
          employeeid: empId,
        },
      };

      const res = await fetchWithAuth(`${getApiBaseUrl()}/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Unable to checkout: ${res.status} ${res.statusText} ${body}`);
      }

      // refresh list after successful checkout
      await loadAttendance();

      // show per-row success message briefly
      setCheckoutSuccess((s) => ({ ...s, [id]: true }));
      setTimeout(() => {
        setCheckoutSuccess((s) => {
          const copy = { ...s };
          delete copy[id];
          return copy;
        });
      }, 3000);
    } catch (err) {
      console.error(err);
      // keep it simple: show console error; could set UI error state per-row
    } finally {
      setCheckingOut((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    }
  };

  return (
    <div className="dashboard-shell attendance-list-screen">
      <div className="attendance-header-area">
        <div className="dashboard-header">
          <p className="eyebrow">Attendance</p>
          <h1>Attendance List</h1>
          <p className="subtitle">Rows from the attendance endpoint.</p>
        </div>

        <div className="attendance-controls">
          <input
            className="search-input"
            type="search"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="attendance-list-body">
        {loading ? (
          <p className="status">Loading attendance...</p>
        ) : error ? (
          <p className="status error">{error}</p>
        ) : (
          <div className="attendance-list">
            {rows
            .filter((r) => {
              const employee = r.employee || {};
              const name = (employee.employeename ?? r.employeename ?? '').toString().toLowerCase();
              return name.includes((query ?? '').toLowerCase());
            })
            .map((r, idx) => {
            const idKey = r.id ?? r.attendanceid ?? r.attendanceId ?? idx;
            const employee = r.employee || {};
            const checkinDate = r.attendancedate || (r.checkintime ? r.checkintime.split('T')[0] : '');
            const checkinTime = r.checkintime ? (r.checkintime.includes('T') ? r.checkintime.split('T')[1] : r.checkintime) : '';
            const checkouttime = r.checkouttime
              ? (() => {
                  const value = String(r.checkouttime);
                  const parts = value.split('T');
                  if (parts.length > 1) {
                    return parts[1].split('.')[0];
                  }
                  return value;
                })()
              : '';
            return (
              <div key={idKey} className="attendance-row">
                <div className="row-field">
                  <span className="field-label">ID</span>
                  <span className="field-value">{employee.employeeid ?? r.employeeid ?? '—'}</span>
                </div>
                <div className="row-field">
                  <span className="field-label">Name</span>
                  <span className="field-value">{employee.employeename ?? r.employeename ?? '—'}</span>
                </div>
                <div className="row-field">
                  <span className="field-label">Check-in date</span>
                  <span className="field-value">{checkinDate || '—'}</span>
                </div>
                <div className="row-field">
                  <span className="field-label">Check-in time</span>
                  <span className="field-value">{checkinTime || '—'}</span>
                </div>
                <div className="row-field">
                  <span className="field-label">Checkout Time</span>
                  <span className="field-value">{checkouttime || '—'}</span>
                </div>
                <div className="row-field">
                  <span className="field-label">Status</span>
                  {(() => {
                    const status = (r.attendancestatus ?? r.status ?? '') || '';
                    const up = String(status).trim();
                    const cls = up.toLowerCase() === 'present' ? 'status-badge present' : 'status-badge absent';
                    const label = up || '—';
                    return <span className={cls}>{label}</span>;
                  })()}
                </div>
                <div className="row-field">
                  <span className="field-label">Site ID</span>
                  <span className="field-value">{r.siteid ?? '—'}</span>
                </div>
                <div className="row-field">
                  <span className="field-label"> </span>
                    <span className="field-value">
                      {checkoutSuccess[idKey] ? (
                        <span className="checkout-success">Checkout successful</span>
                      ) : (
                        <button
                          className="checkout-btn"
                          onClick={() => handleCheckout(r)}
                          disabled={!!checkingOut[idKey]}
                          title="Checkout"
                        >
                          {checkingOut[idKey] ? '...' : 'Checkout'}
                        </button>
                      )}
                    </span>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceListPage;
