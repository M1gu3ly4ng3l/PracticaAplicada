import { supabase } from './supabaseClient.js';

const form = document.getElementById('form-registro');
const mensaje = document.getElementById('mensaje');
const campoFechaNacimiento = document.getElementById('fecha_nacimiento');

// No dejar elegir una fecha de nacimiento futura
campoFechaNacimiento.max = new Date().toISOString().split('T')[0];

// Reglas de contraseña (6 caracteres, un número y un caracater especial)
const SIMBOLOS = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/;

function revisarPassword(password) {
  const faltan = [];
  if (password.length < 6) faltan.push('al menos 6 caracteres');
  if (!/[A-Z]/.test(password)) faltan.push('una mayúscula');
  if (!/[0-9]/.test(password)) faltan.push('un número');
  if (!SIMBOLOS.test(password)) faltan.push('un carácter especial (por ejemplo ! @ # $ %)');
  return faltan;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.textContent = '';

  const nombres = document.getElementById('nombres').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const fechaNacimiento = campoFechaNacimiento.value;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const faltan = revisarPassword(password);
  if (faltan.length) {
    mensaje.textContent = 'La contraseña debe tener ' + faltan.join(', ') + '.';
    return;
  }

  const boton = form.querySelector('button');
  boton.disabled = true;
  boton.textContent = 'Creando cuenta...';

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
