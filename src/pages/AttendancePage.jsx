function AttendancePage({
  employees,
  selectedEmployeeId,
  setSelectedEmployeeId,
  attendanceDate,
  setAttendanceDate,
  checkInTime,
  setCheckInTime,
  location,
  loadingLocation,
  locationError,
  remarks,
  setRemarks,
  loadingEmployees,
  submitting,
  message,
  error,
  handleSubmit,
  resetForm,
}) {
  return (
    <div className="attendance-card">
      <p className="eyebrow">EKA Platform</p>
      <h1>Attendance Check-in</h1>
      <p className="subtitle">Create a daily attendance record for the selected employee.</p>

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="employee">Select employee</label>
          <select
            id="employee"
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
            disabled={loadingEmployees}
          >
            <option value="">{loadingEmployees ? 'Loading employees...' : 'Choose employee'}</option>
            {employees.map((employee) => (
              <option key={employee.employeeid} value={employee.employeeid}>
                {employee.employeename} ({employee.designation || 'Employee'})
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="attendanceDate">Date</label>
          <input
            id="attendanceDate"
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="checkInTime">Check-in time</label>
          <input
            id="checkInTime"
            type="time"
            value={checkInTime}
            onChange={(event) => setCheckInTime(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            value={location}
            readOnly
            placeholder={loadingLocation ? 'Getting current device location...' : 'Enter location'}
          />
          {locationError ? <p className="status error">{locationError}</p> : null}
        </div>

        <div className="field-group">
          <label htmlFor="remarks">Supervisor remarks</label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Add any note for the supervisor"
          />
        </div>

        <div className="actions">
          <button type="button" className="secondary-btn" onClick={resetForm}>
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
