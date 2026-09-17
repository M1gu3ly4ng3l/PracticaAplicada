import { supabase } from './supabaseClient.js';

const form = document.getElementById('form-login');
const mensaje = document.getElementById('mensaje');

// Si ya hay una sesión activa, no tiene sentido mostrar el login otra vez
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  window.location.href = 'reportes.html';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const boton = form.querySelector('button');
  boton.disabled = true;
  boton.textContent = 'Ingresando...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  boton.disabled = false;
  boton.textContent = 'Ingresar';

  if (error) {
    mensaje.textContent = 'Correo o contraseña incorrectos.';
    return;
  }

  window.location.href = 'reportes.html';
});
