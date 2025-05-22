// app.js para la versión jugable en web con geolocalización opcional
let userPosition = null;
let userMarker = null;
let currentMarkers = [];
let data = null;
let lugaresCompletados = new Set();
const marcadorPorTitulo = {};

const puebloSelect = document.getElementById('puebloSelect');
const questionBox = document.getElementById('questionBox');
const placeTitle = document.getElementById('placeTitle');
const placeDesc = document.getElementById('placeDesc');
const quiz = document.getElementById('quiz');

let map = L.map('map').setView([38.79, 0.17], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const iconoNormal = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const iconoCompletado = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const iconoIncorrecto = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Botón para desactivar la geolocalización
const disableButton = document.createElement('button');
disableButton.textContent = 'Desactivar geolocalización';
disableButton.style.margin = '1rem auto';
disableButton.style.display = 'block';
disableButton.onclick = () => {
  userPosition = null;
  alert('Geolocalización desactivada. Podrás ver pero no responder preguntas.');
};
document.body.insertBefore(disableButton, document.body.firstChild);

// Calcular distancia entre dos puntos en km
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // en km
}

// Mostrar preguntas si estás dentro de 200 m
function showQuestion(marker) {
  if (!userPosition) {
    alert('Activa la geolocalización para poder responder.');
    return;
  }

  const distance = getDistance(
    userPosition.lat,
    userPosition.lng,
    marker.coordinates.lat,
    marker.coordinates.lng
  );

  if (distance > 0.2) {
  alert('Puedes ver este punto, pero debes estar a menos de 200 metros para responder.');
  }

  placeTitle.textContent = marker.title;
  placeDesc.textContent = marker.description;
  quiz.innerHTML = '';

  marker.questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'question';

    const questionTitle = document.createElement('p');
    questionTitle.textContent = `Pregunta ${index + 1}: ${q.question}`;
    div.appendChild(questionTitle);

    const options = document.createElement('div');
    options.className = 'options';

    q.options.forEach((option, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.textContent = option;
      btn.onclick = () => {
      if (btn.disabled) return;
    
      if (distance > 0.2) {
        alert('Estás fuera de rango. Acércate al punto para responder.');
        return;
      }
    
      const marcador = marcadorPorTitulo[marker.title];
      if (i === q.correct) {
        btn.classList.add('correct');
        marcador.setIcon(iconoCompletado);
        lugaresCompletados.add(marker.title);
        alert(`¡Has acertado en "${marker.title}"!`);
      } else {
        btn.classList.add('incorrect');
        marcador.setIcon(iconoIncorrecto);
        alert(`Respuesta incorrecta en "${marker.title}".`);
      }
    
      options.querySelectorAll('button').forEach(b => b.disabled = true);
      };
    });

    div.appendChild(options);
    quiz.appendChild(div);
  });

  questionBox.classList.remove('hidden');
}

// Cargar puntos del pueblo seleccionado
puebloSelect.addEventListener('change', async (e) => {
  const pueblo = e.target.value;
  if (!pueblo) return;

  const response = await fetch(`json/${pueblo}`);
  data = await response.json();

  currentMarkers.forEach(m => map.removeLayer(m));
  currentMarkers = [];

  data.markers.forEach(marker => {
    const icon = lugaresCompletados.has(marker.title) ? iconoCompletado : iconoNormal;
    const m = L.marker([marker.coordinates.lat, marker.coordinates.lng], { icon }).addTo(map);
    m.on('click', () => showQuestion(marker));
    currentMarkers.push(m);
    marcadorPorTitulo[marker.title] = m;
  });

  const grupo = L.featureGroup(currentMarkers);
  map.fitBounds(grupo.getBounds());
});

// Obtener ubicación del usuario
if (navigator.geolocation) {
  navigator.geolocation.watchPosition((position) => {
    userPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    // Mostrar marcador en el mapa
    if (userMarker) {
      userMarker.setLatLng(userPosition);
    } else {
      userMarker = L.marker(userPosition, {
        title: "Tu ubicación",
        opacity: 0.6
      }).addTo(map);
    }

  }, (err) => {
    console.warn('No se pudo obtener la ubicación.');
  });
} else {
  alert('Este navegador no soporta geolocalización.');
}
