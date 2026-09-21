/**
 * Weather & Map Section for Better Albay Homepage
 * Displays real-time weather data and interactive map of Albay, Philippines
 * With robust fallback system to ensure content always renders
 */

// Wrap everything in IIFE to prevent redeclaration errors
(function () {
  'use strict';

  console.log('=== weather-map.js: Script loading started ===');

  // ============================================================================
  // Mock/Fallback Data - Always available static data
  // ============================================================================
  function getMockWeather() {
    const now = new Date();
    const currentHour = now.getHours();
    const startIndex = currentHour >= 20 ? 1 : 0;

    const dailyForecast = [];
    const sampleCodes = [1, 2, 80, 0, 1];
    const sampleMaxTemps = [31, 32, 30, 31, 30];
    const sampleMinTemps = [25, 24, 25, 24, 25];

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + startIndex + i);
      const isToday = startIndex === 0 && i === 0;
      const dayName = isToday
        ? 'Today'
        : targetDate.toLocaleDateString('en-US', { weekday: 'short' });
      const code = sampleCodes[i % sampleCodes.length];
      const icon =
        code === 0 ? 'bi-sun-fill' : code === 80 ? 'bi-cloud-rain-fill' : 'bi-cloud-sun-fill';

      dailyForecast.push({
        date: targetDate.toISOString().split('T')[0],
        day: dayName,
        maxTemp: sampleMaxTemps[i],
        minTemp: sampleMinTemps[i],
        icon: icon,
        condition: 'Partly cloudy',
      });
    }

    return {
      temperature: 29,
      humidity: 65,
      windSpeed: 12,
      weatherCode: 1,
      condition: 'Mainly clear',
      icon: 'bi-cloud-sun-fill',
      dailyForecast: dailyForecast,
      hourlyForecast: [],
      isFallback: true,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Utility: Check if running via file: protocol (no network access)
  // ============================================================================
  function isFileProtocol() {
    try {
      return window.location.protocol === 'file:';
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // Weather Service - Handles fetching, caching, and providing weather data
  // ============================================================================
  const WeatherService = {
    CACHE_KEY: 'albay_weather_cache_v4',
    CACHE_TTL: 30 * 60 * 1000,
    API_URL: 'https://api.open-meteo.com/v1/forecast',
    COORDINATES: { lat: 13.1391, lon: 123.7434 },

    mapWeatherCode(code) {
      const mappings = {
        0: { condition: 'Clear sky', icon: 'bi-sun-fill' },
        1: { condition: 'Mainly clear', icon: 'bi-cloud-sun-fill' },
        2: { condition: 'Partly cloudy', icon: 'bi-cloud-sun-fill' },
        3: { condition: 'Overcast', icon: 'bi-clouds-fill' },
        45: { condition: 'Foggy', icon: 'bi-cloud-fog-fill' },
        48: { condition: 'Depositing rime fog', icon: 'bi-cloud-fog-fill' },
        51: { condition: 'Light drizzle', icon: 'bi-cloud-drizzle-fill' },
        53: { condition: 'Moderate drizzle', icon: 'bi-cloud-drizzle-fill' },
        55: { condition: 'Dense drizzle', icon: 'bi-cloud-drizzle-fill' },
        61: { condition: 'Slight rain', icon: 'bi-cloud-rain-fill' },
        63: { condition: 'Moderate rain', icon: 'bi-cloud-rain-fill' },
        65: { condition: 'Heavy rain', icon: 'bi-cloud-rain-heavy-fill' },
        80: { condition: 'Rain showers', icon: 'bi-cloud-rain-fill' },
        95: { condition: 'Thunderstorm', icon: 'bi-cloud-lightning-rain-fill' },
      };
      return mappings[code] || { condition: 'Partly cloudy', icon: 'bi-cloud-sun-fill' };
    },

    cacheWeather(data) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(
          this.CACHE_KEY,
          JSON.stringify({
            data: data,
            expiresAt: Date.now() + this.CACHE_TTL,
          })
        );
      } catch (e) {
        console.warn('Cache write failed:', e);
      }
    },

    getCachedWeather() {
      try {
        if (typeof localStorage === 'undefined') return null;

        // Clean up any legacy or deprecated cache keys
        ['albay_weather_cache', 'albay_weather_cache_v2', 'albay_weather_cache_v3'].forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (e) {}
        });

        const cached = localStorage.getItem(this.CACHE_KEY);
        if (!cached) return null;

        const entry = JSON.parse(cached);
        if (entry && entry.data && Date.now() < entry.expiresAt) {
          // Strictly require at least 5 dailyForecast items
          if (Array.isArray(entry.data.dailyForecast) && entry.data.dailyForecast.length >= 5) {
            return entry.data;
          }
          // Incomplete or obsolete cache: clear and force network fetch
          console.warn('Weather: Cached data missing dailyForecast, refreshing from API');
          localStorage.removeItem(this.CACHE_KEY);
          return null;
        }

        // Clear expired cache
        localStorage.removeItem(this.CACHE_KEY);
      } catch (e) {
        console.warn('Cache read failed:', e);
        try {
          localStorage.removeItem(this.CACHE_KEY);
        } catch (ex) {
          /* ignore */
        }
      }
      return null;
    },

    async fetchWeather() {
      // If running via file: protocol (no CORS), use mock data immediately
      if (isFileProtocol()) {
        console.log('Weather: File protocol detected, using mock data');
        return getMockWeather();
      }

      // Try cache first
      try {
        const cached = this.getCachedWeather();
        if (cached) {
          console.log(
            'Weather: Using cached data (expires in ' +
              Math.round((cached.timestamp + this.CACHE_TTL - Date.now()) / 1000) +
              's)'
          );
          return cached;
        }
      } catch (e) {
        console.warn('Weather: Cache check failed', e);
      }

      // Try API fetch with timeout
      console.log('Weather: Fetching live data from Open-Meteo API...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const params = new URLSearchParams({
          latitude: this.COORDINATES.lat,
          longitude: this.COORDINATES.lon,
          current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min',
          timezone: 'Asia/Manila',
          forecast_days: 7,
        });

        const apiUrl = `${this.API_URL}?${params}`;
        console.log('Weather: API URL:', apiUrl);

        const response = await fetch(apiUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const apiData = await response.json();
        console.log('Weather: API response received:', apiData);
        const weatherData = this.transformApiResponse(apiData);
        this.cacheWeather(weatherData);
        console.log(
          'Weather: ✓ Live data fetched successfully - Temp:',
          weatherData.temperature + '°C'
        );
        return weatherData;
      } catch (error) {
        console.warn('Weather: ✗ API fetch failed, using mock data -', error.message);
        return getMockWeather();
      }
    },

    transformApiResponse(apiData) {
      try {
        const current = apiData.current;
        const daily = apiData.daily;
        const { condition, icon } = this.mapWeatherCode(current.weather_code);

        const now = new Date();
        const currentHour = now.getHours();
        // At night (8 PM or later), today's daytime forecast is done, so show tomorrow through Day 5.
        // During the day (before 8 PM), start from today so users can see today's high/low.
        const startIndex = currentHour >= 20 ? 1 : 0;
        const dailyForecast = [];

        if (daily && Array.isArray(daily.time)) {
          for (let i = startIndex; i < daily.time.length && dailyForecast.length < 5; i++) {
            const dateParts = daily.time[i].split('-');
            const dateObj = new Date(
              Number(dateParts[0]),
              Number(dateParts[1]) - 1,
              Number(dateParts[2]),
              12
            );

            const isToday =
              i === 0 &&
              dateObj.getFullYear() === now.getFullYear() &&
              dateObj.getMonth() === now.getMonth() &&
              dateObj.getDate() === now.getDate();

            const dayName = isToday
              ? 'Today'
              : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const wCode = daily.weather_code ? daily.weather_code[i] : 0;
            const { icon: dIcon, condition: dCond } = this.mapWeatherCode(wCode);
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);

            dailyForecast.push({
              date: daily.time[i],
              day: dayName,
              maxTemp: maxTemp,
              minTemp: minTemp,
              icon: dIcon,
              condition: dCond,
            });
          }
        }

        // Failsafe: if dailyForecast didn't reach 5 items, pad with calculated days
        if (dailyForecast.length < 5) {
          const fallback = getMockWeather();
          for (let k = dailyForecast.length; k < 5; k++) {
            dailyForecast.push(fallback.dailyForecast[k]);
          }
        }

        return {
          temperature: Math.round(current.temperature_2m),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          condition,
          icon,
          dailyForecast,
          hourlyForecast: [],
          isFallback: false,
          timestamp: Date.now(),
        };
      } catch (e) {
        console.warn('Weather: Transform failed, using mock', e);
        return getMockWeather();
      }
    },
  };

  // ============================================================================
  // Weather UI - Renders weather data into the DOM
  // ============================================================================
  const WeatherUI = {
    render(container, data) {
      if (!container) return;

      try {
        let forecastDays = Array.isArray(data.dailyForecast) ? data.dailyForecast : [];
        if (forecastDays.length < 5) {
          console.warn('Weather: dailyForecast has fewer than 5 items, supplementing');
          const fallback = getMockWeather();
          for (let k = forecastDays.length; k < 5; k++) {
            forecastDays.push(fallback.dailyForecast[k]);
          }
        }

        const forecastHTML = forecastDays
          .slice(0, 5)
          .map(
            (d) => `
                <div class="weather-forecast-day weather-hour" role="listitem" aria-label="${d.day}: ${d.condition || 'Forecast'}, High ${d.maxTemp}°, Low ${d.minTemp}°">
                    <span class="weather-forecast-date weather-hour-time"${d.day === 'Today' ? ' data-i18n="weather-today-label"' : ''}>${d.day}</span>
                    <i class="bi ${d.icon}" aria-hidden="true" title="${d.condition || ''}"></i>
                    <span class="weather-forecast-temp weather-hour-temp">${d.maxTemp}°</span>
                    <span class="weather-forecast-min">${d.minTemp}°</span>
                </div>
            `
          )
          .join('');

        const dataSourceBadge = data.isFallback
          ? '<span style="font-size:0.65rem;color:rgba(255,255,255,0.5);margin-left:4px;" title="Using fallback data">(Demo)</span>'
          : '<span style="font-size:0.65rem;color:#06a77d;margin-left:4px;" title="Live data from Open-Meteo API">●</span>';

        container.innerHTML = `
                <div class="weather-widget" role="region" aria-label="Current weather and 5-day forecast in Albay">
                    <div class="weather-current">
                        <div class="weather-current-icon" aria-hidden="true">
                            <i class="bi ${data.icon}"></i>
                        </div>
                        <div class="weather-current-info">
                            <div class="weather-current-temp" aria-label="Temperature ${data.temperature} degrees Celsius">${data.temperature}°C</div>
                            <div class="weather-current-condition" aria-label="Condition: ${data.condition}">${data.condition}${dataSourceBadge}</div>
                            <div class="weather-current-location">
                                <i class="bi bi-geo-alt" aria-hidden="true"></i> Albay, Philippines
                            </div>
                        </div>
                    </div>
                    <div class="weather-stats" role="list" aria-label="Weather details">
                        <div class="weather-stat" role="listitem" aria-label="Humidity ${data.humidity} percent">
                            <i class="bi bi-droplet" aria-hidden="true"></i>
                            <span>${data.humidity}%</span>
                        </div>
                        <div class="weather-stat" role="listitem" aria-label="Wind speed ${data.windSpeed} kilometers per hour">
                            <i class="bi bi-wind" aria-hidden="true"></i>
                            <span>${data.windSpeed} km/h</span>
                        </div>
                    </div>
                    <div class="weather-forecast-section">
                        <div class="weather-forecast-header">
                            <span class="weather-forecast-title" data-i18n="weather-forecast-heading">5-Day Forecast</span>
                        </div>
                        <div class="weather-forecast-strip weather-hourly" role="list" aria-label="Next 5-day weather forecast">
                            ${forecastHTML}
                        </div>
                    </div>
                </div>
            `;

        container.setAttribute('data-weather-loaded', 'true');
        if (
          typeof window !== 'undefined' &&
          window.TranslationEngine &&
          typeof window.TranslationEngine.applyTranslations === 'function'
        ) {
          const activeLang = window.TranslationEngine.getCurrentLanguage
            ? window.TranslationEngine.getCurrentLanguage()
            : window.TranslationEngine.currentLang;
          window.TranslationEngine.applyTranslations(activeLang);
        }
      } catch (e) {
        console.error('Weather: Render failed', e);
        this.renderError(container);
      }
    },

    renderLoading(container) {
      if (!container) return;
      container.innerHTML = `
            <div class="weather-loading" data-loading="true" aria-busy="true" aria-label="Loading weather data">
                <div class="weather-current">
                    <div class="skeleton-circle"></div>
                    <div class="weather-current-info">
                        <div class="skeleton-text skeleton-lg"></div>
                        <div class="skeleton-text skeleton-md" style="margin-top:8px;"></div>
                        <div class="skeleton-text skeleton-sm" style="margin-top:8px;"></div>
                    </div>
                </div>
                <div class="weather-stats">
                    <div class="skeleton-text skeleton-stat"></div>
                    <div class="skeleton-text skeleton-stat"></div>
                </div>
                <div class="weather-forecast-section">
                    <div class="skeleton-text skeleton-sm" style="width:70px;margin-bottom:8px;"></div>
                    <div class="weather-forecast-strip weather-hourly">
                        <div class="skeleton-hour"></div>
                        <div class="skeleton-hour"></div>
                        <div class="skeleton-hour"></div>
                        <div class="skeleton-hour"></div>
                        <div class="skeleton-hour"></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderError(container, retryFn) {
      if (!container) return;
      container.innerHTML = `
            <div class="weather-error" role="alert">
                <div class="weather-error-content">
                    <i class="bi bi-cloud-slash" aria-hidden="true"></i>
                    <p>Weather data unavailable</p>
                    <button type="button" class="btn btn-sm btn-primary weather-retry-btn" onclick="window.WeatherMapInit && window.WeatherMapInit()">
                        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Retry
                    </button>
                </div>
            </div>
        `;
      container.setAttribute('data-weather-loaded', 'error');
    },
  };

  // ============================================================================
  // Map Component - Initializes and manages the Leaflet map
  // ============================================================================
  const MapComponent = {
    ALBAY_BOUNDS: [
      [12.94, 123.35], // Southwest (Pio Duran / Ragay Gulf)
      [13.55, 124.25], // Northeast (Tiwi / Rapu-Rapu Island / Lagonoy Gulf)
    ],
    ALBAY_CENTER: [13.2, 123.68],
    DEFAULT_ZOOM: 10,
    map: null,
    markersGroup: null,
    markerItems: [],
    activeFilter: 'all',

    // Verified Civic Locations of Albay Province: 18 LGUs + Capitol + Civic Landmarks
    CIVIC_LOCATIONS: [
      {
        id: 'capitol',
        name: 'Albay Provincial Capitol',
        shortName: 'Albay Capitol',
        category: 'capitol',
        district: 2,
        lat: 13.1391,
        lon: 123.7434,
        address: 'Peñaranda Park, Old Albay District, Legazpi City',
        leaderTitle: 'Governor',
        leader: 'Hon. Noel E. Rosal',
        viceLeaderTitle: 'Vice Governor',
        viceLeader: "Hon. Farida 'Diday' Co",
        note: 'Seat of the Provincial Government of Albay (PGA)',
        url: 'government/officials.html',
        badge: 'Provincial Seat &bull; Legazpi City',
        icon: 'bi-bank2',
        pinColor: 'capitol',
      },
      {
        id: 'legazpi',
        name: 'Legazpi City',
        shortName: 'Legazpi City',
        category: 'city',
        isCapital: true,
        district: 2,
        lat: 13.1394,
        lon: 123.7438,
        address: 'City Hall Bldg., Rizal St., Legazpi City',
        leaderTitle: 'City Mayor',
        leader: 'Hon. Hisham B. Ismail',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Luis Felipe L. Gutierrez',
        population: 210616,
        barangays: 70,
        landArea: 162.56,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Legazpi',
        badge: 'Provincial Capital &bull; Component City',
        icon: 'bi-building',
        pinColor: 'city',
      },
      {
        id: 'ligao',
        name: 'Ligao City',
        shortName: 'Ligao City',
        category: 'city',
        district: 3,
        lat: 13.2415,
        lon: 123.5358,
        address: 'City Hall, Sta. Cruz, Ligao City',
        leaderTitle: 'City Mayor',
        leader: 'Hon. Fernando V. Gonzalez',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Jaypee M. David',
        population: 119779,
        barangays: 55,
        landArea: 239.38,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Ligao',
        badge: 'Component City &bull; District 3',
        icon: 'bi-building',
        pinColor: 'city',
      },
      {
        id: 'tabaco',
        name: 'Tabaco City',
        shortName: 'Tabaco City',
        category: 'city',
        district: 1,
        lat: 13.3592,
        lon: 123.7314,
        address: 'City Hall, Llorente St., Tabaco City',
        leaderTitle: 'City Mayor',
        leader: 'Hon. Reynaldo B. Bragais',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Glenda Ong Bongao',
        population: 140779,
        barangays: 47,
        landArea: 122.18,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Tabaco',
        badge: 'Component City &bull; District 1',
        icon: 'bi-building',
        pinColor: 'city',
      },
      {
        id: 'bacacay',
        name: 'Bacacay',
        category: 'municipality',
        district: 1,
        lat: 13.2936,
        lon: 123.7917,
        address: 'Barangay 4, Bacacay, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Daniel Jose "Nookie" Bombales',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Robert Hector "Bob" Arjona',
        population: 72298,
        barangays: 56,
        landArea: 124.1,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Bacacay',
        badge: 'Municipality &bull; District 1',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'camalig',
        name: 'Camalig',
        category: 'municipality',
        district: 2,
        lat: 13.1683,
        lon: 123.6331,
        address: 'Municipal Hall, Brgy. 2, Camalig, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Carlos Irwin "Caloy" Baldo Jr.',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Maria Ahrdail "Ding" Baldo',
        population: 73087,
        barangays: 50,
        landArea: 135.1,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Camalig',
        badge: 'Municipality &bull; District 2',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'daraga',
        name: 'Daraga',
        category: 'municipality',
        district: 2,
        lat: 13.1517,
        lon: 123.6933,
        address: 'T. Perez St., San Roque, Daraga, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Victor "Vic" Perete',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Fleur Jazel "Love" Ruiz',
        population: 138000,
        barangays: 54,
        landArea: 118.82,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Daraga',
        badge: '1st Class Municipality &bull; District 2',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'guinobatan',
        name: 'Guinobatan',
        category: 'municipality',
        district: 3,
        lat: 13.1895,
        lon: 123.5986,
        address: 'Mabini St., Poblacion, Guinobatan, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Ann Ongjoco',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Rogelio "Doc Butch" Rivera',
        population: 84420,
        barangays: 44,
        landArea: 178.35,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Guinobatan',
        badge: 'Municipality &bull; District 3',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'jovellar',
        name: 'Jovellar',
        category: 'municipality',
        district: 3,
        lat: 13.0719,
        lon: 123.6033,
        address: 'Poblacion, Jovellar, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Jorem Arcangel',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Cezar "Nong" Arellano',
        population: 17538,
        barangays: 23,
        landArea: 79.74,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Jovellar',
        badge: 'Municipality &bull; District 3',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'libon',
        name: 'Libon',
        category: 'municipality',
        district: 3,
        lat: 13.3,
        lon: 123.4333,
        address: 'Zone 1, Libon, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Macgregor Edward "Mac" Sayson',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Jan Saclag',
        population: 72135,
        barangays: 47,
        landArea: 241.06,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Libon',
        badge: 'Municipality &bull; District 3',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'malilipot',
        name: 'Malilipot',
        category: 'municipality',
        district: 1,
        lat: 13.3167,
        lon: 123.7333,
        address: 'Belen St., Brgy. II Poblacion, Malilipot, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Cenon Volante',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Jose Bolaños',
        population: 41066,
        barangays: 18,
        landArea: 44.86,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Malilipot',
        badge: 'Municipality &bull; District 1',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'malinao',
        name: 'Malinao',
        category: 'municipality',
        district: 1,
        lat: 13.4111,
        lon: 123.6944,
        address: 'Poblacion, Malinao, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Sheryl Capus-Bilo',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Abner "Abe" Cargullo',
        population: 49570,
        barangays: 29,
        landArea: 117.4,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Malinao',
        badge: 'Municipality &bull; District 1',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'manito',
        name: 'Manito',
        category: 'municipality',
        district: 2,
        lat: 13.1206,
        lon: 123.8697,
        address: 'Purok 2 Rizal St., It-ba, Manito, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Jerry Arizapa',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. "Jun" Solinap',
        population: 26425,
        barangays: 15,
        landArea: 106.83,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Manito',
        badge: 'Municipality &bull; District 2',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'oas',
        name: 'Oas',
        category: 'municipality',
        district: 3,
        lat: 13.2589,
        lon: 123.4981,
        address: 'Ilaor Sur, Oas, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. John Kenneth Trinidad',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Domingo "Ging" Escoto Jr.',
        population: 64890,
        barangays: 53,
        landArea: 266.7,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Oas',
        badge: 'Municipality &bull; District 3',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'pio-duran',
        name: 'Pio Duran',
        category: 'municipality',
        district: 3,
        lat: 12.9861,
        lon: 123.4542,
        address: 'Caratagan, Pio Duran, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Evangeline "Vangie" Arandia',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Henry "Itay" Callope',
        population: 48713,
        barangays: 33,
        landArea: 142.91,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Pio%20Duran',
        badge: 'Municipality &bull; District 3',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'polangui',
        name: 'Polangui',
        category: 'municipality',
        district: 3,
        lat: 13.2917,
        lon: 123.4847,
        address: 'Centro Occidental, Polangui, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Jesciel Salceda',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Cherilie "Cherry" Mella-Sampal',
        population: 89344,
        barangays: 44,
        landArea: 125.65,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Polangui',
        badge: '1st Class Municipality &bull; District 3',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'rapu-rapu',
        name: 'Rapu-Rapu',
        category: 'municipality',
        district: 2,
        lat: 13.1878,
        lon: 124.1264,
        address: 'Poblacion, Rapu-Rapu Island, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Romel "Otoy" Galicia',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. "Tom" Galicia',
        population: 36281,
        barangays: 34,
        landArea: 154.86,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Rapu-Rapu',
        badge: 'Island Municipality &bull; District 2',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'santo-domingo',
        name: 'Santo Domingo',
        category: 'municipality',
        district: 1,
        lat: 13.2344,
        lon: 123.7744,
        address: 'San Vicente, Santo Domingo, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Nomar "Bong" Banda',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. "Mark" Aguas',
        population: 37586,
        barangays: 23,
        landArea: 51.17,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Santo%20Domingo',
        badge: 'Municipality &bull; District 1',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'tiwi',
        name: 'Tiwi',
        category: 'municipality',
        district: 1,
        lat: 13.4564,
        lon: 123.6811,
        address: 'Tigbi, Tiwi, Albay',
        leaderTitle: 'Municipal Mayor',
        leader: 'Hon. Jose Morel "Jojo" Climaco',
        viceLeaderTitle: 'Vice Mayor',
        viceLeader: 'Hon. Jaime "Ami" Villanueva',
        population: 56871,
        barangays: 25,
        landArea: 103.07,
        url: 'government/index.html#lgu-grid',
        brgyUrl: 'government/barangays.html?lgu=Tiwi',
        badge: 'Municipality &bull; District 1',
        icon: 'bi-geo-alt-fill',
        pinColor: 'muni',
      },
      {
        id: 'mayon',
        name: 'Mayon Volcano (2,463m)',
        shortName: 'Mayon Volcano',
        category: 'civic',
        lat: 13.257,
        lon: 123.6856,
        leaderTitle: 'Geographic Center',
        leader: 'Active Stratovolcano & Natural Park',
        note: 'World-renowned cone volcano, protected national park & UNESCO Biosphere Reserve at the center of Albay.',
        badge: 'Geographic Center &bull; Landmark',
        icon: 'bi-triangle-fill',
        pinColor: 'landmark',
      },
      {
        id: 'brhmc',
        name: 'BRHMC Legazpi',
        shortName: 'BRHMC',
        category: 'civic',
        district: 2,
        lat: 13.1432,
        lon: 123.7383,
        address: 'Rizal St., Legazpi City',
        leaderTitle: 'Facility Type',
        leader: 'Tertiary Government Referral Center',
        note: 'Bicol Regional Hospital and Medical Center (founded 1918 as Albay Provincial Hospital).',
        url: 'services/health.html',
        badge: 'Tertiary Hospital &bull; Legazpi City',
        icon: 'bi-hospital-fill',
        pinColor: 'civic',
      },
      {
        id: 'apsemo',
        name: 'APSEMO / Albay PDRRMC',
        shortName: 'Albay Emergency (APSEMO)',
        category: 'civic',
        district: 2,
        lat: 13.1397,
        lon: 123.7425,
        address: 'Capitol Compound, Legazpi City',
        leaderTitle: 'Emergency Operations',
        leader: 'Provincial Disaster Management Center',
        note: 'Albay Public Safety and Emergency Management Office & 24/7 Provincial Operation Center.',
        url: 'contact/',
        badge: 'Disaster Safety &bull; Legazpi City',
        icon: 'bi-shield-fill-check',
        pinColor: 'civic',
      },
    ],

    init(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Map: Container not found');
        return null;
      }

      this.initToolbarControls();

      // If map already exists, just resize it
      if (this.map) {
        console.log('Map: Already initialized, resizing');
        this.map.invalidateSize();
        return this.map;
      }

      // If Leaflet is available, upgrade the container to an interactive map
      if (typeof L !== 'undefined') {
        console.log('Map: Leaflet available, upgrading to interactive civic map of Albay');
        return this.initLeaflet(container);
      }

      // Leaflet not available — the iframe embedded in the HTML stays visible.
      if (!container.querySelector('iframe')) {
        console.warn('Map: Leaflet unavailable and no iframe found, inserting fallback');
        this.renderTextFallback(container);
      } else {
        console.log('Map: Leaflet unavailable, keeping existing iframe');
      }
      return null;
    },

    initToolbarControls() {
      if (this.controlsInitialized) return;
      this.controlsInitialized = true;

      // Filter buttons
      const filterBtns = document.querySelectorAll('.map-filter-btn');
      filterBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const filter = btn.getAttribute('data-filter') || 'all';
          this.applyFilter(filter);
        });
      });

      // Fit Entire Albay reset button
      const resetBtn = document.getElementById('map-reset-bounds');
      if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.fitEntireProvince();
        });
      }
    },

    renderLoading(container) {
      container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;background:#f5f5f5;">
                <i class="bi bi-map" style="font-size:2.5rem;color:#0032a0;opacity:0.4;"></i>
                <p style="color:#888;margin-top:0.5rem;font-size:0.875rem;">Loading Albay civic map...</p>
            </div>
        `;
    },

    renderTextFallback(container) {
      // Use OpenStreetMap iframe embed as fallback - encompasses all of Albay province
      container.innerHTML = `
            <iframe 
                width="100%" 
                height="300" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="https://www.openstreetmap.org/export/embed.html?bbox=123.35%2C12.92%2C124.25%2C13.55&layer=mapnik&marker=13.1391%2C123.7434"
                style="border:0;display:block;"
                title="Civic Map of Albay Province, Philippines"
                loading="lazy">
            </iframe>
        `;
      container.setAttribute('data-map-loaded', 'iframe');
    },

    createMarkerIcon(loc) {
      const pinClass = 'civic-marker-' + (loc.pinColor || 'muni');
      const html = `<div class="civic-pin ${pinClass}" title="${loc.name}"><i class="bi ${loc.icon || 'bi-geo-alt-fill'}"></i></div>`;
      return L.divIcon({
        className: 'civic-div-icon',
        html: html,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16],
      });
    },

    createPopupContent(loc) {
      let statsHtml = '';
      if (loc.population) {
        statsHtml += `
          <div class="civic-popup-stat">
            <span class="civic-popup-stat-label">Pop. (2024)</span>
            <span class="civic-popup-stat-val">${loc.population.toLocaleString('en-PH')}</span>
          </div>
        `;
      }
      if (loc.barangays) {
        statsHtml += `
          <div class="civic-popup-stat">
            <span class="civic-popup-stat-label">Barangays</span>
            <span class="civic-popup-stat-val">${loc.barangays}</span>
          </div>
        `;
      }
      if (loc.landArea) {
        statsHtml += `
          <div class="civic-popup-stat">
            <span class="civic-popup-stat-label">Land Area</span>
            <span class="civic-popup-stat-val">${loc.landArea.toLocaleString('en-PH')} km²</span>
          </div>
        `;
      }

      let leaderHtml = '';
      if (loc.leader) {
        leaderHtml += `
          <div class="civic-popup-leader">
            <span class="civic-popup-leader-role">${loc.leaderTitle || 'Head'}:</span>
            <strong class="civic-popup-leader-name">${loc.leader}</strong>
          </div>
        `;
      }
      if (loc.viceLeader) {
        leaderHtml += `
          <div class="civic-popup-leader">
            <span class="civic-popup-leader-role">${loc.viceLeaderTitle || 'Vice Head'}:</span>
            <span class="civic-popup-leader-name">${loc.viceLeader}</span>
          </div>
        `;
      }
      if (loc.note) {
        leaderHtml += `<p class="civic-popup-note">${loc.note}</p>`;
      }

      let actionsHtml = '';
      if (loc.url || loc.brgyUrl) {
        actionsHtml = '<div class="civic-popup-actions">';
        if (loc.url) {
          actionsHtml += `<a href="${loc.url}" class="civic-popup-link"><i class="bi bi-info-circle"></i> Details</a>`;
        }
        if (loc.brgyUrl) {
          actionsHtml += `<a href="${loc.brgyUrl}" class="civic-popup-link"><i class="bi bi-diagram-3"></i> Barangays</a>`;
        }
        actionsHtml += '</div>';
      }

      return `
        <div class="civic-popup-card">
          <div class="civic-popup-header">
            <span class="civic-popup-badge">${loc.badge || 'Province of Albay'}</span>
            <h4 class="civic-popup-title">${loc.name}</h4>
          </div>
          ${leaderHtml}
          ${statsHtml ? `<div class="civic-popup-stats">${statsHtml}</div>` : ''}
          ${actionsHtml}
        </div>
      `;
    },

    initLeaflet(container) {
      try {
        console.log('Map: Initializing Leaflet for entire Albay civic map...');

        // Clear existing inline iframe
        container.innerHTML = '';

        // Create the map fitted to entire Albay bounds
        this.map = L.map(container, {
          center: this.ALBAY_CENTER,
          zoom: this.DEFAULT_ZOOM,
          scrollWheelZoom: false,
          zoomControl: true,
          keyboard: true,
          keyboardPanDelta: 80,
        });

        // Add tile layer with CSP-block detection
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          crossOrigin: false,
        });

        let tileLoadedOnce = false;
        let tileErrorCount = 0;

        tileLayer.on('tileload', () => {
          tileLoadedOnce = true;
        });

        tileLayer.on('tileerror', () => {
          if (!tileLoadedOnce) {
            tileErrorCount++;
            if (tileErrorCount >= 3) {
              console.warn('Map: Tiles blocked, falling back to OSM embed iframe');
              const map = this.map;
              this.map = null;
              if (map) map.remove();
              this.renderTextFallback(container);
            }
          }
        });

        tileLayer.addTo(this.map);

        // Layer group for civic markers
        this.markersGroup = L.layerGroup().addTo(this.map);
        this.markerItems = [];

        // Add all civic locations
        this.CIVIC_LOCATIONS.forEach((loc) => {
          const icon = this.createMarkerIcon(loc);
          const marker = L.marker([loc.lat, loc.lon], {
            icon: icon,
            title: loc.name,
            alt: loc.name,
          });

          // Bind rich popup
          marker.bindPopup(this.createPopupContent(loc), {
            maxWidth: 280,
            autoPan: true,
            autoPanPadding: [20, 20],
          });

          // Bind tooltip
          marker.bindTooltip(loc.shortName || loc.name, {
            direction: 'top',
            offset: [0, -14],
            className: 'civic-marker-tooltip',
          });

          this.markersGroup.addLayer(marker);
          this.markerItems.push({ marker: marker, loc: loc });
        });

        // Fit the entire province into view
        this.fitEntireProvince();

        container.setAttribute('data-map-loaded', 'leaflet');

        // Debounced resize and tile invalidation
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
            this.fitEntireProvince();
          }
        }, 200);

        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 600);

        window.addEventListener('resize', () => {
          if (this.map) {
            this.map.invalidateSize();
          }
        });

        console.log(
          'Map: Leaflet initialized with ' + this.CIVIC_LOCATIONS.length + ' civic locations'
        );
        return this.map;
      } catch (e) {
        console.error('Map: Leaflet initialization failed:', e);
        this.renderTextFallback(container);
        return null;
      }
    },

    fitEntireProvince() {
      if (!this.map) return;
      this.map.fitBounds(this.ALBAY_BOUNDS, {
        padding: [15, 15],
        maxZoom: 11,
      });
    },

    applyFilter(filter) {
      this.activeFilter = filter;

      // Update button visual states
      const filterBtns = document.querySelectorAll('.map-filter-btn');
      filterBtns.forEach((btn) => {
        const btnFilter = btn.getAttribute('data-filter') || 'all';
        const isActive = btnFilter === filter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (!this.map || !this.markersGroup) return;

      this.markersGroup.clearLayers();

      this.markerItems.forEach(({ marker, loc }) => {
        let isVisible = false;
        if (filter === 'all') {
          isVisible = true;
        } else if (filter === 'city') {
          isVisible = loc.category === 'city';
        } else if (filter === 'municipality') {
          isVisible = loc.category === 'municipality';
        } else if (filter === 'civic') {
          isVisible = loc.category === 'capitol' || loc.category === 'civic';
        }

        if (isVisible) {
          this.markersGroup.addLayer(marker);
        }
      });
    },
  };

  // ============================================================================
  // Main Initialization Function
  // ============================================================================
  async function WeatherMapInit() {
    console.log('Weather-Map: Initializing...');

    const weatherContainer = document.getElementById('weather-container');
    const mapContainer = document.getElementById('map-container');

    // MAP: Initialize immediately without waiting for weather network fetch
    if (mapContainer) {
      try {
        MapComponent.init('map-container');
      } catch (error) {
        console.error('Map: Init failed', error);
        MapComponent.renderTextFallback(mapContainer);
      }
    }

    // WEATHER: Show loading, then fetch
    if (weatherContainer) {
      try {
        // Show loading state first
        WeatherUI.renderLoading(weatherContainer);

        // Fetch weather (will use mock if needed)
        const data = await WeatherService.fetchWeather();
        WeatherUI.render(weatherContainer, data);
      } catch (error) {
        console.error('Weather: Init failed', error);
        // Render mock data as last resort
        WeatherUI.render(weatherContainer, getMockWeather());
      }
    }
  }

  // Expose for retry button and failsafe
  window.WeatherMapInit = WeatherMapInit;
  window.MapComponent = MapComponent;
  console.log('=== weather-map.js: WeatherMapInit exposed to window ===');

  // ============================================================================
  // Auto-initialization
  // ============================================================================
  (function () {
    console.log('=== weather-map.js: Auto-init IIFE executing ===');
    console.log('Document readyState:', document.readyState);

    function init() {
      console.log('=== weather-map.js: Calling WeatherMapInit() ===');
      WeatherMapInit();
    }

    if (document.readyState === 'loading') {
      console.log('=== weather-map.js: Waiting for DOMContentLoaded ===');
      document.addEventListener('DOMContentLoaded', init);
    } else {
      console.log('=== weather-map.js: DOM already loaded, initializing immediately ===');
      init();
    }
  })();

  console.log('=== weather-map.js: Script loading completed ===');

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WeatherService, WeatherUI, MapComponent, getMockWeather };
  }
})(); // End of IIFE
