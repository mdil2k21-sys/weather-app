// ===========================
// WEATHER V2 — script.js
// Open-Meteo API (gratis, no key)
// ===========================

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherResult = document.getElementById('weatherResult');
const currentDate = document.getElementById('currentDate');

// Tampilin tanggal hari ini di header
const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short'
});
currentDate.textContent = today;


// Event listeners
searchBtn.addEventListener('click', getWeather);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getWeather();
});


async function getWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        weatherResult.innerHTML = '<p class="error">Masukin nama kota dulu.</p>';
        return;
    }

    weatherResult.innerHTML = '<p class="loading">Mencari...</p>';

    // Step 1: cari koordinat kota
    const geoURL = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id`;
    const geoRes = await fetch(geoURL);
    const geoData = await geoRes.json();

    if (!geoData.results?.length) {
        weatherResult.innerHTML = `<p class="error">Kota "${city}" tidak ditemukan.</p>`;
        return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: ambil data cuaca
    const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const weatherRes = await fetch(weatherURL);
    const data = await weatherRes.json();

    const temp = Math.round(data.current.temperature_2m);
    const humidity = data.current.relative_humidity_2m;
    const wind = Math.round(data.current.wind_speed_10m);
    const code = data.current.weather_code;
    const desc = weatherDesc(code);

    // Step 3: render
    weatherResult.innerHTML = `
        <p class="city">${name}, ${country}</p>
        <div class="temp">${temp}<span class="temp-unit">°C</span></div>
        <p class="condition">${desc}</p>
        <div class="data-grid">
            <div class="data-item">
                <p class="data-label">Humidity</p>
                <p class="data-value">${humidity}%</p>
            </div>
            <div class="data-item">
                <p class="data-label">Wind</p>
                <p class="data-value">${wind} km/h</p>
            </div>
        </div>
    `;
}


function weatherDesc(code) {
    const map = {
        0: 'Cerah', 1: 'Cerah berawan', 2: 'Berawan', 3: 'Mendung',
        45: 'Berkabut', 48: 'Berkabut',
        51: 'Gerimis', 53: 'Gerimis', 55: 'Gerimis lebat',
        61: 'Hujan ringan', 63: 'Hujan', 65: 'Hujan lebat',
        71: 'Salju', 73: 'Salju', 75: 'Salju lebat',
        80: 'Hujan', 81: 'Hujan', 82: 'Hujan lebat',
        95: 'Badai', 96: 'Badai + es', 99: 'Badai + es'
    };
    return map[code] ?? 'Tidak diketahui';
}

document.querySelectorAll('.city-chip').forEach(button => {
    button.addEventListener('click', () => {
        cityInput.value = button.dataset.city;
        getWeather();
    });
});