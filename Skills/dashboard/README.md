# dashboard

Simple web dashboard showing today's jobs and recent leads.

## Features
- Pulls today's jobs from Google Calendar
- Displays job title, time, location, and notes
- Mark jobs complete (triggers same flow as Telegram "Job done" command)
- Shows recent leads and their follow-up status (new, texted, scheduled)
- Falls back to demo data if Google Calendar is not configured

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dashboard HTML page |
| GET | `/api/jobs` | Today's jobs from Google Calendar |
| GET | `/api/leads` | Recent leads list |
| POST | `/api/jobs/:id/complete` | Mark a job complete |
| POST | `/api/leads` | Add a new lead |

## Usage
```bash
cd Skills && node dashboard/server.js
# Open http://localhost:3000
```

## Environment Variables
```
DASHBOARD_PORT=3000  (optional, defaults to 3000)
GOOGLE_CALENDAR_API_KEY=your-api-key
GOOGLE_CALENDAR_ID=your-calendar-id
```
