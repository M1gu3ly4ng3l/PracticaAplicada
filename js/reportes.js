import { supabase } from './supabaseClient.js';
import { pintarNav } from './nav.js';
import { iniciarMapa, pintarMarcadores, enfocarReporte, ajustarTamano } from './mapa.js';

pintarNav();

const { data: { session } } = await supabase.auth.getSession();
const MOTIVOS_DENUNCIA = ['Información falsa', 'Contenido inapropiado', 'Reporte duplicado', 'Otro'];
const denunciados = new Set(); // reportes que este usuario ya denunció

// Los reportes se eliminan solos 2 horas después de publicarse (lo hace Supabase;
// aquí además se ocultan al instante para que no dependan de la hora de la limpieza)
const VIDA_REPORTE_MS = 2 * 60 * 60 * 1000;
let temporizadorCaducidad = null;

const ETIQUETAS_TIPO = {
  lluvia: '🌧️ Lluvia',
  incendio: '🔥 Incendio',
  terremoto: '🌎 Terremoto',
  inundacion: '💧 Inundación',
  deslizamiento: '⛰️ Deslizamiento',
  otro: '⚠️ Otro',
};

const contenedor = document.getElementById('lista-reportes');
const cajaMapa = document.getElementById('mapa');
const botonMapa = document.getElementById('btn-mapa');
let mapaIniciado = false;

// El mapa empieza oculto: solo se descarga y se dibuja cuando se abre por primera vez
function mostrarMapa(mostrar) {
  cajaMapa.hidden = !mostrar;
  botonMapa.setAttribute('aria-expanded', String(mostrar));
  botonMapa.textContent = mostrar ? '🗺️ Ocultar mapa' : '🗺️ Mostrar mapa';
  if (!mostrar) return;

  if (!mapaIniciado) {
    mapaIniciado = true;
    iniciarMapa(cajaMapa);
  } else {
    ajustarTamano();
  }
}

botonMapa.addEventListener('click', () => mostrarMapa(cajaMapa.hidden));

// Abre el mapa, baja hasta él y acerca la vista al reporte
async function ubicarEnMapa(id) {
  mostrarMapa(true);
  cajaMapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await enfocarReporte(id);
}

