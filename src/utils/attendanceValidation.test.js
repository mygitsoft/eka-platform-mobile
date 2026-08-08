import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAttendanceAmount, getContractorOptions, validateAttendanceDate, validateAttendanceFields } from './attendanceValidation.js';

test('calculates attendance amount from rate and working days', () => {
  assert.equal(calculateAttendanceAmount(100, 5), 500);
  assert.equal(calculateAttendanceAmount(12.5, 3), 37.5);
});

test('rejects non-positive rate or working days', () => {
  const result = validateAttendanceFields({ contractorId: '1', designation: 'Developer', rate: 0, workingDays: 3 });

  assert.equal(result.isValid, false);
  assert.match(result.error, /Rate/);
});

test('accepts positive values', () => {
  const result = validateAttendanceFields({ contractorId: '1', designation: 'Developer', rate: 150, workingDays: 4 });

  assert.equal(result.isValid, true);
  assert.equal(result.calculatedAmount, 600);
});

test('returns all employees for contractor suggestions from the master list', () => {
  const employees = [
    { employeeid: 1, employeename: 'Alice', designation: 'Contractor' },
    { employeeid: 2, employeename: 'Bob', designation: 'Developer' },
    { employeeid: 3, employeename: 'Carol', designation: 'contractor' },
  ];

  const contractors = getContractorOptions(employees);

  assert.deepEqual(contractors.map((employee) => employee.employeeid), [1, 2, 3]);
  assert.deepEqual(contractors.map((employee) => employee.employeename), ['Alice', 'Bob', 'Carol']);
});

test('rejects future dates and dates older than two weeks', () => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 1);

  const olderDate = new Date(today);
  olderDate.setDate(today.getDate() - 15);

  const todayIso = today.toISOString().slice(0, 10);
  const futureIso = futureDate.toISOString().slice(0, 10);
  const olderIso = olderDate.toISOString().slice(0, 10);

  assert.equal(validateAttendanceDate(todayIso), true);
  assert.equal(validateAttendanceDate(futureIso), false);
  assert.equal(validateAttendanceDate(olderIso), false);
});
