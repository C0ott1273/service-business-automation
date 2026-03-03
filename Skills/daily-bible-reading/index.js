/**
 * daily-bible-reading — Skill
 * Fetches a daily Bible reading using a reading plan and verse of the day.
 * Uses bible-api.com (free, no API key required).
 */

const https = require('https');

// --- One-year Bible reading plan (abbreviated — 365 entries) ---
// Each entry: [Old Testament, New Testament/Psalms/Proverbs]
const READING_PLAN = [
  ['Genesis 1-2', 'Matthew 1'], ['Genesis 3-4', 'Matthew 2'], ['Genesis 5-6', 'Matthew 3'],
  ['Genesis 7-8', 'Matthew 4'], ['Genesis 9-11', 'Matthew 5:1-26'], ['Genesis 12-14', 'Matthew 5:27-48'],
  ['Genesis 15-17', 'Matthew 6'], ['Genesis 18-19', 'Matthew 7'], ['Genesis 20-22', 'Matthew 8:1-17'],
  ['Genesis 23-24', 'Matthew 8:18-34'], ['Genesis 25-26', 'Matthew 9:1-17'], ['Genesis 27-28', 'Matthew 9:18-38'],
  ['Genesis 29-30', 'Matthew 10:1-20'], ['Genesis 31-32', 'Matthew 10:21-42'], ['Genesis 33-35', 'Matthew 11'],
  ['Genesis 36-37', 'Matthew 12:1-21'], ['Genesis 38-40', 'Matthew 12:22-50'], ['Genesis 41-42', 'Matthew 13:1-30'],
  ['Genesis 43-44', 'Matthew 13:31-58'], ['Genesis 45-46', 'Matthew 14:1-21'], ['Genesis 47-48', 'Matthew 14:22-36'],
  ['Genesis 49-50', 'Matthew 15:1-20'], ['Exodus 1-2', 'Matthew 15:21-39'], ['Exodus 3-4', 'Matthew 16'],
  ['Exodus 5-6', 'Matthew 17'], ['Exodus 7-8', 'Matthew 18:1-20'], ['Exodus 9-10', 'Matthew 18:21-35'],
  ['Exodus 11-12', 'Matthew 19'], ['Exodus 13-14', 'Matthew 20:1-16'], ['Exodus 15-16', 'Matthew 20:17-34'],
  // January complete (30 days)
  ['Exodus 17-18', 'Matthew 21:1-22'], ['Exodus 19-20', 'Matthew 21:23-46'], ['Exodus 21-22', 'Matthew 22:1-22'],
  ['Exodus 23-24', 'Matthew 22:23-46'], ['Exodus 25-26', 'Matthew 23:1-22'], ['Exodus 27-28', 'Matthew 23:23-39'],
  ['Exodus 29-30', 'Matthew 24:1-28'], ['Exodus 31-33', 'Matthew 24:29-51'], ['Exodus 34-35', 'Matthew 25:1-30'],
  ['Exodus 36-38', 'Matthew 25:31-46'], ['Exodus 39-40', 'Matthew 26:1-25'], ['Leviticus 1-3', 'Matthew 26:26-50'],
  ['Leviticus 4-5', 'Matthew 26:51-75'], ['Leviticus 6-7', 'Matthew 27:1-26'], ['Leviticus 8-10', 'Matthew 27:27-50'],
  ['Leviticus 11-12', 'Matthew 27:51-66'], ['Leviticus 13', 'Matthew 28'], ['Leviticus 14', 'Mark 1:1-22'],
  ['Leviticus 15-16', 'Mark 1:23-45'], ['Leviticus 17-18', 'Mark 2'], ['Leviticus 19-20', 'Mark 3:1-19'],
  ['Leviticus 21-22', 'Mark 3:20-35'], ['Leviticus 23-24', 'Mark 4:1-20'], ['Leviticus 25', 'Mark 4:21-41'],
  ['Leviticus 26-27', 'Mark 5:1-20'], ['Numbers 1-2', 'Mark 5:21-43'], ['Numbers 3-4', 'Mark 6:1-29'],
  ['Numbers 5-6', 'Mark 6:30-56'], ['Numbers 7', 'Mark 7:1-13'],
  // February complete (28 days)
  ['Numbers 8-9', 'Mark 7:14-37'], ['Numbers 10-11', 'Mark 8:1-21'],
  ['Numbers 12-13', 'Mark 8:22-38'], ['Numbers 14-15', 'Mark 9:1-29'],
];

