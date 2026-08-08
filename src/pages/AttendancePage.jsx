import { useEffect, useMemo, useState } from 'react';

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
  resetForm,
  onCancel,
}) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [showContractorSuggestions, setShowContractorSuggestions] = useState(false);
  const today = new Date();
  const maxDate = today.toISOString().slice(0, 10);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 14);
  const minDateString = minDate.toISOString().slice(0, 10);

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
    setShowContractorSuggestions(false);
  };

  return (
    <div className="attendance-card">
      <p className="eyebrow">EKA Platform</p>
      <h1>Attendance Check-in</h1>
      <p className="subtitle">Create a daily attendance record for the selected employee.</p>

      <form onSubmit={handleSubmit}>
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
          <label htmlFor="employee">Select employee</label>
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
              disabled={loadingEmployees}
              autoComplete="off"
              placeholder={loadingEmployees ? 'Loading employees...' : 'Choose employee'}
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
