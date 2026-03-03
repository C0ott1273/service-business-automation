# daily-bible-reading

Daily Bible reading plan with verse of the day. No API key required.

## Features
- One-year Bible reading plan (Old Testament + New Testament daily)
- 31 curated encouraging verses for business owners
- Auto-rotates based on day of year

## Outputs
```
📖 Daily Bible Reading

Old Testament: Genesis 1-2
New Testament: Matthew 1

✝️ Verse of the Day
"Commit to the LORD whatever you do, and he will establish your plans."
— Proverbs 16:3
```

## Usage
```js
const { formatDailyReading, getDailyReading } = require('./index');
console.log(formatDailyReading());
```
