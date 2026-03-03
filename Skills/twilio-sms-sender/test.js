/**
 * twilio-sms-sender — Test Suite
 * Tests SMS sending with a mock Twilio client. No credentials needed.
 */

// Mock the twilio module before requiring index
const originalRequire = module.constructor.prototype.require;
let lastCreateCall = null;

module.constructor.prototype.require = function (id) {
  if (id === 'twilio') {
    return function mockTwilio(sid, token) {
      return {
        messages: {
          create: async (params) => {
            lastCreateCall = params;
            return {
              sid: 'SM_MOCK_' + Date.now(),
              status: 'queued',
              to: params.to,
            };
          },
        },
      };
    };
  }
  return originalRequire.apply(this, arguments);
};

// Set mock env vars
process.env.TWILIO_ACCOUNT_SID = 'AC_TEST_SID';
process.env.TWILIO_AUTH_TOKEN = 'TEST_TOKEN';
process.env.TWILIO_PHONE_NUMBER = '+15550000000';

const { sendSMS } = require('./index');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Successful SMS send
  {
    const result = await sendSMS('+15551234567', 'Hello from test!');
    if (result.success && result.sid && result.status === 'queued') {
      console.log('  PASS [Successful SMS send]');
      passed++;
    } else {
      console.log('  FAIL [Successful SMS send]', result);
      failed++;
    }
  }

  // Test 2: Phone normalization (no +1 prefix)
  {
    lastCreateCall = null;
    await sendSMS('5559876543', 'Test normalization');
    if (lastCreateCall && lastCreateCall.to === '+15559876543') {
      console.log('  PASS [Phone normalization adds +1]');
      passed++;
    } else {
      console.log('  FAIL [Phone normalization]', lastCreateCall);
      failed++;
    }
  }

  // Test 3: Strip formatting characters
  {
    lastCreateCall = null;
    await sendSMS('(555) 111-2222', 'Test strip');
    if (lastCreateCall && lastCreateCall.to === '+15551112222') {
      console.log('  PASS [Strip formatting from phone]');
      passed++;
    } else {
      console.log('  FAIL [Strip formatting]', lastCreateCall);
      failed++;
    }
  }

  // Test 4: Missing phone
  {
    const result = await sendSMS('', 'No phone');
    if (!result.success && result.error) {
      console.log('  PASS [Rejects missing phone]');
      passed++;
    } else {
      console.log('  FAIL [Should reject missing phone]', result);
      failed++;
    }
  }

  // Test 5: Missing message
  {
    const result = await sendSMS('+15551234567', '');
    if (!result.success && result.error) {
      console.log('  PASS [Rejects missing message]');
      passed++;
    } else {
      console.log('  FAIL [Should reject missing message]', result);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of 5 tests`);

  // Restore original require
  module.constructor.prototype.require = originalRequire;

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
