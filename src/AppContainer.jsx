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
import PurchaseInvoicePage from './pages/PurchaseInvoicePage';
import ProfilePage from './pages/ProfilePage';
import { getApiBaseUrl } from './api/config';
import { fetchWithAuthJson } from './api/apiClient';
import { calculateAttendanceAmount, getContractorOptions, validateAttendanceDate, validateAttendanceFields } from './utils/attendanceValidation';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { logout } from './auth/authService';
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

const getResponseField = (value, names) => {
  if (!value || typeof value !== 'object') return undefined;
  for (const name of names) {
    const key = Object.keys(value).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key && value[key] !== null && value[key] !== undefined && value[key] !== '') {
      return value[key];
    }
  }
  return undefined;
};

const getMeUser = (response) => response?.user || response?.data?.user || response?.data || response;

const getUsername = (response) => getResponseField(getMeUser(response), [
  'username',
  'preferred_username',
]);

const getHospitalId = (response) => getResponseField(getMeUser(response), [
  'hospitalid',
  'hospitalId',
]);

const getHospitalRecords = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const assignHospital = async (hospitalId) => {
  const response = await fetchWithAuthJson(`${getApiBaseUrl()}/auth/hospital`, {
    method: 'POST',
    body: JSON.stringify({ hospitalId: Number(hospitalId) }),
  });
  return response.hospitalId;
};

const fetchPatientsForHospital = async (hospitalId) => {
  const response = await fetchWithAuthJson(
    `${getApiBaseUrl()}/patients/hospital/${encodeURIComponent(hospitalId)}`,
  );
  if (!Array.isArray(response)) {
    throw new Error('The hospital patients endpoint returned an invalid response.');
  }
  return response;
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [authMeResponse, setAuthMeResponse] = useState(null);
  const [authMeError, setAuthMeError] = useState('');
  const [loadingAuthMe, setLoadingAuthMe] = useState(true);
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [savingHospital, setSavingHospital] = useState(false);
  const [hospitalDialogError, setHospitalDialogError] = useState('');
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const contractorOptions = getContractorOptions(employees);

  useEffect(() => {
    let cancelled = false;

    const loadUserContext = async () => {
      setLoadingAuthMe(true);
      setAuthMeError('');

      try {
        const response = await fetchWithAuthJson(`${getApiBaseUrl()}/auth/me`);
        if (cancelled) return;
        setAuthMeResponse(response);

        const username = getUsername(response);
        if (!username) {
          throw new Error('The /auth/me response does not include a username.');
        }

        const hospitalId = getHospitalId(response);
        if (hospitalId === undefined) {
          setShowHospitalDialog(true);
          setLoadingHospitals(true);
          try {
            const hospitalsResponse = await fetchWithAuthJson(`${getApiBaseUrl()}/auth/hospitals`);
            if (!cancelled) {
              setHospitalOptions(getHospitalRecords(hospitalsResponse));
            }
          } catch (err) {
            if (!cancelled) {
              setHospitalDialogError(err.message || 'Unable to load hospitals.');
            }
          } finally {
            if (!cancelled) setLoadingHospitals(false);
          }
          return;
        }

        setSelectedHospitalId(String(hospitalId));
        setLoadingPatients(true);
        setPatientsError('');
        try {
          const hospitalPatients = await fetchPatientsForHospital(hospitalId);
          if (!cancelled) setPatients(hospitalPatients);
        } catch (err) {
          if (!cancelled) setPatientsError(err.message || 'Unable to load patients.');
        } finally {
          if (!cancelled) setLoadingPatients(false);
        }
      } catch (err) {
        if (!cancelled) setAuthMeError(err.message || 'Unable to load the signed-in user.');
      } finally {
        if (!cancelled) setLoadingAuthMe(false);
      }
    };

    loadUserContext();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleHospitalSelection = async () => {
    if (!selectedHospitalId) {
      setHospitalDialogError('Please select a hospital.');
      return;
    }

    const username = getUsername(authMeResponse);
    if (!username) {
      setHospitalDialogError('Unable to determine the signed-in username.');
      return;
    }

    setSavingHospital(true);
    setHospitalDialogError('');
    setPatientsError('');

    let hospitalId;
    try {
      hospitalId = await assignHospital(selectedHospitalId);
      if (!hospitalId) {
        throw new Error('The hospital assignment response did not include a hospitalId.');
      }
      setSelectedHospitalId(String(hospitalId));
      setShowHospitalDialog(false);
    } catch (err) {
      setHospitalDialogError(err.message || 'Unable to assign the hospital.');
      setSavingHospital(false);
      return;
    }

    setLoadingPatients(true);
    try {
      const hospitalPatients = await fetchPatientsForHospital(hospitalId);
      setPatients(hospitalPatients);
    } catch (err) {
      setPatientsError(err.message || 'Unable to load patients.');
    } finally {
      setSavingHospital(false);
      setLoadingPatients(false);
    }
  };


  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };
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

        <div className="header-actions">
          <button
            type="button"
            className="header-action-btn"
            onClick={() => setActiveView('profile')}
            aria-label="Profile"
          >
            <FiUser aria-hidden="true" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            className="header-action-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout"
          >
            <FiLogOut aria-hidden="true" />
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
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
          <button
            type="button"
            className={`nav-item ${activeView === 'process-purchase' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('process-purchase');
              setSidebarOpen(false);
            }}
          >
            Process Purchase
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
            authMeResponse={authMeResponse}
            loadingAuthMe={loadingAuthMe}
            authMeError={authMeError}
          />
        ) : activeView === 'profile' ? (
          <ProfilePage
            patients={patients}
            loading={loadingAuthMe || loadingPatients}
            error={authMeError || patientsError}
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
        ) : activeView === 'process-purchase' ? (
          <PurchaseInvoicePage />
        ) : (
          <StockPage />
        )}
      </main>

      {showHospitalDialog && (
        <div className="modal-backdrop hospital-dialog-backdrop">
          <div
            className="modal-card hospital-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hospital-dialog-title"
          >
            <div className="modal-header">
              <h3 id="hospital-dialog-title">Select your hospital</h3>
            </div>
            <p className="hospital-dialog-description">
              Your account is not associated with a hospital yet. Select one to continue.
            </p>
            <label>
              <span>Hospital</span>
              <select
                value={selectedHospitalId}
                onChange={(event) => {
                  setSelectedHospitalId(event.target.value);
                  setHospitalDialogError('');
                }}
                disabled={loadingHospitals || savingHospital}
              >
                <option value="">
                  {loadingHospitals ? 'Loading hospitals…' : 'Select a hospital'}
                </option>
                {hospitalOptions.map((hospital, index) => {
                  const id = getResponseField(hospital, ['hospitalId']);
                  const name = getResponseField(hospital, ['hospitalName']);
                  if (id === undefined) return null;
                  return (
                    <option key={String(id) || index} value={String(id)}>
                      {name || `Hospital ${id}`}
                    </option>
                  );
                })}
              </select>
            </label>
            {hospitalDialogError ? <p className="error-text">{hospitalDialogError}</p> : null}
            {!loadingHospitals && hospitalOptions.length === 0 && !hospitalDialogError ? (
              <p className="error-text">No hospitals are available to select.</p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={handleHospitalSelection}
                disabled={loadingHospitals || savingHospital || hospitalOptions.length === 0}
              >
                {savingHospital ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppContainer;