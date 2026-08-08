export const calculateAttendanceAmount = (rate, workingDays) => {
  const numericRate = Number(rate);
  const numericWorkingDays = Number(workingDays);

  if (!Number.isFinite(numericRate) || !Number.isFinite(numericWorkingDays)) {
    return 0;
  }

  return numericRate * numericWorkingDays;
};

export const getContractorOptions = (employees = []) => {
  return employees;
};

export const validateAttendanceDate = (attendanceDate) => {
  const trimmedDate = String(attendanceDate ?? '').trim();

  if (!trimmedDate) {
    return false;
  }

  const [year, month, day] = trimmedDate.split('-').map((value) => Number(value));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(selectedDate.getTime())) {
    return false;
  }

  const diffInDays = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
  return diffInDays >= 0 && diffInDays <= 14;
};

export const validateAttendanceFields = ({ contractorId, designation, rate, workingDays }) => {
  const trimmedContractorId = String(contractorId ?? '').trim();
  const trimmedDesignation = String(designation ?? '').trim();
  const numericRate = Number(rate);
  const numericWorkingDays = Number(workingDays);

  if (!trimmedContractorId) {
    return {
      isValid: false,
      error: 'Contractor name is required.',
      calculatedAmount: 0,
    };
  }

  if (!trimmedDesignation) {
    return {
      isValid: false,
      error: 'Designation is required.',
      calculatedAmount: 0,
    };
  }

  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return {
      isValid: false,
      error: 'Rate must be greater than 0.',
      calculatedAmount: 0,
    };
  }

  if (!Number.isFinite(numericWorkingDays) || numericWorkingDays <= 0) {
    return {
      isValid: false,
      error: 'Working days must be greater than 0.',
      calculatedAmount: 0,
    };
  }

  return {
    isValid: true,
    error: '',
    calculatedAmount: calculateAttendanceAmount(numericRate, numericWorkingDays),
  };
};
