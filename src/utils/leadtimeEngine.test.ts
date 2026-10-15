import {
  calculateExpectedDeliveryDate,
  getDeliveryLeadtime,
  getStandardLeadTimeDays,
  isSunday,
  isWorkingDay,
  DEFAULT_REGULAR_HOLIDAYS,
  Holiday,
} from './leadtimeEngine';
import { computeDeliveryPerformance } from './forwardingCalculations';

/**
 * Leadtime Engine Regression & Acceptance Test Runner
 */
export function runLeadtimeEngineTests() {
  const results: { test: string; passed: boolean; details?: string }[] = [];

  function assert(testName: string, condition: boolean, message?: string) {
    results.push({
      test: testName,
      passed: condition,
      details: message || (condition ? 'Passed' : 'Failed'),
    });
  }

  // 1. Prompt 2E-1 Revised Official Matrix 12 Test Cases (Section 16)
  // Test 1: Air + Luzon = 5 days
  assert('Test 1: Air + Luzon = 5 days', getDeliveryLeadtime('Air', 'Luzon') === 5);
  // Test 2: Air + Visayas = 12 days
  assert('Test 2: Air + Visayas = 12 days', getDeliveryLeadtime('Air', 'Visayas') === 12);
  // Test 3: Air + Mindanao = 12 days
  assert('Test 3: Air + Mindanao = 12 days', getDeliveryLeadtime('Air', 'Mindanao') === 12);
  // Test 4: Land + Luzon = 5 days (CORRECTED RULE)
  assert('Test 4: Land + Luzon = 5 days', getDeliveryLeadtime('Land', 'Luzon') === 5);
  // Test 5: Sea + Visayas = 15 days
  assert('Test 5: Sea + Visayas = 15 days', getDeliveryLeadtime('Sea', 'Visayas') === 15);
  // Test 6: Sea + Mindanao = 17 days
  assert('Test 6: Sea + Mindanao = 17 days', getDeliveryLeadtime('Sea', 'Mindanao') === 17);
  // Test 7: RORO + Visayas = 8 days (CONFIRMED RULE)
  assert('Test 7: RORO + Visayas = 8 days', getDeliveryLeadtime('RORO', 'Visayas') === 8);
  // Test 8: RORO + Mindanao = 10 days
  assert('Test 8: RORO + Mindanao = 10 days', getDeliveryLeadtime('RORO', 'Mindanao') === 10);
  // Test 9: Land + Visayas = N/A
  assert('Test 9: Land + Visayas = N/A', getDeliveryLeadtime('Land', 'Visayas') === null);
  // Test 10: Land + Mindanao = N/A
  assert('Test 10: Land + Mindanao = N/A', getDeliveryLeadtime('Land', 'Mindanao') === null);
  // Test 11: Sea + Luzon = N/A
  assert('Test 11: Sea + Luzon = N/A', getDeliveryLeadtime('Sea', 'Luzon') === null);
  // Test 12: RORO + Luzon = N/A
  assert('Test 12: RORO + Luzon = N/A', getDeliveryLeadtime('RORO', 'Luzon') === null);

  // Freight naming variations
  assert('Air Freight + Luzon = 5 days', getDeliveryLeadtime('Air Freight', 'Luzon') === 5);
  assert('Land Freight + Luzon = 5 days', getDeliveryLeadtime('Land Freight', 'Luzon') === 5);

  // 2. N/A Combinations Execution Status
  const naTest1 = calculateExpectedDeliveryDate('2026-08-03', 'Land', 'Visayas');
  assert('N/A (Land+Visayas) returns NOT_APPLICABLE status', naTest1.status === 'NOT_APPLICABLE');
  assert('N/A returns null expectedDeliveryDate', naTest1.expectedDeliveryDate === null);
  assert(
    'N/A returns official message',
    naTest1.message === 'No standard leadtime is configured for this mode and destination.'
  );

  const naTest2 = calculateExpectedDeliveryDate('2026-08-03', 'Sea', 'Luzon');
  assert('N/A (Sea+Luzon) returns NOT_APPLICABLE status', naTest2.status === 'NOT_APPLICABLE');
  assert('N/A (Sea+Luzon) returns null expectedDeliveryDate', naTest2.expectedDeliveryDate === null);

  const naTest3 = calculateExpectedDeliveryDate('2026-08-03', 'RORO', 'Luzon');
  assert('N/A (RORO+Luzon) returns NOT_APPLICABLE status', naTest3.status === 'NOT_APPLICABLE');

  // 3. Incomplete Information Handling
  const incTest1 = calculateExpectedDeliveryDate('', 'Air', 'Luzon');
  assert('Empty departure date returns INCOMPLETE_DATA', incTest1.status === 'INCOMPLETE_DATA');
  assert('Empty departure date returns null expectedDeliveryDate', incTest1.expectedDeliveryDate === null);

  const incTest2 = calculateExpectedDeliveryDate('2026-08-03', '', 'Luzon');
  assert('Missing mode returns INCOMPLETE_DATA', incTest2.status === 'INCOMPLETE_DATA');

  const incTest3 = calculateExpectedDeliveryDate('2026-08-03', 'Air', '');
  assert('Missing destination returns INCOMPLETE_DATA', incTest3.status === 'INCOMPLETE_DATA');

  // 4. Prompt Example 1:
  // Actual Departure: Monday, August 3, 2026
  // Mode: Air, Destination: Luzon (Leadtime = 5 working days)
  // Tuesday Aug 4 = Day 1
  // Wednesday Aug 5 = Day 2
  // Thursday Aug 6 = Day 3
  // Friday Aug 7 = Day 4
  // Saturday Aug 8 = Day 5
  // Expected Delivery: Saturday, August 8, 2026
  const ex1 = calculateExpectedDeliveryDate('2026-08-03', 'Air', 'Luzon');
  assert('Example 1 Expected Delivery is 2026-08-08 (Saturday)', ex1.expectedDeliveryDate === '2026-08-08', `Got ${ex1.expectedDeliveryDate}`);
  assert('Example 1 skipped 0 Sundays', ex1.skippedSundaysCount === 0);
  assert('Example 1 status is SUCCESS', ex1.status === 'SUCCESS');

  // 5. Prompt Example 2:
  // Actual Departure: Friday, August 7, 2026
  const ex2Air = calculateExpectedDeliveryDate('2026-08-07', 'Air', 'Luzon');
  assert('Friday dispatch with 5 days lands on Thursday Aug 13', ex2Air.expectedDeliveryDate === '2026-08-13', `Got ${ex2Air.expectedDeliveryDate}`);
  assert('Friday dispatch with 5 days skips 1 Sunday', ex2Air.skippedSundaysCount === 1);

  // 6. Prompt Example 3:
  // Actual Departure: Saturday, August 8, 2026
  const ex3Sat = calculateExpectedDeliveryDate('2026-08-08', 'Air', 'Luzon');
  assert('Saturday dispatch with 5 days lands on Friday Aug 14', ex3Sat.expectedDeliveryDate === '2026-08-14', `Got ${ex3Sat.expectedDeliveryDate}`);
  assert('Saturday dispatch skips Sunday Aug 9', ex3Sat.skippedSundaysCount === 1);

  // 7. Holiday Handling Test:
  const customHolidays: Holiday[] = [
    { date: '2026-08-26', name: 'Mock Regular Holiday', type: 'regular' },
    { date: '2026-08-31', name: 'National Heroes Day', type: 'regular' },
  ];
  const holTest = calculateExpectedDeliveryDate('2026-08-24', 'Air', 'Luzon', customHolidays);
  assert('Departure Aug 24 with Aug 26 & Aug 31 holidays lands on Sept 1', holTest.expectedDeliveryDate === '2026-09-01', `Got ${holTest.expectedDeliveryDate}`);
  assert('Holiday test skipped 1 Sunday', holTest.skippedSundaysCount === 1);
  assert('Holiday test skipped 2 Holidays', holTest.skippedHolidaysCount === 2);

  // 8. Acceptance Test Workflow:
  // RORO + Visayas -> 8 days
  const roroLeadTime = getDeliveryLeadtime('RORO', 'Visayas');
  assert('Acceptance Step: RORO + Visayas leadtime = 8', roroLeadTime === 8);
  const roroExpected = calculateExpectedDeliveryDate('2026-08-03', 'RORO', 'Visayas');
  assert('Acceptance Step: RORO + Visayas Expected Delivery is 2026-08-12', roroExpected.expectedDeliveryDate === '2026-08-12');
  
  // Delivery Performance using 8-day lead time:
  // Dispatched Aug 3 (Monday), Delivered Aug 10 (Monday) -> 6 working days (Aug 4-8, 10, skipping Sun Aug 9) -> 6 <= 8 -> HIT
  const perfHit = computeDeliveryPerformance('2026-08-03', '2026-08-10', roroLeadTime);
  assert('Delivery Performance with 8-day leadtime is HIT (6 working days <= 8 days)', perfHit.performance === 'HIT' && perfHit.tatDays === 6);
  
  // Dispatched Aug 3, Delivered Aug 14 (Friday) -> 10 working days -> 10 > 8 -> MISSED
  const perfMissed = computeDeliveryPerformance('2026-08-03', '2026-08-14', roroLeadTime);
  assert('Delivery Performance with 8-day leadtime is MISSED (10 working days > 8 days)', perfMissed.performance === 'MISSED' && perfMissed.tatDays === 10);

  // 9. User Request Example 1: Strict Working-Day vs Calendar-Day Test
  // RORO + Visayas = 8 working days. Actual Departure: Friday Aug 7, 2026.
  // Day 1: Sat Aug 8
  // Sunday Aug 9: NOT COUNTED
  // Day 2: Mon Aug 10
  // Day 3: Tue Aug 11
  // Day 4: Wed Aug 12
  // Day 5: Thu Aug 13
  // Day 6: Fri Aug 14
  // Day 7: Sat Aug 15
  // Sunday Aug 16: NOT COUNTED
  // Day 8: Mon Aug 17 -> Expected Delivery Date = 2026-08-17
  const promptExample = calculateExpectedDeliveryDate('2026-08-07', 'RORO', 'Visayas');
  assert('User Prompt Example: RORO + Visayas Friday Aug 7 Expected Date is Monday Aug 17', promptExample.expectedDeliveryDate === '2026-08-17');
  assert('User Prompt Example: Skipped 2 Sundays (Aug 9, Aug 16)', promptExample.skippedSundaysCount === 2);

  // Delivered on Monday Aug 17:
  // Calendar days difference = 10 days.
  // Working days TAT = 8 working days.
  // Under calendar shortcut (10 > 8) it would be wrongly marked MISSED.
  // Under centralized working-day engine (8 <= 8) it is CORRECTLY evaluated as HIT:
  const promptPerfDeliveredOnTime = computeDeliveryPerformance('2026-08-07', '2026-08-17', 8);
  assert('User Prompt Example: Delivered Aug 17 (10 calendar days, 8 working days) MUST BE HIT', promptPerfDeliveredOnTime.performance === 'HIT' && promptPerfDeliveredOnTime.tatDays === 8);

  // Delivered on Saturday Aug 15:
  // Calendar days difference = 8 days.
  // Working days TAT = 7 working days.
  const promptPerfDeliveredEarly = computeDeliveryPerformance('2026-08-07', '2026-08-15', 8);
  assert('User Prompt Example: Delivered Aug 15 (7 working days) MUST BE HIT', promptPerfDeliveredEarly.performance === 'HIT' && promptPerfDeliveredEarly.tatDays === 7);

  // Delivered on Tuesday Aug 18:
  // Working days TAT = 9 working days.
  // Exceeds 8 working days by 1 valid working day. NO GRACE PERIOD -> MUST BE MISSED (Delayed):
  const promptPerfDeliveredLate = computeDeliveryPerformance('2026-08-07', '2026-08-18', 8);
  assert('User Prompt Example: Delivered Aug 18 (9 working days) MUST BE MISSED (no grace period)', promptPerfDeliveredLate.performance === 'MISSED' && promptPerfDeliveredLate.tatDays === 9);

  // 10. User Request Example 2: Regular Philippine Holiday Excluded
  // Actual Departure: Friday Aug 28, 2026. Mode: Land, Area: Luzon (5 working days).
  // Sat Aug 29 = Day 1
  // Sun Aug 30 = NOT COUNTED (Sunday)
  // Mon Aug 31 = NOT COUNTED (National Heroes Day Regular Holiday)
  // Tue Sep 1 = Day 2
  // Wed Sep 2 = Day 3
  // Thu Sep 3 = Day 4
  // Fri Sep 4 = Day 5 -> Expected Delivery Date = 2026-09-04
  const holidayExample = calculateExpectedDeliveryDate('2026-08-28', 'Land', 'Luzon');
  assert('Holiday Test: Friday Aug 28 with National Heroes Day lands on Friday Sep 4', holidayExample.expectedDeliveryDate === '2026-09-04');
  assert('Holiday Test: Skipped 1 Sunday and 1 Regular Holiday', holidayExample.skippedSundaysCount === 1 && holidayExample.skippedHolidaysCount === 1);

  // Delivered on Friday Sep 4 (7 calendar days later):
  // Working days TAT = 5 working days.
  // MUST BE HIT:
  const holidayPerfHit = computeDeliveryPerformance('2026-08-28', '2026-09-04', 5);
  assert('Holiday Test: Delivered Sep 4 (5 working days) MUST BE HIT', holidayPerfHit.performance === 'HIT' && holidayPerfHit.tatDays === 5);

  // Delivered on Saturday Sep 5 (8 calendar days later):
  // Working days TAT = 6 working days. Exceeds 5 working days by 1 day -> MISSED:
  const holidayPerfMissed = computeDeliveryPerformance('2026-08-28', '2026-09-05', 5);
  assert('Holiday Test: Delivered Sep 5 (6 working days) MUST BE MISSED', holidayPerfMissed.performance === 'MISSED' && holidayPerfMissed.tatDays === 6);

  // 11. Specific 2E-1 Correction Verification Cases:
  // Land + Luzon MUST be 5 days
  const landLuzonLeadTime = getDeliveryLeadtime('Land', 'Luzon');
  assert('2E-1 Verification: Mode = Land, Area = Luzon -> Delivery Leadtime = 5 days', landLuzonLeadTime === 5);
  const landLuzonExpected = calculateExpectedDeliveryDate('2026-08-03', 'Land', 'Luzon');
  assert('2E-1 Verification: Land + Luzon Expected Delivery is 2026-08-08', landLuzonExpected.expectedDeliveryDate === '2026-08-08');

  // RORO + Visayas MUST be 8 days
  const roroVisayasLeadTime = getDeliveryLeadtime('RORO', 'Visayas');
  assert('2E-1 Verification: Mode = RORO, Area = Visayas -> Delivery Leadtime = 8 days', roroVisayasLeadTime === 8);
  const roroVisayasExpected = calculateExpectedDeliveryDate('2026-08-03', 'RORO', 'Visayas');
  assert('2E-1 Verification: RORO + Visayas Expected Delivery is 2026-08-12', roroVisayasExpected.expectedDeliveryDate === '2026-08-12');

  return results;
}

const testResults = runLeadtimeEngineTests();
const allPassed = testResults.every(r => r.passed);
console.log(`\n=== LEADTIME ENGINE TEST RESULTS: ${allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'} ===`);
testResults.forEach(r => {
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.test}: ${r.details}`);
});
console.log(`Total tests: ${testResults.length}, Passed: ${testResults.filter(r => r.passed).length}, Failed: ${testResults.filter(r => !r.passed).length}\n`);

