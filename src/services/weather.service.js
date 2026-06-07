// =============================================================================
//  AMDAN ORGANICS – Weather Service
//  Fetches real-time data from OpenWeatherMap API
// =============================================================================

const axios        = require('axios');
const WeatherModel = require('../models/weather.model');

const WeatherService = {

  // ── Fetch and save current weather ─────────────────────────────────────────
  async fetchAndSave() {
    const lat    = process.env.FARM_LATITUDE  || 9.0192;
    const lon    = process.env.FARM_LONGITUDE || 38.7525;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    try {
      // Fetch current weather
      const currentURL  = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

      // Fetch 5-day forecast
      const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=8`;

      const [currentRes, forecastRes] = await Promise.all([
        axios.get(currentURL),
        axios.get(forecastURL)
      ]);

      const current  = currentRes.data;
      const forecast = forecastRes.data;

      // Extract relevant fields
      const weatherData = {
        latitude    : lat,
        longitude   : lon,
        temperature : current.main.temp,
        rainfall    : current.rain ? current.rain['1h'] || 0 : 0,
        humidity    : current.main.humidity,
        windSpeed   : current.wind.speed * 3.6, // convert m/s to km/h
        forecastData: {
          description : current.weather[0].description,
          feelsLike   : current.main.feels_like,
          daily       : forecast.list.map(item => ({
            datetime    : item.dt_txt,
            temp        : item.main.temp,
            humidity    : item.main.humidity,
            description : item.weather[0].description,
            rainChance  : item.pop ? Math.round(item.pop * 100) : 0
          }))
        },
        apiStatus   : 'Live'
      };

      const saved = await WeatherModel.save(weatherData);
      console.log('Weather data fetched and saved at:', new Date().toISOString());
      return saved;

    } catch (err) {
      console.error('Weather API fetch failed:', err.message);

      // Return cached data if API fails
      const cached = await WeatherModel.getLatest();
      if (cached) {
        console.log('Returning cached weather data.');
        return { ...cached, api_status: 'Cached' };
      }
      return null;
    }
  },

  // ── Evaluate weather alerts ─────────────────────────────────────────────────
  // Checks weather thresholds and generates alert messages
  evaluateAlerts(weatherData) {
    const alerts = [];

    if (!weatherData) return alerts;

    const temp     = parseFloat(weatherData.temperature);
    const humidity = parseFloat(weatherData.humidity);
    const rainfall = parseFloat(weatherData.rainfall);
    const wind     = parseFloat(weatherData.wind_speed);

    // Frost risk
    if (temp < 5) {
      alerts.push({
        type    : 'Weather Risk',
        urgency : 'Critical',
        message : `Frost risk detected! Temperature is ${temp}°C. Protect crops immediately.`
      });
    }

    // Heat stress
    if (temp > 38) {
      alerts.push({
        type    : 'Weather Risk',
        urgency : 'Warning',
        message : `High temperature alert: ${temp}°C. Increase irrigation for heat-sensitive crops.`
      });
    }

    // Heavy rainfall
    if (rainfall > 10) {
      alerts.push({
        type    : 'Weather Risk',
        urgency : 'Warning',
        message : `Heavy rainfall detected: ${rainfall}mm/h. Check field drainage to prevent waterlogging.`
      });
    }

    // High humidity - late blight risk
    if (humidity > 85 && rainfall > 2) {
      alerts.push({
        type    : 'Disease Alert',
        urgency : 'Warning',
        message : `High humidity (${humidity}%) combined with rainfall increases Late Blight risk for tomatoes and potatoes. Apply preventive fungicide.`
      });
    }

    // Strong wind
    if (wind > 50) {
      alerts.push({
        type    : 'Weather Risk',
        urgency : 'Warning',
        message : `Strong wind alert: ${wind}km/h. Secure tall crops and greenhouse covers.`
      });
    }

    // Drought risk
    if (humidity < 20 && rainfall === 0) {
      alerts.push({
        type    : 'Weather Risk',
        urgency : 'Warning',
        message : `Low humidity (${humidity}%) with no rainfall. Drought stress risk — increase irrigation.`
      });
    }

    return alerts;
  },
};

module.exports = WeatherService;
