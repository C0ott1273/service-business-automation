# morning-briefing

Compiles the daily 6AM morning briefing combining all data sources.

## Includes
1. Weather forecast (rain/wind warnings for outdoor work)
2. Today's job schedule from Google Calendar
3. Daily Bible reading (OT + NT)
4. Verse of the day
5. Prayer reminder
6. Pool fence business tip of the day

## Usage
```js
const { buildMorningBriefing } = require('./index');
const message = await buildMorningBriefing();
// Send via Telegram bot
```

## Sample Output
```
Good morning, boss! ☀️
Monday, March 3, 2026

━━━━━━━━━━━━━━━━━━
☀️ Weather: Clear sky
High: 82°F | Low: 68°F
Rain: 10% | Wind: 8 mph
━━━━━━━━━━━━━━━━━━
🗓️ Today's Schedule (2 jobs)
1. 9:00 AM — Pool Fence Install - Smith @ 123 Oak St
2. 1:00 PM — Pool Fence Repair - Johnson @ 456 Elm Ave
━━━━━━━━━━━━━━━━━━
📖 Daily Bible Reading
...
━━━━━━━━━━━━━━━━━━
🙏 Prayer Reminder
...
━━━━━━━━━━━━━━━━━━
💡 Business Tip
Take before/after photos on today's jobs for social media.
━━━━━━━━━━━━━━━━━━
Have a blessed and productive day! 💪
```
