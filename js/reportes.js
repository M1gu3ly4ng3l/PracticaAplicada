import { supabase } from './supabaseClient.js';
import { pintarNav } from './nav.js';

pintarNav();

const ETIQUETAS_TIPO = {
  lluvia: '🌧️ Lluvia',
  incendio: '🔥 Incendio',
  terremoto: '🌎 Terremoto',
  inundacion: '💧 Inundación',
  deslizamiento: '⛰️ Deslizamiento',
  otro: '⚠️ Otro',
};

const contenedor = document.getElementById('lista-reportes');

async function cargarReportes() {
  contenedor.innerHTML = '<p class="estado">Cargando reportes...</p>';

  const { data: reportes, error } = await supabase
    .from('reportes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="estado">No se pudieron cargar los reportes.</p>`;
    return;
  }

  if (!reportes.length) {
    contenedor.innerHTML = `<p class="estado">Todavía no hay reportes. Sé el primero en reportar.</p>`;
    return;
  }

  contenedor.innerHTML = reportes.map(tarjetaReporte).join('');
}

// Evita que texto escrito por usuarios se interprete como HTML
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function tarjetaReporte(reporte) {
  const fecha = new Date(reporte.fecha_hora).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Si no hay imagen (o falla al cargar) se deja el marco con un texto de relleno
  const imagen = reporte.imagen_url
    ? `<img src="${escapar(reporte.imagen_url)}" alt="Imagen del reporte" class="imagen-reporte" loading="lazy" onerror="this.remove()">`
    : 'Sin imagen';

  return `
    <article class="tarjeta-reporte">
      <div class="marco-imagen">${imagen}</div>
      <div class="contenido-tarjeta">
        <span class="etiqueta-tipo">${escapar(ETIQUETAS_TIPO[reporte.tipo] ?? reporte.tipo)}</span>
        <p class="lugar-reporte">${escapar(reporte.lugar)}</p>
        <p class="fecha-reporte">${fecha}</p>
      </div>
    </article>
  `;
}

cargarReportes();
