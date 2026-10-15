import { supabase } from './supabaseClient.js';

// Rellena la barra de navegación según si hay sesión o no.
export async function pintarNav() {
  const contenedor = document.getElementById('nav-sesion');
  if (!contenedor) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    contenedor.innerHTML = `<a href="reportar.html" class="btn-nav">Reportar</a>`;

    // Pie de página con el cierre de sesión (se evita duplicarlo)
    if (!document.getElementById('pie-sesion')) {
      const pie = document.createElement('footer');
      pie.id = 'pie-sesion';
      pie.className = 'pie-sesion';

      const correo = document.createElement('span');
      correo.className = 'nav-correo';
      correo.textContent = `Sesión iniciada como ${session.user.email}`;

      const boton = document.createElement('button');
      boton.id = 'btn-logout';
      boton.className = 'btn-logout';
      boton.textContent = 'Cerrar sesión';
      boton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
      });

      pie.append(correo, boton);
      document.body.appendChild(pie);
    }
  } else {
    contenedor.innerHTML = `<a href="index.html" class="btn-nav">Iniciar sesión</a>`;
  }
}

// Redirige al login si no hay sesión activa.
export async function exigirSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}
