/**
 * google-calendar-sync — Test Suite
 * Tests event parsing and formatting. No API key needed.
 */

const { formatSchedule } = require('./index');

function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Format multiple events
  {
    const events = [
      { title: 'Gutter Cleaning - Smith', start: '2024-03-15T09:00:00-04:00', location: '123 Oak St' },
      { title: 'Pressure Wash - Johnson', start: '2024-03-15T13:00:00-04:00', location: '456 Elm Ave' },
      { title: 'Window Cleaning - Brown', start: '2024-03-15T16:00:00-04:00', location: '' },
    ];
    const result = formatSchedule(events);
    if (result.includes('Gutter Cleaning') && result.includes('Pressure Wash') && result.includes('@ 123 Oak St')) {
      console.log('  PASS [Format multiple events]');
      passed++;
    } else {
      console.log('  FAIL [Format multiple events]', result);
      failed++;
    }
  }

  // Test 2: Empty schedule
  {
    const result = formatSchedule([]);
    if (result === 'No jobs scheduled.') {
      console.log('  PASS [Empty schedule]');
      passed++;
    } else {
      console.log('  FAIL [Empty schedule]', result);
      failed++;
    }
  }

  // Test 3: Null input
  {
    const result = formatSchedule(null);
    if (result === 'No jobs scheduled.') {
      console.log('  PASS [Null input]');
      passed++;
    } else {
      console.log('  FAIL [Null input]', result);
      failed++;
    }
  }

  // Test 4: Event without location
  {
    const events = [{ title: 'Office Meeting', start: '2024-03-15T10:00:00-04:00', location: '' }];
    const result = formatSchedule(events);
    if (result.includes('Office Meeting') && !result.includes('@')) {
      console.log('  PASS [Event without location]');
      passed++;
    } else {
      console.log('  FAIL [Event without location]', result);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of 4 tests`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
