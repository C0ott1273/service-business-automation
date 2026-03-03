/**
 * morning-briefing — Skill
 * Compiles the daily 6AM morning briefing message.
 * Combines: calendar, weather, Bible reading, prayer reminder, business tips.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getTodaysJobs, formatSchedule } = require('../google-calendar-sync');
const { formatDailyReading } = require('../daily-bible-reading');
const { formatWeatherBriefing } = require('../weather-forecast');

// Pool fence business tips and reminders
const BUSINESS_TIPS = [
  'Follow up on any outstanding quotes from this week.',
  'Check inventory — do you need to order more mesh or poles?',
  'Review your Google Ads performance this week.',
  'Send a thank-you text to your last completed customer.',
  'Take before/after photos on today\'s jobs for social media.',
  'Check your Google reviews — respond to any new ones.',
  'Update your QuickBooks — are all invoices sent?',
  'Review next week\'s schedule and confirm appointments.',
  'Post a job photo on social media today.',
  'Check if any customers are due for a follow-up or annual inspection.',
  'Review your ad spend vs revenue this month.',
  'Clean and organize your truck/trailer for tomorrow.',
  'Send estimates for any pending leads.',
  'Check the weather for the rest of the week — plan accordingly.',
  'Call back any missed calls from yesterday.',
  'Update your website with recent project photos.',
  'Check if any permits need to be pulled for upcoming jobs.',
  'Review your profit margins — any expenses to cut?',
  'Network: reach out to a pool builder or realtor today.',
  'Safety check: inspect all tools and equipment.',
  'Send review requests to recent customers who haven\'t left one.',
  'Plan your route for tomorrow to minimize drive time.',
  'Check material prices — any bulk order savings available?',
  'Follow up with leads that went cold in the last 30 days.',
  'Inspect your vehicle — oil, tires, lights all good?',
  'Review your insurance coverage — is it up to date?',
  'Set a revenue goal for this month and track progress.',
  'Take 5 minutes to organize your paperwork and receipts.',
  'Text a past customer to ask for referrals.',
  'Look at competitor ads — anything you can improve?',
  'Celebrate a win today — you\'re building something great.',
];

/**
 * Build the complete morning briefing message.
 */
async function buildMorningBriefing() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

  // Fetch all data in parallel
  const [calendarResult, weatherMsg] = await Promise.all([
    getTodaysJobs(),
    formatWeatherBriefing(),
  ]);

  const bibleMsg = formatDailyReading();
  const tip = BUSINESS_TIPS[dayOfYear % BUSINESS_TIPS.length];

  // Build schedule section
  let scheduleSection;
  if (calendarResult.success && calendarResult.count > 0) {
    scheduleSection = `🗓️ Today's Schedule (${calendarResult.count} job${calendarResult.count > 1 ? 's' : ''})\n${formatSchedule(calendarResult.events)}`;
  } else if (calendarResult.success) {
    scheduleSection = '🗓️ No jobs scheduled today — follow up on leads or take a breather.';
  } else {
    scheduleSection = '🗓️ Calendar: Connect Google Calendar to see today\'s jobs.';
  }

  // Assemble the full briefing
  const sections = [
    `Good morning, boss! ☀️`,
    `${dayName}, ${dateStr}`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    weatherMsg,
    `━━━━━━━━━━━━━━━━━━`,
    scheduleSection,
    `━━━━━━━━━━━━━━━━━━`,
    bibleMsg,
    `━━━━━━━━━━━━━━━━━━`,
    `🙏 Prayer Reminder`,
    `Take a moment to pray before you start the day.`,
    `Ask God to bless your work, protect your crew,`,
    `and guide your interactions with every customer.`,
    `━━━━━━━━━━━━━━━━━━`,
    `💡 Business Tip`,
    tip,
    `━━━━━━━━━━━━━━━━━━`,
    `Have a blessed and productive day! 💪`,
  ];

  return sections.join('\n');
}

module.exports = { buildMorningBriefing, BUSINESS_TIPS };

if (require.main === module) {
  buildMorningBriefing().then(console.log);
}
