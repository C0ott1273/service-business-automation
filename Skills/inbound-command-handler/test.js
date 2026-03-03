/**
 * inbound-command-handler — Test Suite
 * Tests intent parsing from natural language commands. No API keys needed.
 */

const { parseCommand } = require('./index');

const TEST_CASES = [
  { input: 'Job 1001 done', expectedIntent: 'job_complete', expectedParams: { jobNumber: '1001' } },
  { input: 'job #2050 completed', expectedIntent: 'job_complete', expectedParams: { jobNumber: '2050' } },
  { input: 'finished job 999', expectedIntent: 'job_complete', expectedParams: { jobNumber: '999' } },
  { input: "What's my schedule today?", expectedIntent: 'schedule_today', expectedParams: { date: 'today' } },
  { input: "today's jobs", expectedIntent: 'schedule_today', expectedParams: { date: 'today' } },
  { input: 'schedule for March 15', expectedIntent: 'schedule_date', expectedParams: { date: 'March 15' } },
  { input: 'How much did we spend on ads this month?', expectedIntent: 'expense_query' },
  { input: 'Where can we cut costs?', expectedIntent: 'cost_analysis' },
  { input: 'Send invoice for job 1001', expectedIntent: 'send_invoice', expectedParams: { jobNumber: '1001' } },
  { input: 'Start building MyApp', expectedIntent: 'start_project', expectedParams: { projectName: 'MyApp' }, confirm: true },
  { input: 'status on job 500', expectedIntent: 'status_check', expectedParams: { jobNumber: '500' } },
  { input: 'hello there', expectedIntent: 'unknown' },
];

function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of TEST_CASES) {
    const result = parseCommand(test.input);
    let ok = result.intent === test.expectedIntent;

    if (ok && test.expectedParams) {
      for (const [key, val] of Object.entries(test.expectedParams)) {
        if (result.params[key] !== val) {
          ok = false;
          console.log(`  FAIL ["${test.input}"] param ${key}: expected "${val}", got "${result.params[key]}"`);
        }
      }
    }

    if (ok && test.confirm !== undefined && result.requiresConfirm !== test.confirm) {
      ok = false;
      console.log(`  FAIL ["${test.input}"] confirm: expected ${test.confirm}, got ${result.requiresConfirm}`);
    }

    if (ok) {
      console.log(`  PASS ["${test.input}"] → ${result.intent}`);
      passed++;
    } else if (result.intent !== test.expectedIntent) {
      console.log(`  FAIL ["${test.input}"] expected "${test.expectedIntent}", got "${result.intent}"`);
      failed++;
    } else {
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${TEST_CASES.length} tests`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
