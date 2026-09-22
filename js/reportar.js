import { supabase } from './supabaseClient.js';
import { pintarNav, exigirSesion } from './nav.js';

pintarNav();
const sesion = await exigirSesion();

const form = document.getElementById('form-reportar');
const mensaje = document.getElementById('mensaje');

if (sesion) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';

    const tipo = document.getElementById('tipo').value;
    const lugar = document.getElementById('lugar').value.trim();
    const fechaHora = document.getElementById('fecha_hora').value; // datetime-local
    const archivoImagen = document.getElementById('imagen').files[0];

    const boton = form.querySelector('button');
    boton.disabled = true;
    boton.textContent = 'Enviando...';

    try {
      let imagenUrl = null;

      // La imagen es opcional
      if (archivoImagen) {
        const extension = archivoImagen.name.split('.').pop();
        const rutaArchivo = `${sesion.user.id}/${Date.now()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from('reportes-imagenes')
          .upload(rutaArchivo, archivoImagen);

        if (errorSubida) throw errorSubida;

        const { data: urlPublica } = supabase.storage
          .from('reportes-imagenes')
          .getPublicUrl(rutaArchivo);

        imagenUrl = urlPublica.publicUrl;
      }

      const { error: errorInsert } = await supabase.from('reportes').insert({
        user_id: sesion.user.id,
        tipo,
        lugar,
        fecha_hora: new Date(fechaHora).toISOString(),
        imagen_url: imagenUrl,
      });

      if (errorInsert) throw errorInsert;

      window.location.href = 'reportes.html';
    } catch (error) {
      mensaje.textContent = 'No se pudo enviar el reporte: ' + error.message;
      boton.disabled = false;
      boton.textContent = 'Enviar reporte';
    }
  });
}
