// Botón "Mostrar/Ocultar" para los campos de contraseña
document.querySelectorAll('.password-wrapper').forEach((wrapper) => {
  const input = wrapper.querySelector('input');
  const boton = wrapper.querySelector('.toggle-password');

  boton.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    boton.textContent = visible ? 'Mostrar' : 'Ocultar';
    boton.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    boton.setAttribute('aria-pressed', String(!visible));
    input.focus();
  });
});
