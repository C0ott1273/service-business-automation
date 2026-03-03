/**
 * review-request-trigger — Test Suite
 * Tests scheduling and message generation. No credentials needed.
 */

const { scheduleReviewRequest, buildReviewMessage, getScheduledReviews } = require('./index');

function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Schedule a review request
  {
    const result = scheduleReviewRequest({
      customer_name: 'John Smith',
      phone: '+15551234567',
      completion_date: '2024-03-15T10:00:00Z',
      delay_days: 2,
    });
    if (result.success && result.id && result.scheduled_for) {
      const sendDate = new Date(result.scheduled_for);
      const completionDate = new Date('2024-03-15T10:00:00Z');
      const diffMs = sendDate - completionDate;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 2) {
        console.log('  PASS [Schedule review 2 days out]');
        passed++;
      } else {
        console.log('  FAIL [Schedule review] diff was', diffDays, 'days, expected 2');
        failed++;
      }
    } else {
      console.log('  FAIL [Schedule review]', result);
      failed++;
    }
  }

  // Test 2: Build review message
  {
    const msg = buildReviewMessage('Sarah', 'https://g.page/r/test-link');
    if (msg.includes('Sarah') && msg.includes('https://g.page/r/test-link') && msg.includes('review')) {
      console.log('  PASS [Build review message]');
      passed++;
    } else {
      console.log('  FAIL [Build review message]', msg);
      failed++;
    }
  }

  // Test 3: Missing required fields
  {
    const result = scheduleReviewRequest({ customer_name: '', phone: '' });
    if (!result.success && result.error) {
      console.log('  PASS [Reject missing fields]');
      passed++;
    } else {
      console.log('  FAIL [Should reject missing fields]', result);
      failed++;
    }
  }

  // Test 4: Default delay is 2 days
  {
    const now = new Date();
    const result = scheduleReviewRequest({
      customer_name: 'Test User',
      phone: '+15559999999',
      completion_date: now.toISOString(),
    });
    const sendDate = new Date(result.scheduled_for);
    const diffDays = Math.round((sendDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays >= 1 && diffDays <= 3) {
      console.log('  PASS [Default 2-day delay]');
      passed++;
    } else {
      console.log('  FAIL [Default delay]', diffDays, 'days');
      failed++;
    }
  }

  // Test 5: Reviews are tracked
  {
    const reviews = getScheduledReviews();
    if (reviews.length >= 2) {
      console.log('  PASS [Reviews tracked in queue]');
      passed++;
    } else {
      console.log('  FAIL [Reviews not tracked]', reviews.length);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of 5 tests`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
