import { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { getApiBaseUrl } from '../api/config';
import { fetchWithAuthJson } from '../api/apiClient';

function AttendancePage({
  employees,
  selectedEmployeeId,
  setSelectedEmployeeId,
  attendanceDate,
  setAttendanceDate,
  location,
  loadingLocation,
  locationError,
  remarks,
  setRemarks,
  selectedSiteId,
  setSelectedSiteId,
  sites,
  loadingSites,
  contractorName,
  setContractorName,
  contractorId,
  setContractorId,
  contractorOptions,
  loadEmployeesForContractor,
  designation,
  setDesignation,
  rate,
  setRate,
  workingDays,
  setWorkingDays,
  calculatedAmount,
  loadingEmployees,
  submitting,
  message,
  error,
  handleSubmit,
  onCreateEmployee,
  resetForm,
  onRefresh,
  onCancel,
}) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [showContractorSuggestions, setShowContractorSuggestions] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDesignation, setEmployeeDesignation] = useState('');
  const [employeeRate, setEmployeeRate] = useState('');
  const [designationOptions, setDesignationOptions] = useState([]);
  const [loadingDesignations, setLoadingDesignations] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeDialogError, setEmployeeDialogError] = useState('');
  const [pullRefreshOffset, setPullRefreshOffset] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullStartY = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!showEmployeeDialog) return undefined;

    let cancelled = false;
    setLoadingDesignations(true);
    setEmployeeDialogError('');
    fetchWithAuthJson(`${getApiBaseUrl()}/designations`)
      .then((data) => {
        if (!cancelled) setDesignationOptions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setEmployeeDialogError(err.message || 'Unable to load designations.');
      })
      .finally(() => {
        if (!cancelled) setLoadingDesignations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showEmployeeDialog]);
  const today = new Date();
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const maxDate = formatLocalDate(today);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 14);
  const minDateString = formatLocalDate(minDate);

  const normalize = (value) => String(value ?? '').trim().toLowerCase();

  const formatEmployeeLabel = (employee) => {
    const name = employee?.employeename || 'Employee';
    const designationLabel = employee?.designation?.trim();
    return designationLabel ? `${name} (${designationLabel})` : name;
  };

  const employeeSuggestions = useMemo(() => {
    const query = normalize(employeeSearch);

    if (!query) {
      return employees.slice(0, 8);
    }

    return employees.filter((employee) => {
      const searchFields = [employee?.employeename, employee?.designation];
      return searchFields.some((field) => normalize(field).includes(query));
    });
  }, [employeeSearch, employees]);

  const contractorSuggestions = useMemo(() => {
    const query = normalize(contractorName);

    if (!query) {
      return contractorOptions.slice(0, 8);
    }

    return contractorOptions.filter((employee) => {
      const searchFields = [employee?.employeename, employee?.designation];
      return searchFields.some((field) => normalize(field).includes(query));
    });
  }, [contractorName, contractorOptions]);

  useEffect(() => {
    const selectedEmployee = employees.find(
      (employee) => String(employee.employeeid) === String(selectedEmployeeId)
    );

    if (selectedEmployee) {
      setEmployeeSearch(selectedEmployee.employeename || '');
    } else if (!selectedEmployeeId) {
      setEmployeeSearch('');
    }
  }, [selectedEmployeeId, employees]);

  useEffect(() => {
    const selectedContractor = contractorOptions.find(
      (employee) => String(employee.employeeid) === String(contractorId)
    );

    if (selectedContractor && contractorId) {
      setContractorName(selectedContractor.employeename || '');
    }
  }, [contractorId, contractorOptions, setContractorName]);

  const handleEmployeeSuggestionClick = (employee) => {
    setSelectedEmployeeId(String(employee.employeeid));
    setEmployeeSearch(employee.employeename || '');
    setShowEmployeeSuggestions(false);
  };

  const handleContractorSuggestionClick = (employee) => {
    setContractorId(String(employee.employeeid));
    setContractorName(employee.employeename || '');
    setSelectedEmployeeId('');
    setEmployeeSearch('');
    loadEmployeesForContractor(employee.employeeid);
    setShowContractorSuggestions(false);
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    const trimmedName = employeeName.trim();
    const numericRate = Number(employeeRate);

    if (!trimmedName || !employeeDesignation || !Number.isFinite(numericRate) || numericRate <= 0) {
      setEmployeeDialogError('Enter an employee name, designation, and a rate greater than 0.');
      return;
    }

    setSavingEmployee(true);
    setEmployeeDialogError('');
    try {
      await onCreateEmployee({
        employeename: trimmedName,
        designation: employeeDesignation,
        rate: numericRate,
      });
      setShowEmployeeDialog(false);
      setEmployeeName('');
      setEmployeeDesignation('');
      setEmployeeRate('');
    } catch (err) {
      setEmployeeDialogError(err.message || 'Unable to create employee.');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleRefresh = async () => {
    if (isPullRefreshing || !onRefresh) return;
    setIsPullRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsPullRefreshing(false);
      setPullRefreshOffset(0);
    }
  };

  const handlePullStart = (event) => {
    if (event.touches.length !== 1 || isPullRefreshing) return;
    const form = formRef.current;
    if (!form || form.scrollTop > 0) return;
    pullStartY.current = event.touches[0].clientY;
  };

  const handlePullMove = (event) => {
    if (pullStartY.current == null) return;
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
    <div className="attendance-card">
      <p className="eyebrow">EKA Platform</p>
      <h1>Attendance Check-in</h1>
      <p className="subtitle">Create a daily attendance record for the selected employee.</p>

      <div
        className={`pull-refresh-indicator ${isPullRefreshing || pullRefreshOffset > 0 ? 'visible' : ''}`}
        style={{ height: `${Math.max(pullRefreshOffset, isPullRefreshing ? 48 : 0)}px` }}
      >
        {isPullRefreshing ? 'Refreshing...' : pullRefreshOffset >= 70 ? 'Release to refresh' : 'Pull to refresh'}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        <div className="field-group">
          <label htmlFor="attendanceDate">Date</label>
          <input
            id="attendanceDate"
            type="date"
            value={attendanceDate}
            min={minDateString}
            max={maxDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="site">
            Site <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <select
            id="site"
            value={selectedSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
            disabled={loadingSites}
          >
            <option value="">{loadingSites ? 'Loading sites...' : 'Choose site'}</option>
            {sites.map((site) => (
              <option key={site.siteid} value={site.siteid}>
                {site.sitename || 'Site'}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="contractorName">
            Contractor name <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <div className="dropdown-field">
            <input
              id="contractorName"
              type="text"
              value={contractorName}
              onChange={(event) => {
                setContractorName(event.target.value);
                setContractorId('');
                setShowContractorSuggestions(true);
              }}
              onFocus={() => setShowContractorSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowContractorSuggestions(false), 100);
              }}
              autoComplete="off"
              placeholder="Choose contractor"
            />
            {showContractorSuggestions && contractorSuggestions.length > 0 ? (
              <ul className="autocomplete-dropdown">
                {contractorSuggestions.map((employee) => (
                  <li key={employee.employeeid}>
                    <button
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleContractorSuggestionClick(employee)}
                    >
                      <span>{formatEmployeeLabel(employee)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="employee">Select employee</label>
          <div className="employee-entry-row">
            <div className="dropdown-field">
              <input
                id="employee"
                type="text"
                value={employeeSearch}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setShowEmployeeSuggestions(true);
                }}
                onFocus={() => setShowEmployeeSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowEmployeeSuggestions(false), 100);
                }}
                disabled={!contractorId || loadingEmployees}
                autoComplete="off"
                placeholder={!contractorId ? 'Choose contractor first' : loadingEmployees ? 'Loading employees...' : 'Choose employee'}
              />
              {showEmployeeSuggestions && employeeSuggestions.length > 0 ? (
                <ul className="autocomplete-dropdown">
                  {employeeSuggestions.map((employee) => (
                    <li key={employee.employeeid}>
                      <button
                        type="button"
                        className="autocomplete-item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleEmployeeSuggestionClick(employee)}
                      >
                        <span>{formatEmployeeLabel(employee)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="employee-add-btn"
              aria-label="Create employee"
              title={contractorId ? 'Create employee' : 'Choose a contractor first'}
              disabled={!contractorId}
              onClick={() => setShowEmployeeDialog(true)}
            >
              <FiPlus aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="designation">
            Designation <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            id="designation"
            type="text"
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            placeholder="Designation will auto-fill"
            readOnly
          />
        </div>

        <div className="field-group">
          <label htmlFor="rate">
            Rate <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            id="rate"
            type="number"
            min="0.01"
            step="0.01"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="Enter rate"
          />
        </div>

        <div className="field-group">
          <label htmlFor="workingDays">
            Working days <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            id="workingDays"
            type="number"
            min="0.1"
            step="0.1"
            value={workingDays}
            onChange={(event) => setWorkingDays(event.target.value)}
            placeholder="Enter working days"
          />
        </div>

        <div className="field-group">
          <label htmlFor="calculatedAmount">Calculated amount</label>
          <input
            id="calculatedAmount"
            type="text"
            value={calculatedAmount}
            readOnly
            placeholder="Auto-calculated"
          />
        </div>

        <div className="actions">
          <button type="button" className="secondary-btn" onClick={() => {
            resetForm();
            onCancel?.();
          }}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Check In'}
          </button>
        </div>
      </form>

      {showEmployeeDialog ? (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingEmployee) setShowEmployeeDialog(false);
        }}>
          <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-employee-title" onSubmit={handleCreateEmployee}>
            <div className="modal-header">
              <h3 id="create-employee-title">Create employee</h3>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close dialog"
                disabled={savingEmployee}
                onClick={() => setShowEmployeeDialog(false)}
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <label htmlFor="newEmployeeName">
              Employee Name
              <input
                id="newEmployeeName"
                type="text"
                value={employeeName}
                onChange={(event) => setEmployeeName(event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label htmlFor="newEmployeeDesignation">
              Designation
              <select
                id="newEmployeeDesignation"
                value={employeeDesignation}
                onChange={(event) => setEmployeeDesignation(event.target.value)}
                disabled={loadingDesignations || designationOptions.length === 0}
                required
              >
                <option value="">{loadingDesignations ? 'Loading designations...' : 'Choose designation'}</option>
                {designationOptions.map((option) => (
                  <option key={option.desigcode} value={option.desigcode}>
                    {option.designationdesc || option.desigcode}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="newEmployeeRate">
              Rate
              <input
                id="newEmployeeRate"
                type="number"
                min="0.01"
                step="0.01"
                value={employeeRate}
                onChange={(event) => setEmployeeRate(event.target.value)}
                required
              />
            </label>
            {employeeDialogError ? <p className="form-error" role="alert">{employeeDialogError}</p> : null}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" disabled={savingEmployee} onClick={() => setShowEmployeeDialog(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={savingEmployee || loadingDesignations || designationOptions.length === 0}>
                {savingEmployee ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {message ? (
        <div className="toast toast-success" role="status">
          {message}
        </div>
      ) : null}
      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}

export default AttendancePage;
