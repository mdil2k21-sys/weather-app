// ==========================================
// WEATHER V2 — script.js (Production Guarded Architecture)
// ==========================================

const state = {
    currentWeather: null,
    unit: 'C',
    isLoading: false
};

const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const weatherResult = document.getElementById('weatherResult');
const currentDateEl = document.getElementById('currentDate');
const unitCelsius = document.getElementById('unitCelsius');
const unitFahrenheit = document.getElementById('unitFahrenheit');

// Set tanggal hari ini
const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short'
});
if (currentDateEl) currentDateEl.textContent = today;


// --- 1. HELPERS & FORMATTERS ---
const Helpers = {
    celsiusToFahrenheit(c) { return Math.round((c * 9/5) + 32); },

    formatTemp(c) {
        return state.unit === 'F' ? Helpers.celsiusToFahrenheit(c) : Math.round(c);
    },

    formatWind(speedKmh) {
        return Math.round(speedKmh);
    },

    getWeatherDesc(code) {
        const map = {
            0: 'Cerah', 1: 'Cerah berawan', 2: 'Berawan', 3: 'Mendung',
            45: 'Berkabut', 48: 'Berkabut beku',
            51: 'Gerimis ringan', 53: 'Gerimis', 55: 'Gerimis lebat',
            61: 'Hujan ringan', 63: 'Hujan', 65: 'Hujan lebat',
            71: 'Salju ringan', 73: 'Salju', 75: 'Salju lebat',
            80: 'Hujan lokal', 81: 'Hujan', 82: 'Hujan lebat',
            95: 'Badai petir', 96: 'Badai petir + es', 99: 'Badai petir lebat'
        };
        return map[code] ?? 'Kondisi stabil';
    },

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
};


// --- 2. API SERVICE ---
const WeatherAPI = {
    async getCoordsByCity(cityName) {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=id`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal terhubung ke server cuaca.');
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(`Kota "${cityName}" tidak ditemukan.`);
        }
        return data.results[0];
    },

    async getWeatherByCoords(lat, lon, locationName) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil data prakiraan.');
        const data = await res.json();

        // Simpan raw data mentah tanpa pembulatan di API layer
        return {
            name: locationName,
            temp: data.current.temperature_2m,
            feelsLike: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            wind: data.current.wind_speed_10m,
            code: data.current.weather_code
        };
    }
};


// --- 3. UI RENDERER ---
const WeatherUI = {
    renderInitial() {
        weatherResult.innerHTML = `
            <div class="state-box">
                <p class="result-empty">Pilih kota di atas atau ketik nama kota untuk melihat cuaca.</p>
            </div>
        `;
    },

    renderLoading() {
        weatherResult.innerHTML = `
            <div class="state-box">
                <p class="loading-text">Memuat data cuaca...</p>
            </div>
        `;
        searchBtn.disabled = true;
        geoBtn.disabled = true;
    },

    renderError(message) {
        weatherResult.innerHTML = `
            <div class="state-box">
                <p class="error-text">⚠️ ${helpersEscapeSafe(message)}</p>
            </div>
        `;
        searchBtn.disabled = false;
        geoBtn.disabled = false;
    },

    renderSuccess(data) {
        const tempVal = Helpers.formatTemp(data.temp);
        const feelsVal = Helpers.formatTemp(data.feelsLike);
        const windVal = Helpers.formatWind(data.wind);
        const desc = Helpers.getWeatherDesc(data.code);
        const safeName = Helpers.escapeHTML(data.name);

        weatherResult.innerHTML = `
            <div class="state-box">
                <p class="city-title">📍 ${safeName}</p>
                <div class="temp-display">${tempVal}<span class="temp-unit-symbol">°${state.unit}</span></div>
                <p class="condition-text">${desc}</p>
                <div class="data-grid">
                    <div class="data-item">
                        <p class="data-label">Suhu Terasa</p>
                        <p class="data-value">${feelsVal}°${state.unit}</p>
                    </div>
                    <div class="data-item">
                        <p class="data-label">Kelembapan</p>
                        <p class="data-value">${data.humidity}%</p>
                    </div>
                    <div class="data-item">
                        <p class="data-label">Kecepatan Angin</p>
                        <p class="data-value">${windVal} km/h</p>
                    </div>
                    <div class="data-item">
                        <p class="data-label">Kondisi Umum</p>
                        <p class="data-value">${desc}</p>
                    </div>
                </div>
            </div>
        `;
        searchBtn.disabled = false;
        geoBtn.disabled = false;
    }
};

// Helper kecil untuk error string aman
function helpersEscapeSafe(str) {
    return Helpers.escapeHTML(str);
}


// --- 4. CONTROLLERS WITH GUARDED STATE ---
async function processWeatherFetch(fetcherFn) {
    if (state.isLoading) return;
    state.isLoading = true;
    WeatherUI.renderLoading();

    try {
        const weatherData = await fetcherFn();
        state.currentWeather = weatherData;
        WeatherUI.renderSuccess(weatherData);
    } catch (err) {
        WeatherUI.renderError(err.message);
    } finally {
        state.isLoading = false;
    }
}

// 1. Search by City Name
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    processWeatherFetch(async () => {
        const location = await WeatherAPI.getCoordsByCity(city);
        return await WeatherAPI.getWeatherByCoords(
            location.latitude,
            location.longitude,
            `${location.name}${location.country ? ', ' + location.country : ''}`
        );
    });
});

// 2. Quick City Chips
document.querySelectorAll('.city-chip').forEach(button => {
    button.addEventListener('click', () => {
        const city = button.dataset.city;
        cityInput.value = city;

        processWeatherFetch(async () => {
            const location = await WeatherAPI.getCoordsByCity(city);
            return await WeatherAPI.getWeatherByCoords(
                location.latitude,
                location.longitude,
                `${location.name}${location.country ? ', ' + location.country : ''}`
            );
        });
    });
});

// 3. Geolocation Button with Proper Guard & Fallback
geoBtn.addEventListener('click', () => {
    if (state.isLoading) return;
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung browser ini.');
        return;
    }

    state.isLoading = true;
    WeatherUI.renderLoading();

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            try {
                const weatherData = await WeatherAPI.getWeatherByCoords(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    'Lokasi Perangkat Anda'
                );
                state.currentWeather = weatherData;
                WeatherUI.renderSuccess(weatherData);
            } catch (e) {
                WeatherUI.renderError('Gagal mengambil cuaca dari koordinat perangkat.');
            } finally {
                state.isLoading = false;
            }
        },
        (error) => {
            // Fallback aman jika lokasi ditolak/gagal
            state.isLoading = false;
            WeatherUI.renderError('Akses lokasi ditolak atau timeout. Silakan cari kota secara manual.');
        },
        { timeout: 10000, maximumAge: 60000 }
    );
});

// Unit Toggle (°C / °F)
unitCelsius.addEventListener('click', () => {
    if (state.unit === 'C') return;
    state.unit = 'C';
    unitCelsius.classList.add('active');
    unitFahrenheit.classList.remove('active');
    if (state.currentWeather) WeatherUI.renderSuccess(state.currentWeather);
});

unitFahrenheit.addEventListener('click', () => {
    if (state.unit === 'F') return;
    state.unit = 'F';
    unitFahrenheit.classList.add('active');
    unitCelsius.classList.remove('active');
    if (state.currentWeather) WeatherUI.renderSuccess(state.currentWeather);
});


// Initial state
WeatherUI.renderInitial();