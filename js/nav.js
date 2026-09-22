import { supabase } from './supabaseClient.js';

// Rellena la barra de navegación según si hay sesión o no.
// Espera un <div id="nav-sesion"></div> en la página.
export async function pintarNav() {
  const contenedor = document.getElementById('nav-sesion');
  if (!contenedor) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    contenedor.innerHTML = `
      <a href="reportar.html">Reportar</a>
      <span class="nav-correo">${session.user.email}</span>
      <button id="btn-logout" class="nav-link-btn">Cerrar sesión</button>
    `;
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    });
  } else {
    contenedor.innerHTML = `<a href="index.html">Iniciar sesión</a>`;
  }
}

// Redirige al login si no hay sesión activa. Úsalo en páginas protegidas
// (por ejemplo reportar.html) antes de dejar interactuar con el formulario.
export async function exigirSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}
