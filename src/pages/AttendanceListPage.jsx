import { useEffect, useState } from 'react';
import '../App.css';
import { getApiBaseUrl } from '../api/config';
import { fetchWithAuthJson } from '../api/apiClient';

function AttendanceListPage({ activeView }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

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
                  <span className="field-label">Site</span>
                  <span className="field-value" style={{ color: 'blue' }}>{r.site?.sitename ?? r.sitename ?? '—'}</span>
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
