import { useEffect, useRef, useState } from 'react';
// Location capturing is currently disabled.
// import { Geolocation } from '@capacitor/geolocation';
import './App.css';
import LoginPage from "./pages/LoginPage";
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceListPage from './pages/AttendanceListPage';
import StockPage from './pages/StockPage';
import OrdersPage from './pages/OrdersPage';
import { getApiBaseUrl } from './api/config';
import { fetchWithAuthJson, fetchWithAuth } from './api/apiClient';
import { calculateAttendanceAmount, getContractorOptions, validateAttendanceDate, validateAttendanceFields } from './utils/attendanceValidation';
import { AuthProvider } from "./auth/AuthContext";
const getDefaultDateValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultTimeValue = () => {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

function AppContainer() {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(getDefaultDateValue());
  const [checkInTime, setCheckInTime] = useState(getDefaultTimeValue());
  // Location capturing is currently disabled.
  const [location, setLocation] = useState('');
  const [locationError, setLocationError] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [designation, setDesignation] = useState('');
  const [rate, setRate] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [calculatedAmount, setCalculatedAmount] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const messageTimerRef = useRef(null);
  const [todayCount, setTodayCount] = useState(null);
  const [totalEmployeeCount, setTotalEmployeeCount] = useState(null);
  const [loadingTodayCount, setLoadingTodayCount] = useState(true);
  const [loadingTotalEmployeeCount, setLoadingTotalEmployeeCount] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contractorOptions = getContractorOptions(employees);

  useEffect(() => {
    const nextAmount = calculateAttendanceAmount(rate, workingDays);
    setCalculatedAmount(nextAmount > 0 ? String(nextAmount) : '');
  }, [rate, workingDays]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setDesignation('');
      setRate('');
      return;
    }

    const selectedEmployee = employees.find((employee) => String(employee.employeeid) === String(selectedEmployeeId));
    const nextDesignation = selectedEmployee?.designation || '';
    const nextRate = selectedEmployee?.rate !== undefined && selectedEmployee?.rate !== null && selectedEmployee?.rate !== ''
      ? String(selectedEmployee.rate)
      : '';

    setDesignation(nextDesignation);
    setRate(nextRate);
  }, [selectedEmployeeId, employees]);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      setError('');

      try {
        const apiUrl = `${getApiBaseUrl()}/employee`;
        console.log('Loading employees from', apiUrl);
        const data = await fetchWithAuthJson(apiUrl);
        setEmployees(data || []);
      } catch (err) {
        console.error('Failed to load employees', err);
        setError(err.message || String(err) || 'Unable to load employees.');
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  useEffect(() => {
    const loadSites = async () => {
      setLoadingSites(true);
      setError('');

      try {
        const apiUrl = `${getApiBaseUrl()}/sites`;
        console.log('Loading sites from', apiUrl);
        const data = await fetchWithAuthJson(apiUrl);
        setSites(data || []);
      } catch (err) {
        console.error('Failed to load sites', err);
        setError(err.message || String(err) || 'Unable to load sites.');
      } finally {
        setLoadingSites(false);
      }
    };

    loadSites();
  }, []);

  const loadTodayCount = async () => {
    setLoadingTodayCount(true);

    try {
      const data = await fetchWithAuthJson(`${getApiBaseUrl()}/attendance/today/count`);
      if (typeof data === 'number') {
        setTodayCount(data);
      } else if (data && typeof data.count === 'number') {
        setTodayCount(data.count);
      } else {
        setTodayCount(null);
      }
    } catch (err) {
      console.error('Failed to load today count', err);
      setTodayCount(null);
    } finally {
      setLoadingTodayCount(false);
    }
  };

  const loadTotalEmployeeCount = async () => {
    setLoadingTotalEmployeeCount(true);

    try {
      const data = await fetchWithAuthJson(`${getApiBaseUrl()}/employee/count`);
      if (typeof data === 'number') {
        setTotalEmployeeCount(data);
      } else if (data && typeof data.count === 'number') {
        setTotalEmployeeCount(data.count);
      } else {
        setTotalEmployeeCount(null);
      }
    } catch (err) {
      console.error('Failed to load employee count', err);
      setTotalEmployeeCount(null);
    } finally {
      setLoadingTotalEmployeeCount(false);
    }
  };

  useEffect(() => {
    loadTodayCount();
    loadTotalEmployeeCount();
    // Location capturing is currently disabled.
    // captureLocation();
  }, []);

  useEffect(() => {
    if (activeView === 'dashboard') {
      loadTodayCount();
      loadTotalEmployeeCount();
    }
  }, [activeView]);

  // Location capturing is currently disabled.
  // const captureLocation = async () => {
  //   try {
  //     setLoadingLocation(true);
  //     setLocationError('');
  //
  //     const check = await Geolocation.checkPermissions();
  //     if (check.location !== 'granted') {
  //       const request = await Geolocation.requestPermissions();
  //       if (request.location !== 'granted') {
  //         throw new Error('Location permission denied. Please grant location access in app settings.');
  //       }
  //     }
  //
  //     const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
  //     setLocation(`Lat: ${position.coords.latitude.toFixed(6)}, Lon: ${position.coords.longitude.toFixed(6)}`);
  //   } catch (err) {
  //     console.error('Failed to get current location', err);
  //     setLocationError(err?.message || 'Unable to determine current location.');
  //   } finally {
  //     setLoadingLocation(false);
  //   }
  // };

  const resetForm = () => {
    setAttendanceDate(getDefaultDateValue());
    setCheckInTime(getDefaultTimeValue());
    setLocation('');
    setRemarks('');
    setSelectedEmployeeId('');
    setSelectedSiteId('');
    setContractorName('');
    setContractorId('');
    setDesignation('');
    setRate('');
    setWorkingDays('');
    setCalculatedAmount('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedEmployeeId) {
      setError('Please select an employee before checking in.');
      return;
    }

    if (!selectedSiteId) {
      setError('Please select a site before checking in.');
      return;
    }

    if (!validateAttendanceDate(attendanceDate)) {
      setError('Attendance date must be today or within the last 2 weeks. Future dates are not allowed.');
      return;
    }

    const validation = validateAttendanceFields({ contractorId, designation, rate, workingDays });
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const locationValue = String(location ?? '').trim();
      const totalamount = Number(calculatedAmount) || 0;

      const attendanceData = {
        attendancedate: attendanceDate,
        attendancestatus: 'Present',
        breakduration: 0,
        checkintime: `${attendanceDate}T${checkInTime}:00`,
        employee: {
          employeeid: Number(selectedEmployeeId),
        },
        contractorid: Number(contractorId),
        designation: designation.trim(),
        rate: Number(rate),
        workingdays: Number(workingDays),
        totalamount: totalamount,
        location: locationValue,
        overtimehrs: 0,
        shift: 'Day',
        siteid: Number(selectedSiteId),
        supervisorremarks: remarks.trim(),
        totalworkinghrs: 0,
      };

      const payload = {
        attendance: attendanceData,
        ...attendanceData,
      };

      await fetchWithAuthJson(`${getApiBaseUrl()}/attendance`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setMessage('Attendance checked in successfully.');
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
      messageTimerRef.current = setTimeout(() => {
        setMessage('');
        messageTimerRef.current = null;
      }, 3000);
      resetForm();
      // Location capturing is currently disabled.
      // await captureLocation();
      try {
        const data = await fetchWithAuthJson(`${getApiBaseUrl()}/attendance/today/count`);
        if (typeof data === 'number') {
          setTodayCount(data);
        } else if (data && typeof data.count === 'number') {
          setTodayCount(data.count);
        }
      } catch (err) {
        console.error('Failed to refresh today count', err);
      }
    } catch (err) {
      setError(err.message || 'Unable to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="header-bar">
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="header-title">
        {/*<p className="sidebar-logo">EKA Platform</p>*/}  
        </div>

        <div className="header-spacer" />
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <p className="sidebar-logo">EKA Platform</p>
          <h2>Menu</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('dashboard');
              setSidebarOpen(false);
            }}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === 'attendance' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('attendance');
              setSidebarOpen(false);
            }}
          >
            Attendance
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === 'attendance-list' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('attendance-list');
              setSidebarOpen(false);
            }}
          >
            Attendance list
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === 'stock' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('stock');
              setSidebarOpen(false);
            }}
          >
            Stock
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('orders');
              setSidebarOpen(false);
            }}
          >
            Orders
          </button>
        </nav>
      </aside>

      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <main className="content-panel">
        {activeView === 'dashboard' ? (
          <DashboardPage
            todayCount={todayCount}
            loadingTodayCount={loadingTodayCount}
            totalEmployeeCount={totalEmployeeCount}
            loadingTotalEmployeeCount={loadingTotalEmployeeCount}
          />
        ) : activeView === 'attendance' ? (
          <AttendancePage
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            setSelectedEmployeeId={setSelectedEmployeeId}
            attendanceDate={attendanceDate}
            setAttendanceDate={setAttendanceDate}
            checkInTime={checkInTime}
            setCheckInTime={setCheckInTime}
            // Location capturing is currently disabled.
            location={location}
            loadingLocation={loadingLocation}
            locationError={locationError}
            remarks={remarks}
            setRemarks={setRemarks}
            selectedSiteId={selectedSiteId}
            setSelectedSiteId={setSelectedSiteId}
            sites={sites}
            loadingSites={loadingSites}
            contractorName={contractorName}
            setContractorName={setContractorName}
            contractorId={contractorId}
            setContractorId={setContractorId}
            contractorOptions={contractorOptions}
            designation={designation}
            setDesignation={setDesignation}
            rate={rate}
            setRate={setRate}
            workingDays={workingDays}
            setWorkingDays={setWorkingDays}
            calculatedAmount={calculatedAmount}
            setCalculatedAmount={setCalculatedAmount}
            loadingEmployees={loadingEmployees}
            submitting={submitting}
            message={message}
            error={error}
            handleSubmit={handleSubmit}
            resetForm={resetForm}
            onCancel={() => setActiveView('dashboard')}
          />
        ) : activeView === 'attendance-list' ? (
          <AttendanceListPage activeView={activeView} />
        ) : activeView === 'LoginPage' ? (
          <LoginPage />
        ) : activeView === 'orders' ? (
          <OrdersPage />
        ) : (
          <StockPage />
        )}
      </main>
    </div>
  );
}

export default AppContainer;