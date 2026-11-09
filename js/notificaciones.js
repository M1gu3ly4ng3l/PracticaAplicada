import { supabase } from './supabaseClient.js';

// Notificaciones en tiempo real: cuando alguien crea un reporte nuevo
// se muestra un aviso (toast), se suma al contador de la campana y,
// si la pestaña está en segundo plano, se envía una notificación del navegador.

const ETIQUETAS_TIPO = {
  lluvia: '🌧️ Lluvia',
  incendio: '🔥 Incendio',
  terremoto: '🌎 Terremoto',
  inundacion: '💧 Inundación',
  deslizamiento: '⛰️ Deslizamiento',
  otro: '⚠️ Otro',
};

const MAX_HISTORIAL = 10;
const DURACION_TOAST_MS = 6000;

let iniciado = false;
let sinLeer = 0;
const historial = [];

let badge, panel, lista, btnPermiso, zonaToasts;

function textoReporte(reporte) {
  const tipo = ETIQUETAS_TIPO[reporte.tipo] ?? reporte.tipo;
  return { titulo: `Nuevo reporte: ${tipo}`, detalle: reporte.lugar };
}

function crearCampana(contenedor) {
  const envoltorio = document.createElement('div');
  envoltorio.className = 'notif-envoltorio';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'notif-campana';
  boton.setAttribute('aria-label', 'Notificaciones');
  boton.setAttribute('aria-expanded', 'false');
  boton.textContent = '🔔';

  badge = document.createElement('span');
  badge.className = 'notif-badge';
  badge.hidden = true;
  boton.appendChild(badge);

  panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.hidden = true;

  const encabezado = document.createElement('p');
  encabezado.className = 'notif-encabezado';
  encabezado.textContent = 'Notificaciones';

  lista = document.createElement('ul');
  lista.className = 'notif-lista';

  btnPermiso = document.createElement('button');
  btnPermiso.type = 'button';
  btnPermiso.className = 'notif-permiso';
  btnPermiso.addEventListener('click', pedirPermiso);

  panel.append(encabezado, lista, btnPermiso);
  envoltorio.append(boton, panel);
  contenedor.prepend(envoltorio);

  boton.addEventListener('click', () => {
    const abrir = panel.hidden;
    panel.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
      sinLeer = 0;
      pintarBadge();
    }
  });

  // Cerrar el panel al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!envoltorio.contains(e.target)) {
      panel.hidden = true;
      boton.setAttribute('aria-expanded', 'false');
    }
  });

  pintarPermiso();
  pintarLista();
}

function pintarBadge() {
  badge.hidden = sinLeer === 0;
  badge.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
}

function pintarLista() {
  lista.replaceChildren();

  if (!historial.length) {
    const vacio = document.createElement('li');
    vacio.className = 'notif-vacio';
    vacio.textContent = 'Aún no hay avisos nuevos.';
    lista.appendChild(vacio);
    return;
  }

  historial.forEach(({ titulo, detalle, hora }) => {
    const item = document.createElement('li');
    item.className = 'notif-item';

    const t = document.createElement('strong');
    t.textContent = titulo;
    const d = document.createElement('span');
    d.textContent = detalle;
    const h = document.createElement('small');
    h.textContent = hora;

    item.append(t, d, h);
    lista.appendChild(item);
  });
}

function pintarPermiso() {
  if (!('Notification' in window)) {
    btnPermiso.hidden = true;
    return;
  }
  if (Notification.permission === 'granted') {
    btnPermiso.textContent = 'Avisos del navegador activados ✓';
    btnPermiso.disabled = true;
  } else if (Notification.permission === 'denied') {
    btnPermiso.textContent = 'Avisos del navegador bloqueados';
    btnPermiso.disabled = true;
  } else {
    btnPermiso.textContent = 'Activar avisos del navegador';
    btnPermiso.disabled = false;
  }
}

async function pedirPermiso() {
  await Notification.requestPermission();
  pintarPermiso();
}

function mostrarToast({ titulo, detalle }) {
  const toast = document.createElement('div');
  toast.className = 'notif-toast';
  toast.setAttribute('role', 'status');

  const t = document.createElement('strong');
  t.textContent = titulo;
  const d = document.createElement('span');
  d.textContent = detalle;
  toast.append(t, d);

  zonaToasts.appendChild(toast);
  setTimeout(() => toast.remove(), DURACION_TOAST_MS);
}

function avisoDelNavegador({ titulo, detalle }) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted' || !document.hidden) return;
  new Notification(titulo, { body: detalle });
}

function alNuevoReporte(reporte, session) {
  // Permite que otras páginas (p. ej. la lista de reportes) se actualicen solas
  window.dispatchEvent(new CustomEvent('reporte-nuevo', { detail: reporte }));

  // No avisar al usuario de sus propios reportes
  if (session && reporte.user_id === session.user.id) return;

  const { titulo, detalle } = textoReporte(reporte);
  const aviso = {
    titulo,
    detalle,
    hora: new Date().toLocaleTimeString('es-CO', { timeStyle: 'short' }),
  };

  historial.unshift(aviso);
  if (historial.length > MAX_HISTORIAL) historial.pop();

  if (panel.hidden) {
    sinLeer += 1;
    pintarBadge();
  }
  pintarLista();
  mostrarToast(aviso);
  avisoDelNavegador(aviso);
}

export function iniciarNotificaciones(contenedor, session) {
  if (iniciado) return;
  iniciado = true;

  zonaToasts = document.createElement('div');
  zonaToasts.className = 'notif-toasts';
  zonaToasts.setAttribute('aria-live', 'polite');
  document.body.appendChild(zonaToasts);

  crearCampana(contenedor);

  supabase
    .channel('reportes-nuevos')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reportes' },
      (payload) => alNuevoReporte(payload.new, session)
    )
    .subscribe();
}
