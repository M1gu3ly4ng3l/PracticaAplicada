// Mapa interactivo con Leaflet + OpenStreetMap (sin clave ni tarjeta).
// Lo usan reportes.js (para dibujar los marcadores) y reportar.js (para ubicar el lugar).
// Mapa y teselas: OpenStreetMap. Geocodificación: Nominatim (https://nominatim.openstreetmap.org).

const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm';
const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const URL_TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';

const CENTRO_COLOMBIA = [4.5709, -74.2973];
const ZOOM_COLOMBIA = 5;
const ZOOM_UN_REPORTE = 14;

// Un color y un ícono por tipo de catástrofe (mismos tipos que la lista de reportes)
const TIPOS = {
  lluvia: { nombre: 'Lluvia', emoji: '🌧️', color: '#3b82f6' },
  incendio: { nombre: 'Incendio', emoji: '🔥', color: '#ef4444' },
  terremoto: { nombre: 'Terremoto', emoji: '🌎', color: '#a16207' },
  inundacion: { nombre: 'Inundación', emoji: '💧', color: '#06b6d4' },
  deslizamiento: { nombre: 'Deslizamiento', emoji: '⛰️', color: '#78716c' },
  otro: { nombre: 'Otro', emoji: '⚠️', color: '#f59e0b' },
};

let listo = null;
let L = null;
let mapa = null;
let capaMarcadores = null;
let yaAjustado = false;

function cargarEstilos() {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      resolve();
      return;
    }
    const enlace = document.createElement('link');
    enlace.rel = 'stylesheet';
    enlace.href = LEAFLET_CSS;
    enlace.onload = resolve;
    enlace.onerror = () => reject(new Error('No se pudieron cargar los estilos del mapa.'));
    document.head.appendChild(enlace);
  });
}

// Dibuja el mapa vacío, centrado en Colombia
export function iniciarMapa(elemento) {
  listo = (async () => {
    // Leaflet se descarga solo en las páginas que muestran el mapa
    const [modulo] = await Promise.all([
      import(LEAFLET_JS).catch(() => {
        throw new Error('No se pudo cargar la librería del mapa.');
      }),
      cargarEstilos(),
    ]);
    L = modulo.default;

    mapa = L.map(elemento).setView(CENTRO_COLOMBIA, ZOOM_COLOMBIA);
    L.tileLayer(URL_TESELAS, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(mapa);
    capaMarcadores = L.layerGroup().addTo(mapa);
  })();

  listo.catch((error) => {
    elemento.className = 'mapa-reportes mapa-error';
    elemento.textContent = `No se pudo mostrar el mapa. ${error.message}`;
  });
  return listo;
}

function crearPin(tipo) {
  const { emoji, color } = TIPOS[tipo] ?? TIPOS.otro;
  const pin = document.createElement('div');
  pin.className = 'marcador-tipo';
  pin.style.backgroundColor = color;
  pin.textContent = emoji;
  return pin;
}

// El contenido se arma con textContent para que lo escrito por usuarios no se interprete como HTML
function contenidoInfo(reporte) {
  const { nombre, emoji } = TIPOS[reporte.tipo] ?? TIPOS.otro;

  const caja = document.createElement('div');
  caja.className = 'info-mapa';

  const titulo = document.createElement('strong');
  titulo.textContent = `${emoji} ${nombre}`;

  const lugar = document.createElement('p');
  lugar.textContent = reporte.lugar;

  const fecha = document.createElement('small');
  fecha.textContent = new Date(reporte.fecha_hora).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  caja.append(titulo, lugar, fecha);

  if (reporte.imagen_url) {
    const imagen = document.createElement('img');
    imagen.src = reporte.imagen_url;
    imagen.alt = 'Imagen del reporte';
    imagen.onerror = () => imagen.remove();
    caja.appendChild(imagen);
  }
  return caja;
}

// Reemplaza los marcadores por los de la lista de reportes recibida
export async function pintarMarcadores(reportes) {
  try {
    await listo;
  } catch {
    return; // el mensaje de error ya se mostró en iniciarMapa
  }

  capaMarcadores.clearLayers();
  mapa.closePopup();

  const puntos = [];

  // Los reportes sin coordenadas (lat/lng nulos) aparecen en la lista pero no en el mapa
  reportes
    .filter((r) => r.lat !== null && r.lng !== null)
    .forEach((reporte) => {
      const posicion = [reporte.lat, reporte.lng];
      const marcador = L.marker(posicion, {
        icon: L.divIcon({
          className: 'marcador-leaflet',
          html: crearPin(reporte.tipo),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18],
        }),
        title: `${(TIPOS[reporte.tipo] ?? TIPOS.otro).nombre}: ${reporte.lugar}`,
      });
      marcador.bindPopup(contenidoInfo(reporte));
      marcador.addTo(capaMarcadores);
      puntos.push(posicion);
    });

  // Solo se encuadra la primera vez, para no mover el mapa si el usuario ya lo está explorando
  if (!yaAjustado && puntos.length) {
    yaAjustado = true;
    if (puntos.length === 1) {
      mapa.setView(puntos[0], ZOOM_UN_REPORTE);
    } else {
      mapa.fitBounds(puntos, { padding: [60, 60] });
    }
  }
}

// Convierte un lugar escrito (barrio, municipio o dirección) en coordenadas.
// Devuelve null si no lo encuentra o si el servicio no responde: el reporte se guarda igual.
export async function geocodificar(lugar) {
  try {
    const params = new URLSearchParams({
      q: lugar,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'co',
      'accept-language': 'es',
    });
    const respuesta = await fetch(`${URL_NOMINATIM}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!respuesta.ok) return null;

    const [resultado] = await respuesta.json();
    return resultado
      ? { lat: parseFloat(resultado.lat), lng: parseFloat(resultado.lon) }
      : null;
  } catch {
    return null;
  }
}
