-- Ejecutar UNA vez en el SQL Editor de Supabase (despues de schema.sql).
-- Agrega: editar/eliminar reportes (con sus imagenes), denuncias y bloqueo de fechas futuras.

-- 1) Editar: el dueno no puede "traspasar" el reporte a otro usuario
alter policy "Solo el dueno edita su reporte"
  on public.reportes
  with check (auth.uid() = user_id);

-- 2) Imagenes: el dueno puede reemplazar/borrar las de su carpeta (<user_id>/archivo)
create policy "Solo el dueno borra sus imagenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reportes-imagenes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Denuncias de reportes
create table if not exists public.denuncias_reportes (
  id          uuid primary key default gen_random_uuid(),
  reporte_id  uuid not null references public.reportes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  motivo      text not null,
  created_at  timestamptz not null default now(),
  unique (reporte_id, user_id)          -- una denuncia por persona y reporte
);

alter table public.denuncias_reportes enable row level security;

-- Cada usuario solo ve sus propias denuncias
create policy "Cada usuario ve sus denuncias"
  on public.denuncias_reportes for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo autenticados denuncian, y no su propio reporte
create policy "Autenticados denuncian reportes ajenos"
  on public.denuncias_reportes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.reportes r
      where r.id = reporte_id and r.user_id = auth.uid()
    )
  );

-- 4) Horas futuras: el hecho no puede ser posterior a "ahora" (5 min de tolerancia por desfase de reloj).
--    NOT VALID = no revisa filas viejas, pero si aplica a inserts y updates nuevos.
alter table public.reportes
  add constraint reportes_fecha_no_futura
  check (fecha_hora <= now() + interval '5 minutes') not valid;
