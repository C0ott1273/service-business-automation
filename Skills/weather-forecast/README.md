# weather-forecast

Weather forecast for outdoor work planning. Uses Open-Meteo (free, no API key).

## Features
- Current temperature and conditions
- Daily high/low, rain chance, wind speed
- Rain and wind warnings for outdoor work
- Configurable location via env vars

## Environment Variables (optional)
```
WEATHER_LAT=28.5383    # Your city latitude
WEATHER_LON=-81.3792   # Your city longitude
```
Default: Central Florida. Update to your service area.

## Usage
```js
const { formatWeatherBriefing } = require('./index');
const msg = await formatWeatherBriefing();
```
