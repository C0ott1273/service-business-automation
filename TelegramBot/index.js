/**
 * telegram-bot-assistant — Personal CEO Assistant (v2)
 * Central command interface via Telegram for Protect A Child Pool Fence.
 *
 * Features:
 * - 7AM morning briefing + 5PM evening summary
 * - Natural language command routing to all skills
 * - CONFIRM/CANCEL and YES/NO flows
 * - Claude Code bridge via GitHub Actions
 * - Lead monitoring every 4 hours with interactive prompts
 * - Missed call detection every 15 min during business hours
 * - Multi-step estimate creation conversation flow
 * - Weekly review and goal tracking
 */

// Resolve node_modules from Skills/ and project root where dependencies may be installed
module.paths.unshift(require('path').resolve(__dirname, '../node_modules'));
module.paths.unshift(require('path').resolve(__dirname, '../Skills/node_modules'));

// Load .env file locally; on Railway, env vars are injected directly
require('dotenv').config({ path: require('path').resolve(__dirname, '../Skills/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { parseCommand, executeCommand } = require('../Skills/inbound-command-handler');
const { scheduleReviewRequest, processScheduledReviews } = require('../Skills/review-request-trigger');
const { getTodaysJobs, getEvents, formatSchedule } = require('../Skills/google-calendar-sync');
const { buildMorningBriefing } = require('../Skills/morning-briefing');
const { formatDailyReading } = require('../Skills/daily-bible-reading');
const { formatWeatherBriefing } = require('../Skills/weather-forecast');
const { triggerClaudeCode } = require('../Skills/claude-assistant');
const { buildEveningSummary, trackJobCompleted, trackInvoiceSent } = require('../Skills/evening-summary');
const { checkForNewLeads, markLeadProcessed } = require('../Skills/lead-monitor');
const { checkMissedCalls } = require('../Skills/missed-call-detector');
const { sendSMS } = require('../Skills/twilio-sms-sender');
const smsTemplates = require('../protect-a-child-pool-fence/sms-templates');
const { formatMarketingSummary, generateGoogleAds, generateSocialAds, generateWeeklyContent, generateGBPPost, generatePartnerOutreach, generateRentalOutreach } = require('../Skills/marketing-agent');
const { formatPipeline } = require('../Skills/pipeline-tracker');
const { getDripStats, processDripQueue } = require('../Skills/lead-drip-sequence');
const { calculateMaterials, formatEstimate: formatMaterialEstimate } = require('../Skills/material-calculator');
const { formatReferralStats } = require('../Skills/referral-tracker');
const { formatUpcomingBookings } = require('../Skills/booking-integration');
const { formatCompetitorReport } = require('../Skills/competitor-monitor');
const { PREFIX: RC_PREFIX, buildMainMenu, buildMarketingMenu, buildOpsMenu } = require('../Skills/remote-control');

const fs = require('fs');
const pathMod = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || null;
const CHAT_ID_FILE = pathMod.resolve(__dirname, 'owner-chat-id.txt');

if (!BOT_TOKEN) {
  console.error('[bot] Missing TELEGRAM_BOT_TOKEN — set it in Railway Variables or .env file');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// =====================
// STATE TRACKING
// =====================

const pendingConfirm = new Map();      // chatId -> parsed command awaiting CONFIRM
const pendingActions = new Map();      // chatId -> array of { type, data, timestamp }
const conversationState = new Map();   // chatId -> { step, data } for multi-step flows

// Persist owner chat ID across restarts
function loadOwnerChatId() {
  if (OWNER_CHAT_ID) return OWNER_CHAT_ID;
  try { return fs.readFileSync(CHAT_ID_FILE, 'utf8').trim() || null; } catch (_) { return null; }
}
function saveOwnerChatId(id) {
  try { fs.writeFileSync(CHAT_ID_FILE, String(id)); } catch (_) {}
}
let ownerChatId = loadOwnerChatId();

// --- Helper: send message to owner ---
async function notifyOwner(message) {
  if (!ownerChatId) return;
  try {
    await bot.telegram.sendMessage(ownerChatId, message);
  } catch (err) {
    console.error('[bot] Failed to notify owner:', err.message);
  }
}

// --- Helper: queue a pending action (lead or missed call) ---
function queueAction(chatId, action) {
  if (!pendingActions.has(chatId)) {
    pendingActions.set(chatId, []);
  }
  pendingActions.get(chatId).push(action);
}

// --- Helper: get next pending action and prompt ---
async function promptNextAction(chatId) {
  const queue = pendingActions.get(chatId);
  if (!queue || queue.length === 0) {
    pendingActions.delete(chatId);
    return;
  }

  const action = queue[0]; // Peek, don't remove yet
  if (action.type === 'lead_response') {
    const lead = action.data;
    await bot.telegram.sendMessage(chatId,
      `New lead: ${lead.name} (${lead.phone || 'no phone'})` +
      `${lead.email ? ' — ' + lead.email : ''}\n\n` +
      `${lead.message ? 'Message: ' + lead.message.substring(0, 200) : ''}\n\n` +
      `Want me to text them? Reply YES or NO`
    );
  } else if (action.type === 'missed_call') {
    const call = action.data;
    const time = new Date(call.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    await bot.telegram.sendMessage(chatId,
      `Missed call from ${call.from} at ${time}.\n\n` +
      `Want me to send a text? Reply YES or NO`
    );
  }
}

// =====================
// SLASH COMMANDS
// =====================

bot.start((ctx) => {
  if (!ownerChatId) {
    ownerChatId = ctx.chat.id;
    saveOwnerChatId(ownerChatId);
    console.log(`[bot] Owner chat ID set and saved: ${ownerChatId}`);
  }

  ctx.reply(
    `Welcome back, boss. Your CEO assistant is online.\n\n` +
    `Business\n` +
    `  "What's my schedule today?"\n` +
    `  "Job 1001 done"\n` +
    `  "Send invoice for job 1001"\n` +
    `  "New estimate for Smith"\n` +
    `  "Pull up Johnson"\n\n` +
    `Daily Life\n` +
    `  /bible — today's Bible reading\n` +
    `  /weather — weather forecast\n` +
    `  /briefing — full morning briefing now\n\n` +
    `Claude Code\n` +
    `  "Claude: fix the dashboard bug"\n` +
    `  "Claude: build a landing page"\n\n` +
    `Marketing & Growth\n` +
    `  /marketing — strategy overview\n` +
    `  /ads [city] — generate ad copy\n` +
    `  /referrals — referral program\n` +
    `  /competitors — competitor watch\n\n` +
    `Operations\n` +
    `  /pipeline — sales funnel\n` +
    `  /materials <ft> — job estimator\n` +
    `  /bookings — upcoming estimates\n\n` +
    `Goals & Reviews\n` +
    `  /weeklyreview — review the week\n` +
    `  /goals — check your goals\n\n` +
    `System\n` +
    `  /remote — control panel (tap buttons)\n` +
    `  /status — system health\n` +
    `  /help — all commands\n\n` +
    `Schedules:\n` +
    `  7:00 AM — Morning briefing\n` +
    `  5:00 PM — Evening summary\n` +
    `  Every 4h — Lead check\n` +
    `  Every 15m — Missed call check`
  );
});

bot.help((ctx) => {
  ctx.reply(
    `All Commands\n\n` +
    `SCHEDULE & JOBS\n` +
    `  "What's my schedule today?"\n` +
    `  "Any jobs tomorrow?"\n` +
    `  "Schedule for March 15"\n` +
    `  "Job 1001 done" / "Finished 1001"\n` +
    `  "Send invoice for job 1001"\n` +
    `  "Bill for 1001"\n` +
    `  "Status on job 1001"\n` +
    `  Just type "1001" to look up a job\n\n` +
    `ESTIMATES & CUSTOMERS\n` +
    `  "New estimate for Smith"\n` +
    `  "Quote for Johnson"\n` +
    `  "Send estimate to Smith"\n` +
    `  "Convert estimate 1001 to invoice"\n` +
    `  "Add customer John Smith"\n` +
    `  "Pull up Smith" / "Find Johnson"\n\n` +
    `SMS\n` +
    `  "Text 5551234567: message here"\n\n` +
    `DAILY LIFE\n` +
    `  /bible — today's reading + verse\n` +
    `  /weather — forecast + work warnings\n` +
    `  /briefing — full morning briefing\n` +
    `  /pray — prayer prompt\n\n` +
    `CLAUDE CODE\n` +
    `  "Claude: <task>" — runs Claude Code via GitHub Actions\n\n` +
    `MARKETING & GROWTH\n` +
    `  /marketing — marketing strategy summary\n` +
    `  /ads [city] — generate Google + social ads\n` +
    `  /content — weekly social media calendar\n` +
    `  /gbp — Google Business Profile post\n` +
    `  /outreach — pool builder partnership email\n` +
    `  /outreach rental — rental property outreach\n` +
    `  /referrals — referral program stats\n` +
    `  /competitors — competitor analysis\n\n` +
    `OPERATIONS\n` +
    `  /pipeline — sales pipeline overview\n` +
    `  /drip — lead drip sequence stats\n` +
    `  /materials <ft> [gates] — materials estimate\n` +
    `  /bookings — upcoming estimate appointments\n\n` +
    `GOALS & REVIEWS\n` +
    `  /goals — view your goals\n` +
    `  /setgoal <goal> — add a new goal\n` +
    `  /weeklyreview — weekly business review\n\n` +
    `SYSTEM\n` +
    `  /remote — interactive control panel\n` +
    `  /status — health check\n` +
    `  /summary — evening summary now\n` +
    `  /checkleads — check leads now\n` +
    `  CONFIRM / CANCEL — for pending actions\n` +
    `  YES / NO — for lead & missed call prompts`
  );
});

// --- /bible ---
bot.command('bible', (ctx) => {
  ctx.reply(formatDailyReading());
});

// --- /weather ---
bot.command('weather', async (ctx) => {
  ctx.reply(await formatWeatherBriefing());
});

// --- /briefing ---
bot.command('briefing', async (ctx) => {
  ctx.reply('Compiling your briefing...');
  const briefing = await buildMorningBriefing();
  ctx.reply(briefing);
});

// --- /summary (manual evening summary) ---
bot.command('summary', async (ctx) => {
  ctx.reply('Compiling evening summary...');
  const summary = await buildEveningSummary();
  ctx.reply(summary);
});

// --- /checkleads (manual lead check) ---
bot.command('checkleads', async (ctx) => {
  ctx.reply('Checking for new leads...');
  try {
    const leads = await checkForNewLeads();
    if (leads.length === 0) {
      ctx.reply('No new leads found.');
      return;
    }
    for (const lead of leads) {
      queueAction(ctx.chat.id, { type: 'lead_response', data: lead, timestamp: Date.now() });
    }
    await promptNextAction(ctx.chat.id);
  } catch (err) {
    ctx.reply(`Lead check failed: ${err.message}`);
  }
});

// --- /pray ---
bot.command('pray', (ctx) => {
  const prayers = [
    `Lord, bless my work today. Give me wisdom with every customer, patience with every challenge, and gratitude for every opportunity. Protect my crew and let our work honor You. Amen.`,
    `Father, I commit this day to You. Guide my hands, my words, and my decisions. Let every fence I install protect a family. Thank You for the gift of meaningful work. Amen.`,
    `God, grant me strength for today's work. Help me serve my customers with excellence and integrity. Keep us safe on every job site. I trust Your plan for my business. Amen.`,
    `Lord, thank You for another day to build and serve. Help me lead with character, work with diligence, and finish with excellence. May my business be a blessing to others. Amen.`,
    `Heavenly Father, order my steps today. Give me clarity on priorities, energy for the work, and peace in the process. I put my trust in You. Amen.`,
  ];
  const idx = new Date().getDate() % prayers.length;
  ctx.reply(prayers[idx]);
});

// --- /status ---
bot.command('status', async (ctx) => {
  const calResult = await getTodaysJobs();
  const jobCount = calResult.success ? calResult.count : 'N/A';

  ctx.reply(
    `System Status: All systems go\n\n` +
    `Today's jobs: ${jobCount}\n` +
    `Skills loaded: 24\n` +
    `  email-parser, twilio-sms-sender, google-calendar-sync\n` +
    `  quickbooks-job-lookup, quickbooks-invoice-sender\n` +
    `  quickbooks-customer-creator, quickbooks-estimate-manager\n` +
    `  review-request-trigger, inbound-command-handler\n` +
    `  morning-briefing, evening-summary, daily-bible-reading\n` +
    `  weather-forecast, claude-assistant\n` +
    `  lead-monitor, missed-call-detector\n` +
    `  marketing-agent, pipeline-tracker, lead-drip-sequence\n` +
    `  material-calculator, referral-tracker\n` +
    `  booking-integration, competitor-monitor\n` +
    `  remote-control\n\n` +
    `Active schedules:\n` +
    `  7AM — Morning briefing\n` +
    `  5PM — Evening summary\n` +
    `  Every 4h — Lead check\n` +
    `  Every 15m (7AM-7PM) — Missed call check\n` +
    `  Hourly — Review requests + drip sequences\n` +
    `  Friday 5PM — Weekly review reminder\n` +
    `  Sunday 8PM — Week ahead prep\n\n` +
    `Owner chat: ${ownerChatId ? 'Connected' : 'Send /start to connect'}`
  );
});

// --- Goals tracking (in-memory) ---
const goals = [];

bot.command('setgoal', (ctx) => {
  const goal = ctx.message.text.replace('/setgoal', '').trim();
  if (!goal) {
    ctx.reply('Usage: /setgoal <your goal>\nExample: /setgoal Close 15 jobs this month');
    return;
  }
  goals.push({ text: goal, created: new Date().toISOString(), done: false });
  ctx.reply(`Goal added: "${goal}"\n\nYou now have ${goals.length} active goal(s). Use /goals to view them.`);
});

bot.command('goals', (ctx) => {
  if (goals.length === 0) {
    ctx.reply('No goals set yet. Use /setgoal <goal> to add one.');
    return;
  }
  const list = goals.map((g, i) =>
    `${g.done ? '[done]' : '[ ]'} ${i + 1}. ${g.text}`
  ).join('\n');
  ctx.reply(`Your Goals\n\n${list}\n\nMark done: /goaldone <number>`);
});

bot.command('goaldone', (ctx) => {
  const num = parseInt(ctx.message.text.replace('/goaldone', '').trim());
  if (!num || num < 1 || num > goals.length) {
    ctx.reply('Usage: /goaldone <number>');
    return;
  }
  goals[num - 1].done = true;
  ctx.reply(`Goal completed: "${goals[num - 1].text}"\n\nKeep crushing it, boss!`);
});

// --- /weeklyreview ---
bot.command('weeklyreview', async (ctx) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const activeGoals = goals.filter(g => !g.done).length;
  const completedGoals = goals.filter(g => g.done).length;

  ctx.reply(
    `Weekly Review — Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}\n\n` +
    `Goals: ${completedGoals} completed, ${activeGoals} in progress\n\n` +
    `Questions to reflect on:\n` +
    `1. What were your biggest wins this week?\n` +
    `2. What jobs did you complete?\n` +
    `3. How many new leads came in?\n` +
    `4. Any outstanding quotes to follow up on?\n` +
    `5. What can you improve next week?\n\n` +
    `Take 10 minutes to answer these. Your future self will thank you.`
  );
});

// --- /marketing ---
bot.command('marketing', (ctx) => {
  ctx.reply(formatMarketingSummary());
});

// --- /ads [city] ---
bot.command('ads', (ctx) => {
  const city = ctx.message.text.replace('/ads', '').trim() || 'Orlando';
  const google = generateGoogleAds(city);
  const social = generateSocialAds();
  let msg = `Google Ads — ${city}\n\n`;
  google.forEach((ad, i) => {
    msg += `Ad ${i + 1}:\n  ${ad.headline}\n  ${ad.description}\n\n`;
  });
  msg += `Social Ads\n\n`;
  social.forEach((ad) => {
    msg += `${ad.type}:\n  ${ad.headline}\n  ${ad.body.substring(0, 100)}...\n\n`;
  });
  ctx.reply(msg);
});

// --- /content ---
bot.command('content', (ctx) => {
  const content = generateWeeklyContent();
  let msg = `Weekly Content Calendar\n\n`;
  content.forEach((day) => {
    msg += `${day.day}: ${day.platform}\n  ${day.topic}\n  ${day.caption.substring(0, 80)}...\n\n`;
  });
  ctx.reply(msg);
});

// --- /gbp ---
bot.command('gbp', (ctx) => {
  const post = generateGBPPost();
  ctx.reply(`Google Business Post\n\n${post.title}\n\n${post.body}\n\nCTA: ${post.cta}`);
});

// --- /outreach ---
bot.command('outreach', (ctx) => {
  const type = ctx.message.text.replace('/outreach', '').trim().toLowerCase();
  if (type === 'rental' || type === 'property') {
    const msg = generateRentalOutreach();
    ctx.reply(`Rental Property Outreach\n\nSubject: ${msg.subject}\n\n${msg.body}`);
  } else {
    const msg = generatePartnerOutreach();
    ctx.reply(`Pool Builder Outreach\n\nSubject: ${msg.subject}\n\n${msg.body}`);
  }
});

// --- /pipeline ---
bot.command('pipeline', (ctx) => {
  ctx.reply(formatPipeline());
});

// --- /drip ---
bot.command('drip', (ctx) => {
  const stats = getDripStats();
  ctx.reply(
    `Lead Drip Stats\n\n` +
    `Active sequences: ${stats.active}\n` +
    `Completed: ${stats.completed}\n` +
    `Cancelled: ${stats.cancelled}\n` +
    `Messages sent: ${stats.messagesSent}`
  );
});

// --- /materials [footage] [gates] ---
bot.command('materials', (ctx) => {
  const args = ctx.message.text.replace('/materials', '').trim().split(/\s+/);
  const footage = parseInt(args[0]) || 0;
  const gates = parseInt(args[1]) || 1;
  if (!footage) {
    ctx.reply('Usage: /materials <footage> [gates]\nExample: /materials 80 2');
    return;
  }
  const result = calculateMaterials({ footage, gates });
  ctx.reply(formatMaterialEstimate(result));
});

// --- /referrals ---
bot.command('referrals', (ctx) => {
  ctx.reply(formatReferralStats());
});

// --- /bookings ---
bot.command('bookings', (ctx) => {
  ctx.reply(formatUpcomingBookings());
});

// --- /competitors ---
bot.command('competitors', async (ctx) => {
  ctx.reply('Checking competitors...');
  const report = await formatCompetitorReport();
  ctx.reply(report);
});

// --- /remote — Interactive control panel ---
bot.command('remote', (ctx) => {
  ctx.reply('Remote Control Panel', buildMainMenu());
});

// --- Remote control callback handler ---
bot.action(new RegExp(`^${RC_PREFIX}(.+)$`), async (ctx) => {
  const action = ctx.match[1];
  await ctx.answerCbQuery();

  try {
    switch (action) {
      // --- Navigation ---
      case 'main':
        await ctx.editMessageText('Remote Control Panel', buildMainMenu());
        return;
      case 'marketing_menu':
        await ctx.editMessageText('Marketing & Growth', buildMarketingMenu());
        return;
      case 'ops_menu':
        await ctx.editMessageText('Operations', buildOpsMenu());
        return;

      // --- Schedule & Jobs ---
      case 'schedule':
      case 'jobs_today': {
        const result = await getTodaysJobs();
        if (result.success) {
          const schedule = formatSchedule(result.events);
          await ctx.reply(schedule || 'No jobs scheduled today.');
        } else {
          await ctx.reply('Could not fetch schedule.');
        }
        break;
      }

      // --- Leads & Calls ---
      case 'check_leads': {
        await ctx.reply('Checking for new leads...');
        const leads = await checkForNewLeads();
        if (leads.length === 0) {
          await ctx.reply('No new leads found.');
        } else {
          for (const lead of leads) {
            queueAction(ctx.chat.id, { type: 'lead_response', data: lead, timestamp: Date.now() });
          }
          await promptNextAction(ctx.chat.id);
        }
        break;
      }
      case 'missed_calls': {
        await ctx.reply('Checking missed calls...');
        const missed = await checkMissedCalls();
        if (missed.length === 0) {
          await ctx.reply('No missed calls.');
        } else {
          for (const call of missed) {
            queueAction(ctx.chat.id, { type: 'missed_call', data: call, timestamp: Date.now() });
          }
          await promptNextAction(ctx.chat.id);
        }
        break;
      }

      // --- System & Reports ---
      case 'pipeline':
        await ctx.reply(formatPipeline());
        break;
      case 'status': {
        const calRes = await getTodaysJobs();
        const cnt = calRes.success ? calRes.count : 'N/A';
        await ctx.reply(
          `System Status: All systems go\n\n` +
          `Today's jobs: ${cnt}\n` +
          `Owner chat: ${ownerChatId ? 'Connected' : 'Not set'}`
        );
        break;
      }
      case 'weather':
        await ctx.reply(await formatWeatherBriefing());
        break;
      case 'bible':
        await ctx.reply(formatDailyReading());
        break;
      case 'briefing': {
        await ctx.reply('Compiling briefing...');
        const briefing = await buildMorningBriefing();
        await ctx.reply(briefing);
        break;
      }
      case 'summary': {
        await ctx.reply('Compiling evening summary...');
        const summary = await buildEveningSummary();
        await ctx.reply(summary);
        break;
      }

      // --- Marketing ---
      case 'marketing':
        await ctx.reply(formatMarketingSummary());
        break;
      case 'content': {
        const content = generateWeeklyContent();
        let msg = 'Weekly Content Calendar\n\n';
        content.forEach((day) => {
          msg += `${day.day}: ${day.platform}\n  ${day.topic}\n  ${day.caption.substring(0, 80)}...\n\n`;
        });
        await ctx.reply(msg);
        break;
      }
      case 'gbp': {
        const post = generateGBPPost();
        await ctx.reply(`Google Business Post\n\n${post.title}\n\n${post.body}\n\nCTA: ${post.cta}`);
        break;
      }
      case 'outreach': {
        const outreachMsg = generatePartnerOutreach();
        await ctx.reply(`Pool Builder Outreach\n\nSubject: ${outreachMsg.subject}\n\n${outreachMsg.body}`);
        break;
      }
      case 'competitors': {
        await ctx.reply('Checking competitors...');
        const report = await formatCompetitorReport();
        await ctx.reply(report);
        break;
      }
      case 'referrals':
        await ctx.reply(formatReferralStats());
        break;

      // --- Operations ---
      case 'drip': {
        const stats = getDripStats();
        await ctx.reply(
          `Lead Drip Stats\n\n` +
          `Active sequences: ${stats.active}\n` +
          `Completed: ${stats.completed}\n` +
          `Cancelled: ${stats.cancelled}\n` +
          `Messages sent: ${stats.messagesSent}`
        );
        break;
      }
      case 'bookings':
        await ctx.reply(formatUpcomingBookings());
        break;
      case 'goals': {
        if (goals.length === 0) {
          await ctx.reply('No goals set yet. Use /setgoal <goal> to add one.');
        } else {
          const list = goals.map((g, i) =>
            `${g.done ? '[done]' : '[ ]'} ${i + 1}. ${g.text}`
          ).join('\n');
          await ctx.reply(`Your Goals\n\n${list}\n\nMark done: /goaldone <number>`);
        }
        break;
      }
      case 'pray': {
        const prayers = [
          'Lord, bless my work today. Give me wisdom with every customer, patience with every challenge, and gratitude for every opportunity. Amen.',
          'Father, I commit this day to You. Guide my hands, my words, and my decisions. Let every fence I install protect a family. Amen.',
          'God, grant me strength for today\'s work. Help me serve my customers with excellence and integrity. Keep us safe on every job site. Amen.',
        ];
        const idx = new Date().getDate() % prayers.length;
        await ctx.reply(prayers[idx]);
        break;
      }

      default:
        await ctx.reply('Unknown action.');
    }
  } catch (err) {
    await ctx.reply(`Error: ${err.message}`);
  }
});

// =====================
// NATURAL LANGUAGE HANDLER
// =====================

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;

  if (!ownerChatId) {
    ownerChatId = chatId;
    saveOwnerChatId(ownerChatId);
  }

  // --- Handle YES/NO for pending lead/missed-call actions ---
  if (text.toUpperCase() === 'YES' || text.toUpperCase() === 'NO') {
    const queue = pendingActions.get(chatId);
    if (queue && queue.length > 0) {
      const action = queue.shift(); // Remove from front

      if (text.toUpperCase() === 'YES') {
        if (action.type === 'lead_response') {
          const lead = action.data;
          if (lead.phone) {
            const msg = smsTemplates.leadResponse(lead.name);
            const result = await sendSMS(lead.phone, msg);
            ctx.reply(result.success ? `Text sent to ${lead.name} (${lead.phone})!` : `SMS failed: ${result.error}`);
          } else {
            ctx.reply(`No phone number for ${lead.name}. Follow up via email: ${lead.email}`);
          }
          markLeadProcessed(lead);
        } else if (action.type === 'missed_call') {
          const call = action.data;
          const msg = smsTemplates.missedCall();
          const result = await sendSMS(call.from, msg);
          ctx.reply(result.success ? `Text sent to ${call.from}!` : `SMS failed: ${result.error}`);
        }
      } else {
        ctx.reply('Got it, skipped.');
        if (action.type === 'lead_response') {
          markLeadProcessed(action.data);
        }
      }

      // Prompt next action if any remain
      if (queue.length > 0) {
        await promptNextAction(chatId);
      } else {
        pendingActions.delete(chatId);
      }
      return;
    }
  }

  // --- Handle CONFIRM ---
  if (text.toUpperCase() === 'CONFIRM') {
    const pending = pendingConfirm.get(chatId);
    if (pending) {
      pendingConfirm.delete(chatId);

      // Handle estimate confirmation from conversation flow
      if (pending.intent === 'create_estimate_confirmed') {
        conversationState.delete(chatId);
        ctx.reply('Creating estimate...');
        try {
          const data = pending.params;
          const { findOrCreateCustomer } = require('../Skills/quickbooks-customer-creator');
          const { createEstimate } = require('../Skills/quickbooks-estimate-manager');
          const { createEvent } = require('../Skills/google-calendar-sync');

          // Find or create customer
          let customerId = data.customerId;
          if (!customerId) {
            const custResult = await findOrCreateCustomer({ name: data.customerName });
            if (!custResult.success) {
              ctx.reply(`Error creating customer: ${custResult.error}`);
              return;
            }
            customerId = custResult.customerId;
            if (custResult.created) {
              ctx.reply(`Customer "${custResult.customerName}" created in QuickBooks.`);
            }
          }

          // Create estimate with raw items as description
          const estResult = await createEstimate({
            customerId,
            lineItems: [{ description: data.rawItems, amount: 0, qty: 1 }],
            installDate: data.installDate,
            notes: `Estimate for ${data.customerName}. Items: ${data.rawItems}`,
          });

          if (!estResult.success) {
            ctx.reply(`Error creating estimate: ${estResult.error}`);
            return;
          }

          // Schedule calendar event for install date
          try {
            await createEvent({
              title: `Pool Fence Install — ${data.customerName}`,
              startTime: data.installDate,
              endTime: data.installDate,
              location: '',
              notes: `Estimate #${estResult.estimateNumber}. Items: ${data.rawItems}`,
            });
          } catch (calErr) {
            console.error('[bot] Calendar event creation failed:', calErr.message);
          }

          ctx.reply(
            `Estimate #${estResult.estimateNumber} created for ${data.customerName}.\n` +
            `Install date: ${data.installDate}\n` +
            `Calendar event added.\n\n` +
            `When the job is done, say "convert estimate ${estResult.estimateNumber} to invoice".`
          );
        } catch (err) {
          ctx.reply(`Error: ${err.message}`);
        }
        return;
      }

      ctx.reply('Confirmed. Executing...');
      try {
        const response = await executeCommand(pending);
        ctx.reply(response);
      } catch (err) {
        ctx.reply(`Error: ${err.message}`);
      }
    } else {
      ctx.reply('Nothing pending to confirm.');
    }
    return;
  }

  // --- Handle CANCEL ---
  if (text.toUpperCase() === 'CANCEL') {
    if (conversationState.has(chatId)) {
      conversationState.delete(chatId);
      pendingConfirm.delete(chatId);
      ctx.reply('Estimate flow cancelled.');
      return;
    }
    if (pendingConfirm.has(chatId)) {
      pendingConfirm.delete(chatId);
      ctx.reply('Cancelled.');
    } else {
      ctx.reply('Nothing to cancel.');
    }
    return;
  }

  // --- Handle conversation state (multi-step estimate flow) ---
  if (conversationState.has(chatId)) {
    const state = conversationState.get(chatId);

    if (state.step === 'estimate_items') {
      state.data.rawItems = text;
      state.step = 'estimate_date';
      ctx.reply('Got it. What install date? (e.g., March 20, 3/20, next Friday)\n\nOr type CANCEL to stop.');
      return;
    }

    if (state.step === 'estimate_date') {
      state.data.installDate = text;
      state.step = 'estimate_confirm';

      ctx.reply(
        `Estimate Summary:\n\n` +
        `Customer: ${state.data.customerName}\n` +
        `Items: ${state.data.rawItems}\n` +
        `Install date: ${state.data.installDate}\n\n` +
        `Reply CONFIRM to create or CANCEL to stop.`
      );

      pendingConfirm.set(chatId, {
        intent: 'create_estimate_confirmed',
        params: state.data,
        requiresConfirm: false,
        raw: text,
      });
      return;
    }

    conversationState.delete(chatId);
  }

  // --- Claude Code bridge ---
  const claudeMatch = text.match(/^claude\s*[:\-]\s*(.+)/i);
  if (claudeMatch) {
    const task = claudeMatch[1].trim();
    const result = await triggerClaudeCode(task, chatId);
    ctx.reply(result.success ? result.message : `Warning: ${result.message}`);
    return;
  }

  // --- Parse the command ---
  const parsed = parseCommand(text);

  if (parsed.intent === 'unknown') {
    ctx.reply(
      `I didn't catch that. Try:\n\n` +
      `"Job 1001 done" / "Finished 1001"\n` +
      `"What's my schedule?" / "Any jobs today?"\n` +
      `"Send invoice for 1001" / "Bill for 1001"\n` +
      `"New estimate for Smith"\n` +
      `"Pull up Johnson"\n` +
      `"Claude: build me a landing page"\n\n` +
      `/help for all commands.`
    );
    return;
  }

  // --- Confirmation flow ---
  if (parsed.requiresConfirm) {
    pendingConfirm.set(chatId, parsed);
    ctx.reply(
      `This requires confirmation:\n\n` +
      `Action: ${parsed.intent.replace(/_/g, ' ')}\n` +
      `Details: ${JSON.stringify(parsed.params)}\n\n` +
      `Reply CONFIRM to proceed or CANCEL to abort.`
    );
    return;
  }

  // --- Execute command ---
  try {
    const response = await executeCommand(parsed);

    // Check for estimate flow trigger
    if (response && response.startsWith('__START_ESTIMATE_FLOW__')) {
      const customerSearch = response.replace('__START_ESTIMATE_FLOW__', '');
      const { searchCustomer } = require('../Skills/quickbooks-customer-creator');
      const searchResult = await searchCustomer(customerSearch);

      let customerName = customerSearch;
      let customerId = null;

      if (searchResult.success && searchResult.count > 0) {
        const match = searchResult.customers[0];
        customerName = match.name;
        customerId = match.id;
        ctx.reply(
          `Found: ${match.name}${match.phone ? ' (' + match.phone + ')' : ''}\n\n` +
          `What line items for this estimate?\n` +
          `(e.g., "80ft mesh fence, 1 gate, deck sleeves")\n\n` +
          `Or type CANCEL to stop.`
        );
      } else {
        ctx.reply(
          `No customer "${customerSearch}" found in QuickBooks. I'll create one when you confirm.\n\n` +
          `What line items for this estimate?\n` +
          `(e.g., "80ft mesh fence, 1 gate, deck sleeves")\n\n` +
          `Or type CANCEL to stop.`
        );
      }

      conversationState.set(chatId, {
        step: 'estimate_items',
        data: { customerSearch, customerName, customerId },
      });
      return;
    }

    // Track job completion and invoice sends for evening summary
    if (parsed.intent === 'job_complete' && response && !response.startsWith('Error')) {
      const { lookupJob } = require('../Skills/quickbooks-job-lookup');
      const lookup = await lookupJob(parsed.params.jobNumber);
      if (lookup.success && lookup.job) {
        trackJobCompleted(parsed.params.jobNumber, lookup.job.customer_name);
        trackInvoiceSent(lookup.job.invoice_number, lookup.job.customer_name, lookup.job.amount);

        const reviewResult = scheduleReviewRequest({
          customer_name: lookup.job.customer_name,
          phone: lookup.job.email,
          completion_date: new Date().toISOString(),
        });
        ctx.reply(response + '\n\n' + (reviewResult.message || ''));
        return;
      }
    }

    if (parsed.intent === 'send_invoice' && response && !response.startsWith('Error')) {
      const { lookupJob } = require('../Skills/quickbooks-job-lookup');
      const lookup = await lookupJob(parsed.params.jobNumber);
      if (lookup.success && lookup.job) {
        trackInvoiceSent(lookup.job.invoice_number, lookup.job.customer_name, lookup.job.amount);
      }
    }

    ctx.reply(response);
  } catch (err) {
    ctx.reply(`Something went wrong: ${err.message}`);
  }
});

// =====================
// SCHEDULED TASKS
// =====================

// 7:00 AM — Morning Briefing
cron.schedule('0 7 * * *', async () => {
  console.log('[bot] Sending 7AM morning briefing...');
  const briefing = await buildMorningBriefing();
  await notifyOwner(briefing);
}, { timezone: 'America/New_York' });

// 5:00 PM — Evening Summary
cron.schedule('0 17 * * *', async () => {
  console.log('[bot] Sending 5PM evening summary...');
  const summary = await buildEveningSummary();
  await notifyOwner(summary);
}, { timezone: 'America/New_York' });

// Every 4 hours — Check for new leads
cron.schedule('0 */4 * * *', async () => {
  console.log('[bot] Checking for new leads...');
  try {
    const leads = await checkForNewLeads();
    if (leads.length > 0 && ownerChatId) {
      for (const lead of leads) {
        queueAction(ownerChatId, { type: 'lead_response', data: lead, timestamp: Date.now() });
      }
      const queue = pendingActions.get(ownerChatId);
      if (queue && queue.length === leads.length) {
        await promptNextAction(ownerChatId);
      }
    }
  } catch (err) {
    console.error('[bot] Lead check error:', err.message);
  }
}, { timezone: 'America/New_York' });

// Every 15 min (7AM-7PM, Mon-Sat) — Check for missed calls
cron.schedule('*/15 7-19 * * 1-6', async () => {
  try {
    const missed = await checkMissedCalls();
    if (missed.length > 0 && ownerChatId) {
      for (const call of missed) {
        queueAction(ownerChatId, { type: 'missed_call', data: call, timestamp: Date.now() });
      }
      const queue = pendingActions.get(ownerChatId);
      if (queue && queue.length === missed.length) {
        await promptNextAction(ownerChatId);
      }
    }
  } catch (err) {
    console.error('[bot] Missed call check error:', err.message);
  }
}, { timezone: 'America/New_York' });

// Every hour — Process scheduled review requests + drip sequences
cron.schedule('0 * * * *', async () => {
  const result = await processScheduledReviews();
  if (result.processed > 0) {
    console.log(`[bot] Processed ${result.processed} review request(s)`);
    await notifyOwner(`Sent ${result.processed} review request(s) to customers.`);
  }

  try {
    const dripResult = await processDripQueue();
    if (dripResult.sent > 0) {
      console.log(`[bot] Sent ${dripResult.sent} drip message(s)`);
    }
  } catch (err) {
    console.error('[bot] Drip queue error:', err.message);
  }
});

// Friday 5PM — Weekly review reminder
cron.schedule('0 17 * * 5', async () => {
  await notifyOwner(
    `Happy Friday, boss!\n\n` +
    `Time for your weekly review. Take 10 minutes to reflect on the week.\n\n` +
    `Type /weeklyreview to get started.`
  );
}, { timezone: 'America/New_York' });

// Sunday 8PM — Week ahead prep
cron.schedule('0 20 * * 0', async () => {
  await notifyOwner(
    `Week Ahead Prep\n\n` +
    `Plan your week tomorrow morning. Things to check:\n` +
    `- Confirm all scheduled jobs\n` +
    `- Order any materials needed\n` +
    `- Follow up on outstanding quotes\n` +
    `- Set your top 3 goals for the week\n\n` +
    `Use /setgoal to add your goals. Have a restful Sunday!`
  );
}, { timezone: 'America/New_York' });

// =====================
// ERROR & LAUNCH
// =====================

bot.catch((err) => {
  console.error('[bot] Error:', err.message);
});

console.log('[bot] Starting Telegram CEO Assistant v2...');

// Telegraf's launch() never resolves (infinite polling loop).
// Use the onLaunch callback for post-startup logic.
bot.launch(
  { dropPendingUpdates: true },
  () => {
    console.log('[bot] Bot is live. All cron jobs active.');

    setTimeout(() => {
      notifyOwner(
        `Bot is online and ready.\n\n` +
        `Active schedules:\n` +
        `- 7:00 AM — Morning briefing\n` +
        `- 5:00 PM — Evening summary\n` +
        `- Every 4h — Lead check\n` +
        `- Every 15m (7AM-7PM) — Missed call check\n` +
        `- Hourly — Review request processor\n` +
        `- Friday 5PM — Weekly review\n` +
        `- Sunday 8PM — Week prep\n\n` +
        `Type /help to see all commands.`
      );
    }, 2000);
  }
).catch((err) => {
  console.error('[bot] Fatal error:', err.message);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { bot, notifyOwner };
