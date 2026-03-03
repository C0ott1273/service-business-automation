/**
 * quickbooks-job-lookup — Test Suite
 * Tests job formatting. No QuickBooks credentials needed.
 */

const { formatJobDetails } = require('./index');

function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Format complete job
  {
    const job = {
      invoice_number: '1001',
      customer_name: 'John Smith',
      amount: 350.00,
      balance: 350.00,
      status: 'pending',
      due_date: '2024-04-01',
      service_details: [
        { description: 'Gutter Cleaning', amount: 250.00 },
        { description: 'Downspout Flush', amount: 100.00 },
      ],
    };
    const result = formatJobDetails(job);
    if (result.includes('Job #1001') && result.includes('John Smith') && result.includes('$350.00') && result.includes('Gutter Cleaning')) {
      console.log('  PASS [Format complete job]');
      passed++;
    } else {
      console.log('  FAIL [Format complete job]', result);
      failed++;
    }
  }

  // Test 2: Paid job
  {
    const job = {
      invoice_number: '1002',
      customer_name: 'Sarah Johnson',
      amount: 200.00,
      balance: 0,
      status: 'paid',
      due_date: '',
      service_details: [{ description: 'Window Cleaning', amount: 200.00 }],
    };
    const result = formatJobDetails(job);
    if (result.includes('paid') && result.includes('$0.00')) {
      console.log('  PASS [Paid job shows correct status]');
      passed++;
    } else {
      console.log('  FAIL [Paid job]', result);
      failed++;
    }
  }

  // Test 3: Null input
  {
    const result = formatJobDetails(null);
    if (result === 'No job data.') {
      console.log('  PASS [Null input]');
      passed++;
    } else {
      console.log('  FAIL [Null input]', result);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of 3 tests`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
