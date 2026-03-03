/**
 * weather-forecast — Skill
 * Fetches weather forecast for outdoor work planning.
 * Uses Open-Meteo API (free, no API key required).
 */

const https = require('https');

const DEFAULT_LAT = process.env.WEATHER_LAT || '28.5383';  // Default: Central Florida
const DEFAULT_LON = process.env.WEATHER_LON || '-81.3792';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse weather data')); }
      });
    }).on('error', reject);
  });
}

/**
 * Get today's weather forecast.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function getTodaysForecast(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&forecast_days=1`;

    const data = await fetchJSON(url);

    const current = data.current_weather || {};
    const daily = data.daily || {};

    return {
      success: true,
      current: {
        temp: current.temperature,
        windspeed: current.windspeed,
        description: weatherCodeToText(current.weathercode),
      },
      today: {
        high: daily.temperature_2m_max?.[0],
        low: daily.temperature_2m_min?.[0],
        rain_chance: daily.precipitation_probability_max?.[0] || 0,
        wind_max: daily.windspeed_10m_max?.[0],
        description: weatherCodeToText(daily.weathercode?.[0]),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function weatherCodeToText(code) {
  const codes = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };
  return codes[code] || 'Unknown';
}

function weatherEmoji(description) {
  const d = description.toLowerCase();
  if (d.includes('clear')) return '☀️';
  if (d.includes('partly')) return '⛅';
  if (d.includes('cloud') || d.includes('overcast')) return '☁️';
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('fog')) return '🌫️';
  return '🌤️';
}

/**
 * Format weather into a message for the morning briefing.
 */
async function formatWeatherBriefing(lat, lon) {
  const forecast = await getTodaysForecast(lat, lon);

  if (!forecast.success) {
    return '🌤️ Weather: Unable to fetch forecast';
  }

  const { today, current } = forecast;
  const emoji = weatherEmoji(today.description);
  const rainWarning = today.rain_chance > 40
    ? `\n⚠️ ${today.rain_chance}% chance of rain — plan indoor work or bring tarps`
    : '';
  const windWarning = today.wind_max > 20
    ? `\n💨 High winds (${Math.round(today.wind_max)} mph) — secure materials on site`
    : '';

  return [
    `${emoji} Weather: ${today.description}`,
    `High: ${Math.round(today.high)}°F | Low: ${Math.round(today.low)}°F`,
    `Rain: ${today.rain_chance}% | Wind: ${Math.round(today.wind_max)} mph`,
    rainWarning,
    windWarning,
  ].filter(Boolean).join('\n');
}

module.exports = { getTodaysForecast, formatWeatherBriefing, weatherCodeToText };

if (require.main === module) {
  formatWeatherBriefing().then(console.log);
}
