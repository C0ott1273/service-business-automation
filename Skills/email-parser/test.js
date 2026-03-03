/**
 * email-parser — Test Suite
 * Tests lead extraction from sample email content. No credentials needed.
 */

const { parseEmail } = require('./index');

const SAMPLE_EMAILS = [
  {
    name: 'Standard form submission',
    raw: [
      'From: John Smith <john@example.com>',
      'To: service@mybusiness.com',
      'Subject: New Lead from Website',
      'Date: Mon, 01 Jan 2024 10:00:00 -0500',
      '',
      'Name: John Smith',
      'Phone: (555) 123-4567',
      'Email: john@example.com',
      'Message: I need my gutters cleaned. Two-story house, about 2000 sq ft.',
    ].join('\r\n'),
    expected: {
      name: 'John Smith',
      phone: '5551234567',
      email: 'john@example.com',
    },
  },
  {
    name: 'Minimal form (name + phone only)',
    raw: [
      'From: noreply@mywebsite.com',
      'To: leads@mybusiness.com',
      'Subject: Contact Form Submission',
      'Date: Tue, 15 Feb 2024 14:30:00 -0500',
      '',
      'Full Name: Sarah Johnson',
      'Tel: 555.987.6543',
      'Comments: Please call me back about a quote.',
    ].join('\r\n'),
    expected: {
      name: 'Sarah Johnson',
      phone: '5559876543',
      email: 'noreply@mywebsite.com',
    },
  },
  {
    name: 'Phone number in body without label',
    raw: [
      'From: Mike Brown <mike.b@gmail.com>',
      'To: info@mybusiness.com',
      'Subject: Quote Request',
      'Date: Wed, 20 Mar 2024 09:15:00 -0400',
      '',
      'Hi, I found you on Google. Can you come out for an estimate?',
      'My number is 555-321-0000. Thanks!',
    ].join('\r\n'),
    expected: {
      name: 'Mike Brown',
      phone: '5553210000',
      email: 'mike.b@gmail.com',
    },
  },
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of SAMPLE_EMAILS) {
    try {
      const lead = await parseEmail(test.raw);
      let ok = true;

      for (const [key, expected] of Object.entries(test.expected)) {
        if (lead[key] !== expected) {
          console.log(`  FAIL [${test.name}] ${key}: expected "${expected}", got "${lead[key]}"`);
          ok = false;
        }
      }

      if (ok) {
        console.log(`  PASS [${test.name}]`);
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.log(`  ERROR [${test.name}] ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${SAMPLE_EMAILS.length} tests`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