async function cargarReportes() {
  contenedor.innerHTML = '<p class="estado">Cargando reportes...</p>';

  const { data: reportes, error } = await supabase
    .from('reportes')
    .select('*')
    .gte('created_at', new Date(Date.now() - VIDA_REPORTE_MS).toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="estado">No se pudieron cargar los reportes.</p>`;
    return;
  }

  pintarMarcadores(reportes);
  programarCaducidad(reportes);

  if (!reportes.length) {
    contenedor.innerHTML = `<p class="estado">Todavía no hay reportes. Sé el primero en reportar.</p>`;
    return;
  }

  denunciados.clear();
  if (session) {
    const { data: misDenuncias } = await supabase
      .from('denuncias_reportes')
      .select('reporte_id')
      .eq('user_id', session.user.id);
    (misDenuncias ?? []).forEach((d) => denunciados.add(d.reporte_id));
  }

  contenedor.innerHTML = reportes.map(tarjetaReporte).join('');
}

// Vuelve a cargar la lista justo cuando venza el reporte más antiguo que se está mostrando
function programarCaducidad(reportes) {
  clearTimeout(temporizadorCaducidad);
  if (!reportes.length) return;

  const masAntiguo = Math.min(...reportes.map((r) => new Date(r.created_at).getTime()));
  const espera = masAntiguo + VIDA_REPORTE_MS - Date.now() + 1000;
  temporizadorCaducidad = setTimeout(cargarReportes, Math.max(espera, 1000));
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

  // Solo los reportes con coordenadas pueden ubicarse en el mapa
  const tieneUbicacion = reporte.lat !== null && reporte.lng !== null;

  let botones = tieneUbicacion
    ? `<button type="button" class="btn-accion" data-accion="ubicar" data-id="${escapar(reporte.id)}">📍 Ubicar en el mapa</button>`
    : '';

  if (session && reporte.user_id === session.user.id) {
    botones += `
        <button type="button" class="btn-accion" data-accion="editar" data-id="${escapar(reporte.id)}">Editar</button>
        <button type="button" class="btn-accion btn-peligro" data-accion="eliminar" data-id="${escapar(reporte.id)}">Eliminar</button>`;
  } else if (session) {
    botones += denunciados.has(reporte.id)
      ? `<span class="denuncia-hecha">🚩 Ya denunciaste este reporte</span>`
      : `<button type="button" class="btn-accion" data-accion="denunciar" data-id="${escapar(reporte.id)}">🚩 Denunciar</button>`;
  }

  const acciones = botones ? `<div class="acciones-reporte">${botones}</div>` : '';
  const avisoUbicacion = tieneUbicacion ? '' : '<p class="sin-ubicacion">📍 Sin ubicación en el mapa</p>';

  return `
    <article class="tarjeta-reporte">
      <div class="marco-imagen">${imagen}</div>
      <div class="contenido-tarjeta">
        <span class="etiqueta-tipo">${escapar(ETIQUETAS_TIPO[reporte.tipo] ?? reporte.tipo)}</span>
        <p class="lugar-reporte">${escapar(reporte.lugar)}</p>
        <p class="fecha-reporte">${fecha}</p>
        ${avisoUbicacion}
        ${acciones}
      </div>
    </article>
  `;
}

// ---------- Editar / eliminar / denunciar ----------

// Saca la ruta del archivo dentro del bucket a partir de la URL pública
function rutaDeImagen(url) {
  const marca = '/reportes-imagenes/';
  const i = url.indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length).split('?')[0]);
}

async function eliminarReporte(id, boton) {
  if (!confirm('¿Seguro que quieres eliminar este reporte? Esta acción no se puede deshacer.')) return;

  boton.disabled = true;
  const { data: borrados, error } = await supabase
    .from('reportes')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select();

  if (error || !borrados?.length) {
    boton.disabled = false;
    alert('No se pudo eliminar el reporte.');
    return;
  }

  // Limpia la imagen asociada (si falla, el reporte ya quedó eliminado)
  const ruta = borrados[0].imagen_url ? rutaDeImagen(borrados[0].imagen_url) : null;
  if (ruta) await supabase.storage.from('reportes-imagenes').remove([ruta]);

  cargarReportes();
}

function abrirDialogoDenuncia(id) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo-denuncia';
  dialogo.innerHTML = `
    <h3>Denunciar reporte</h3>
    <label for="motivo-denuncia">Motivo</label>
    <select id="motivo-denuncia">
      ${MOTIVOS_DENUNCIA.map((m) => `<option value="${escapar(m)}">${escapar(m)}</option>`).join('')}
    </select>
    <p class="mensaje" id="mensaje-denuncia"></p>
    <div class="acciones-reporte">
      <button type="button" class="btn-accion" data-dialogo="cancelar">Cancelar</button>
      <button type="button" class="btn-accion btn-peligro" data-dialogo="enviar">Enviar denuncia</button>
    </div>`;
  document.body.appendChild(dialogo);
  dialogo.showModal();

  const cerrar = () => { dialogo.close(); dialogo.remove(); };
  dialogo.addEventListener('cancel', () => dialogo.remove());

  dialogo.querySelector('[data-dialogo="cancelar"]').addEventListener('click', cerrar);
  dialogo.querySelector('[data-dialogo="enviar"]').addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    boton.disabled = true;

    const { error } = await supabase.from('denuncias_reportes').insert({
      reporte_id: id,
      user_id: session.user.id,
      motivo: dialogo.querySelector('#motivo-denuncia').value,
    });

    // 23505 = ya la había denunciado: se trata igual que un éxito
    if (error && error.code !== '23505') {
      boton.disabled = false;
      dialogo.querySelector('#mensaje-denuncia').textContent = 'No se pudo enviar la denuncia.';
      return;
    }

    denunciados.add(id);
    cerrar();
    cargarReportes();
  });
}

contenedor.addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;

  const { accion, id } = boton.dataset;
  if (accion === 'ubicar') {
    ubicarEnMapa(id); // no requiere sesión
    return;
  }
  if (!session) return;

  if (accion === 'editar') window.location.href = `reportar.html?editar=${encodeURIComponent(id)}`;
  if (accion === 'eliminar') eliminarReporte(id, boton);
  if (accion === 'denunciar') abrirDialogoDenuncia(id);
});

cargarReportes();
window.addEventListener('reporte-nuevo', cargarReportes);
