import { supabase } from './supabaseClient.js';

const form = document.getElementById('form-registro');
const mensaje = document.getElementById('mensaje');
const campoFechaNacimiento = document.getElementById('fecha_nacimiento');

// No dejar elegir una fecha de nacimiento futura
campoFechaNacimiento.max = new Date().toISOString().split('T')[0];

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.textContent = '';

  const nombres = document.getElementById('nombres').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const fechaNacimiento = campoFechaNacimiento.value;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (password.length < 6) {
    mensaje.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  const boton = form.querySelector('button');
  boton.disabled = true;
  boton.textContent = 'Creando cuenta...';

  // nombres, apellidos y fecha de nacimiento
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/index.html`,
      data: {
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
      },
    },
  });

  boton.disabled = false;
  boton.textContent = 'Crear cuenta';

  if (error) {
    mensaje.textContent = 'No se pudo crear la cuenta: ' + error.message;
    return;
  }

  mensaje.style.color = '#16a34a';
  mensaje.textContent = 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.';
  form.reset();
});