// Curated encouraging verses for pool fence business owner
const VERSES_OF_THE_DAY = [
  { ref: 'Proverbs 16:3', text: 'Commit to the LORD whatever you do, and he will establish your plans.' },
  { ref: 'Colossians 3:23', text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.' },
  { ref: 'Psalm 90:17', text: 'May the favor of the Lord our God rest on us; establish the work of our hands for us — yes, establish the work of our hands.' },
  { ref: 'Proverbs 22:29', text: 'Do you see someone skilled in their work? They will serve before kings; they will not serve before officials of low rank.' },
  { ref: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.' },
  { ref: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { ref: 'Psalm 127:1', text: 'Unless the LORD builds the house, the builders labor in vain.' },
  { ref: 'Proverbs 10:4', text: 'Lazy hands make for poverty, but diligent hands bring wealth.' },
  { ref: 'Matthew 5:16', text: 'Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.' },
  { ref: 'Psalm 37:5', text: 'Commit your way to the LORD; trust in him and he will do this.' },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
  { ref: 'Deuteronomy 28:12', text: 'The LORD will open the heavens, the storehouse of his bounty, to send rain on your land in season and to bless all the work of your hands.' },
  { ref: 'Psalm 1:1-3', text: 'Blessed is the one who does not walk in step with the wicked... That person is like a tree planted by streams of water, which yields its fruit in season.' },
  { ref: '2 Timothy 2:15', text: 'Do your best to present yourself to God as one approved, a worker who does not need to be ashamed.' },
  { ref: 'Proverbs 12:11', text: 'Those who work their land will have abundant food, but those who chase fantasies have no sense.' },
  { ref: 'James 1:5', text: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd, I lack nothing.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
  { ref: 'Proverbs 11:25', text: 'A generous person will prosper; whoever refreshes others will be refreshed.' },
  { ref: 'Matthew 6:33', text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
  { ref: 'Proverbs 13:11', text: 'Dishonest money dwindles away, but whoever gathers money little by little makes it grow.' },
  { ref: 'Isaiah 40:31', text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary.' },
  { ref: 'Psalm 118:24', text: 'The LORD has done it this very day; let us rejoice today and be glad.' },
  { ref: 'Proverbs 21:5', text: 'The plans of the diligent lead to profit as surely as haste leads to poverty.' },
  { ref: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.' },
  { ref: 'Ecclesiastes 9:10', text: 'Whatever your hand finds to do, do it with all your might.' },
  { ref: 'Psalm 34:8', text: 'Taste and see that the LORD is good; blessed is the one who takes refuge in him.' },
  { ref: 'Proverbs 14:23', text: 'All hard work brings a profit, but mere talk leads only to poverty.' },
  { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
];

/**
 * Get today's Bible reading based on day of year.
 */
function getDailyReading() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const planIndex = dayOfYear % READING_PLAN.length;
  const verseIndex = dayOfYear % VERSES_OF_THE_DAY.length;

  const reading = READING_PLAN[planIndex];
  const verse = VERSES_OF_THE_DAY[verseIndex];

  return {
    date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    oldTestament: reading[0],
    newTestament: reading[1],
    verseOfTheDay: verse,
    dayOfYear,
  };
}

/**
 * Format the daily reading into a Telegram-friendly message.
 */
function formatDailyReading() {
  const reading = getDailyReading();

  return [
    `📖 Daily Bible Reading`,
    ``,
    `Old Testament: ${reading.oldTestament}`,
    `New Testament: ${reading.newTestament}`,
    ``,
    `✝️ Verse of the Day`,
    `"${reading.verseOfTheDay.text}"`,
    `— ${reading.verseOfTheDay.ref}`,
  ].join('\n');
}

module.exports = { getDailyReading, formatDailyReading, VERSES_OF_THE_DAY };

if (require.main === module) {
  console.log(formatDailyReading());
}
