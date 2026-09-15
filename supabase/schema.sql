

-- Reportes :P
create table if not exists public.reportes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  tipo         text not null check (tipo in ('lluvia', 'incendio', 'terremoto', 'inundacion', 'deslizamiento', 'otro')),
  lugar        text not null,
  lat          double precision,          --para el maps
  lng          double precision,
  fecha_hora   timestamptz not null,     
  imagen_url   text,                      
  created_at   timestamptz not null default now()
);

-- Filtros (solo dos porque no se me ocurrieron más xd (más recientes y tipo))
create index if not exists reportes_created_at_idx on public.reportes (created_at desc);
create index if not exists reportes_tipo_idx on public.reportes (tipo);

-- Seguridad de Supa
alter table public.reportes enable row level security;

create policy "Lectura publica de reportes"
  on public.reportes for select
  using (true);

-- Algo para que solo los registrados hagan reportes
create policy "Solo autenticados insertan su propio reporte"
  on public.reportes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Algo para que solo el que haya hecho el reporte pueda editarlo
create policy "Solo el dueno edita su reporte"
  on public.reportes for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Solo el dueno borra su reporte"
  on public.reportes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Esto es para las imágenes de las catástrofes
insert into storage.buckets (id, name, public)
values ('reportes-imagenes', 'reportes-imagenes', true)
on conflict (id) do nothing;

create policy "Lectura publica de imagenes"
  on storage.objects for select
  using (bucket_id = 'reportes-imagenes');

create policy "Solo autenticados suben imagenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reportes-imagenes');
