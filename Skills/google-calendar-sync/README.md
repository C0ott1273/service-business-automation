# google-calendar-sync

Read and write Google Calendar events. Powers the daily job dashboard and schedule queries.

## Inputs
- **Date range:** `"today"`, a specific date, or start/end range
- **Event details:** `{ title, startTime, endTime, location, notes }` for creating events

## Outputs
```json
{
  "success": true,
  "events": [
    {
      "id": "abc123",
      "title": "Gutter Cleaning - Smith",
      "start": "2024-03-15T09:00:00-04:00",
      "end": "2024-03-15T11:00:00-04:00",
      "location": "123 Oak St",
      "notes": "Two-story house, bring extension ladder"
    }
  ],
  "count": 1
}
```

## Environment Variables
```
GOOGLE_CALENDAR_API_KEY=your-api-key
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
```

## Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google Calendar API
3. Create an API key (restrict to Calendar API)
4. Get your Calendar ID from Google Calendar Settings → Integrate calendar
5. Add both to `.env`

## Usage

### As a module
```js
const { getTodaysJobs, getEvents, createEvent, formatSchedule } = require('./index');

// Get today's jobs
const today = await getTodaysJobs();
console.log(formatSchedule(today.events));

// Get events for a date range
const week = await getEvents('2024-03-15', '2024-03-22');

// Create a new event
const result = await createEvent({
  title: 'Gutter Cleaning - Smith',
  startTime: '2024-03-15T09:00:00',
  endTime: '2024-03-15T11:00:00',
  location: '123 Oak St',
  notes: 'Two-story house',
});
```

### CLI
```bash
node Skills/google-calendar-sync/index.js          # today's events
node Skills/google-calendar-sync/index.js 2024-03-15  # specific date
```

## Testing
```bash
node Skills/google-calendar-sync/test.js
```
No API key required — tests formatting logic only.
