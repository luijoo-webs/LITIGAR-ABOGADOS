-- =====================================================================
-- LITIGAR · Plataforma de gestión jurídica · Esquema base
-- Supabase / PostgreSQL. Ejecutar en un proyecto sin las tablas del proyecto anterior.
-- Principios: RLS en todas las tablas, el público solo escribe mediante crear_solicitud(),
-- la clasificación ocurre en el servidor, la auditoría la escriben triggers.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Utilidades ----------
create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado := now(); return new; end $$;

-- ---------- Equipo y roles ----------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  correo text,
  rol text check (rol in ('admin', 'abogado', 'asistente')),   -- null = sin acceso al panel
  activo boolean not null default false,
  cargo text,
  especialidad_texto text,
  bio text,
  foto_ruta text,                  -- ruta en el bucket público "sitio"
  publico boolean not null default false,   -- aparece en la sección Equipo del sitio
  orden int not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create or replace function public.mi_rol() returns text language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;
create or replace function public.es_admin() returns boolean language sql stable as $$ select coalesce(public.mi_rol() = 'admin', false) $$;
create or replace function public.es_staff() returns boolean language sql stable as $$ select public.mi_rol() is not null $$;
create or replace function public.gestiona_bandeja() returns boolean language sql stable as $$ select coalesce(public.mi_rol() in ('admin', 'asistente'), false) $$;

-- Nadie puede subirse de rol a sí mismo.
create or replace function public.proteger_rol() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.rol is distinct from old.rol or new.activo is distinct from old.activo) and not public.es_admin()
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Solo un administrador puede cambiar roles o activar usuarios';
  end if;
  return new;
end $$;

-- Al crear un usuario de Auth se crea su perfil. El rol solo lo fija el servidor (app_metadata),
-- nunca el propio usuario (user_metadata).
create or replace function public.nuevo_usuario() returns trigger language plpgsql security definer set search_path = public as $$
declare r text := new.raw_app_meta_data ->> 'rol';
begin
  insert into public.perfiles (id, nombre, correo, rol, activo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''), new.email,
          case when r in ('admin', 'abogado', 'asistente') then r end, coalesce(r in ('admin', 'abogado', 'asistente'), false))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger litigar_nuevo_usuario after insert on auth.users for each row execute function public.nuevo_usuario();

-- ---------- Especialidades ----------
create table public.especialidades (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  nombre text not null,
  corto text not null,
  resumen text not null default '',
  ampliado text not null default '',
  temas text[] not null default '{}',
  orden int not null default 0,
  publicada boolean not null default true,
  actualizado timestamptz not null default now()
);

create table public.perfil_especialidades (
  perfil_id uuid references public.perfiles (id) on delete cascade,
  especialidad_id text references public.especialidades (id) on delete cascade,
  primary key (perfil_id, especialidad_id)
);

-- ---------- Reglas de clasificación (configurables desde el panel) ----------
create table public.reglas_clasificacion (
  id boolean primary key default true check (id),
  config jsonb not null,
  auto_asignar boolean not null default false,
  actualizado timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
insert into public.reglas_clasificacion (config) values ('{
  "pesos": {"area": 35, "urgencia": 25, "proceso": 15, "descripcion": 15, "contacto": 10},
  "urgencia": {"alta": 1, "media": 0.6, "baja": 0.25},
  "proceso": {"si": 1, "nose": 0.5, "no": 0.3},
  "minDescripcion": 80, "umbralCalificada": 70
}');

-- ---------- Clientes y casos ----------
create sequence public.seq_cliente;
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default 'CLI-' || lpad(nextval('public.seq_cliente')::text, 4, '0'),
  nombre text not null check (length(nombre) between 2 and 160),
  tipo text not null check (tipo in ('natural', 'empresa')),
  documento text,
  telefono text,
  correo text,
  ciudad text,
  observaciones text not null default '',
  usuario_id uuid references auth.users (id) on delete set null,   -- portal privado de clientes (futuro)
  creado timestamptz not null default now(),
  creado_por uuid references public.perfiles (id)
);

-- ---------- Solicitudes (captación) ----------
create sequence public.seq_solicitud;
create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default 'SOL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_solicitud')::text, 5, '0'),
  situacion text not null check (situacion in ('conflicto', 'demanda', 'tramite', 'asesoria', 'otra')),
  area text not null,                       -- id de especialidad, 'otra' o 'nose'
  tipo text not null check (tipo in ('natural', 'empresa')),
  ciudad text not null check (length(ciudad) between 2 and 80),
  proceso text not null check (proceso in ('si', 'no', 'nose')),
  urgencia text not null check (urgencia in ('alta', 'media', 'baja')),
  descripcion text not null check (length(descripcion) between 20 and 2000),
  nombre text not null check (length(nombre) between 3 and 120),
  telefono text check (telefono is null or telefono ~ '^[+0-9 ()-]{7,20}$'),
  correo text check (correo is null or correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  puntaje int not null default 0 check (puntaje between 0 and 100),
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  estado text not null default 'nueva' check (estado in ('nueva', 'pendiente', 'incompleta', 'requiere_evaluacion', 'calificada', 'no_corresponde', 'convertida', 'cerrada')),
  asignado_a uuid references public.perfiles (id) on delete set null,
  cliente_id uuid references public.clientes (id) on delete set null,
  archivada boolean not null default false,
  origen text not null default 'sitio_web',
  consentimiento_fecha timestamptz not null,
  politica_version text not null,
  creada timestamptz not null default now(),
  actualizada timestamptz not null default now(),
  check (telefono is not null or correo is not null)
);
create index on public.solicitudes (estado, archivada);
create index on public.solicitudes (asignado_a);

create table public.notas_solicitud (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfiles (id),
  texto text not null check (length(texto) between 1 and 1000),
  creada timestamptz not null default now()
);

create sequence public.seq_caso;
create table public.casos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default 'CAS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_caso')::text, 4, '0'),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  responsable_id uuid references public.perfiles (id) on delete set null,
  especialidad_id text references public.especialidades (id),
  solicitud_id uuid references public.solicitudes (id) on delete set null,
  titulo text not null check (length(titulo) between 3 and 200),
  descripcion text not null default '',
  estado text not null default 'activo' check (estado in ('activo', 'en_tramite', 'en_espera', 'cerrado')),
  abierto timestamptz not null default now(),
  cerrado timestamptz
);
create index on public.casos (responsable_id);
create index on public.casos (cliente_id);

create table public.actividades_caso (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  fecha date not null,
  texto text not null check (length(texto) between 1 and 200),
  hecha boolean not null default false,
  creada_por uuid default auth.uid() references public.perfiles (id),
  creada timestamptz not null default now()
);

create table public.movimientos_caso (
  id bigint generated always as identity primary key,
  caso_id uuid not null references public.casos (id) on delete cascade,
  texto text not null,
  autor_id uuid default auth.uid(),
  creado timestamptz not null default now()
);

-- ---------- Documentos (bucket privado "documentos") ----------
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  nombre text not null,
  ruta text not null unique,           -- casos/<caso_id>/<archivo>
  tipo_mime text,
  tamano bigint,
  visible_cliente boolean not null default false,   -- para el portal de clientes (futuro)
  subido_por uuid default auth.uid() references public.perfiles (id),
  creado timestamptz not null default now()
);

-- ---------- Notificaciones internas y cola de correos ----------
create table public.notificaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null,
  titulo text not null,              -- sin datos confidenciales: solo códigos y estados
  enlace text,
  leida boolean not null default false,
  creada timestamptz not null default now()
);
create index on public.notificaciones (usuario_id, leida);

-- Bandeja de salida para la Edge Function de correo (pendiente de configurar SMTP).
-- Nunca guarda la descripción del caso: solo el código de la solicitud.
create table public.cola_correos (
  id bigint generated always as identity primary key,
  plantilla text not null check (plantilla in ('confirmacion_solicitante', 'aviso_equipo', 'asignacion', 'recordatorio')),
  destinatario text not null,
  datos jsonb not null default '{}',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'error', 'omitido')),
  intentos int not null default 0,
  creado timestamptz not null default now(),
  enviado timestamptz
);

-- ---------- Auditoría ----------
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text,
  accion text not null,
  actor_id uuid default auth.uid(),
  antes jsonb,
  despues jsonb,
  fecha timestamptz not null default now()
);
create index on public.auditoria (fecha desc);

create or replace function public.auditar() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria (tabla, registro_id, accion, antes, despues)
  values (tg_table_name, coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''), tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

-- ---------- Contenido del sitio ----------
create table public.contenido_sitio (
  clave text primary key,
  valor jsonb not null,
  actualizado timestamptz not null default now()
);
create table public.preguntas_frecuentes (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null, respuesta text not null,
  orden int not null default 0, publicada boolean not null default true
);
create table public.categorias_articulo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique, slug text not null unique
);
create table public.articulos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, slug text not null unique,
  categoria_id uuid references public.categorias_articulo (id) on delete set null,
  resumen text not null default '', contenido text not null default '',
  portada_ruta text, destacado boolean not null default false,
  publicado boolean not null default false, publicado_en timestamptz,
  autor_id uuid references public.perfiles (id) on delete set null,
  actualizado timestamptz not null default now()
);

-- Vista pública del equipo: sin correo ni datos internos.
create view public.equipo_publico as
  select id, nombre, cargo, especialidad_texto, bio, foto_ruta, orden from public.perfiles where publico and activo;

-- =====================================================================
-- Acceso a casos (usado por RLS y por Storage)
-- =====================================================================
create or replace function public.puede_ver_caso(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin() or exists (select 1 from public.casos where id = c and responsable_id = auth.uid())
$$;
create or replace function public.puede_ver_cliente(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.gestiona_bandeja() or exists (select 1 from public.casos where cliente_id = c and responsable_id = auth.uid())
$$;

-- =====================================================================
-- Clasificación y captación (lo único que el público puede ejecutar)
-- =====================================================================
create or replace function public.clasificar(p_area text, p_urgencia text, p_proceso text, p_descripcion text, p_contacto boolean,
  out puntaje int, out estado text, out prioridad text) language plpgsql stable security definer set search_path = public as $$
declare
  c jsonb := (select config from public.reglas_clasificacion);
  w jsonb := c -> 'pesos';
  atendida boolean := exists (select 1 from public.especialidades where id = p_area and publicada);
  largo int := length(trim(p_descripcion));
  minimo int := (c ->> 'minDescripcion')::int;
begin
  puntaje := round(
      (case when atendida then (w ->> 'area')::numeric else 0 end)
    + (w ->> 'urgencia')::numeric * coalesce((c -> 'urgencia' ->> p_urgencia)::numeric, 0)
    + (w ->> 'proceso')::numeric * coalesce((c -> 'proceso' ->> p_proceso)::numeric, 0)
    + (w ->> 'descripcion')::numeric * least(1, largo::numeric / minimo)
    + (case when p_contacto then (w ->> 'contacto')::numeric else 0 end));
  puntaje := least(100, greatest(0, puntaje));
  estado := case when not atendida then 'no_corresponde'
                 when largo < minimo or not p_contacto then 'incompleta'
                 when puntaje >= (c ->> 'umbralCalificada')::int then 'requiere_evaluacion'
                 else 'nueva' end;
  prioridad := p_urgencia;
end $$;

create or replace function public.crear_solicitud(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare
  v_tel text := nullif(trim(p ->> 'telefono'), '');
  v_correo text := nullif(lower(trim(p ->> 'correo')), '');
  cls record;
  v_asignado uuid;
  v_sol public.solicitudes;
begin
  if coalesce((p ->> 'consentimiento')::boolean, false) is not true then
    raise exception 'Se requiere la autorización de tratamiento de datos';
  end if;
  -- Freno básico de abuso: máximo 5 solicitudes por contacto en una hora.
  if (select count(*) from public.solicitudes where creada > now() - interval '1 hour'
      and (telefono = v_tel or correo = v_correo)) >= 5 then
    raise exception 'Demasiadas solicitudes. Intente más tarde o escríbanos por WhatsApp';
  end if;

  select * into cls from public.clasificar(p ->> 'area', p ->> 'urgencia', p ->> 'proceso', coalesce(p ->> 'descripcion', ''), v_tel is not null or v_correo is not null);

  if (select auto_asignar from public.reglas_clasificacion) and cls.estado <> 'no_corresponde' then
    select pe.perfil_id into v_asignado from public.perfil_especialidades pe join public.perfiles pf on pf.id = pe.perfil_id
    where pe.especialidad_id = p ->> 'area' and pf.activo and pf.rol = 'abogado'
    order by (select count(*) from public.solicitudes s where s.asignado_a = pe.perfil_id and s.estado in ('nueva', 'pendiente', 'requiere_evaluacion')) limit 1;
  end if;

  insert into public.solicitudes (situacion, area, tipo, ciudad, proceso, urgencia, descripcion, nombre, telefono, correo,
    puntaje, prioridad, estado, asignado_a, consentimiento_fecha, politica_version)
  values (p ->> 'situacion', p ->> 'area', p ->> 'tipo', trim(p ->> 'ciudad'), p ->> 'proceso', p ->> 'urgencia', trim(p ->> 'descripcion'),
    trim(p ->> 'nombre'), v_tel, v_correo, cls.puntaje, cls.prioridad, cls.estado, v_asignado, now(), coalesce(p ->> 'politica_version', 'sin-version'))
  returning * into v_sol;

  -- Avisos internos y correos en cola (solo el código, nunca la descripción).
  insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
  select id, 'nueva_solicitud', 'Nueva solicitud ' || v_sol.codigo || ' · prioridad ' || v_sol.prioridad, '/admin/#solicitudes'
  from public.perfiles where activo and (rol in ('admin', 'asistente') or id = v_asignado);
  if v_correo is not null then
    insert into public.cola_correos (plantilla, destinatario, datos) values ('confirmacion_solicitante', v_correo, jsonb_build_object('codigo', v_sol.codigo));
  end if;
  insert into public.cola_correos (plantilla, destinatario, datos)
  select 'aviso_equipo', correo, jsonb_build_object('codigo', v_sol.codigo, 'prioridad', v_sol.prioridad)
  from public.perfiles where activo and rol = 'admin' and correo is not null;

  return v_sol.codigo;
end $$;

-- Convierte una solicitud calificada en cliente + caso.
create or replace function public.convertir_solicitud(p_solicitud uuid, p_titulo text default null) returns text language plpgsql security definer set search_path = public as $$
declare s public.solicitudes; v_cli uuid; v_caso public.casos;
begin
  select * into s from public.solicitudes where id = p_solicitud for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if not (public.es_admin() or (public.mi_rol() = 'abogado' and s.asignado_a = auth.uid())) then
    raise exception 'Sin permiso para convertir esta solicitud';
  end if;
  if s.estado = 'convertida' then raise exception 'La solicitud ya fue convertida'; end if;
  insert into public.clientes (nombre, tipo, telefono, correo, ciudad, creado_por)
  values (s.nombre, s.tipo, s.telefono, s.correo, s.ciudad, auth.uid()) returning id into v_cli;
  insert into public.casos (cliente_id, responsable_id, especialidad_id, solicitud_id, titulo, descripcion)
  values (v_cli, coalesce(s.asignado_a, auth.uid()), (select id from public.especialidades where id = s.area),
          s.id, coalesce(p_titulo, 'Caso desde ' || s.codigo), s.descripcion)
  returning * into v_caso;
  insert into public.movimientos_caso (caso_id, texto) values (v_caso.id, 'Caso abierto desde la solicitud ' || s.codigo);
  update public.solicitudes set estado = 'convertida', cliente_id = v_cli where id = s.id;
  return v_caso.codigo;
end $$;

-- ---------- Automatizaciones por trigger ----------
create or replace function public.al_cambiar_solicitud() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.actualizada := now();
  if new.asignado_a is distinct from old.asignado_a and new.asignado_a is not null then
    insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
    values (new.asignado_a, 'asignacion', 'Se le asignó la solicitud ' || new.codigo, '/admin/#solicitudes');
    if new.estado = 'nueva' then new.estado := 'pendiente'; end if;
  end if;
  return new;
end $$;

create or replace function public.al_cambiar_caso() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado then
    insert into public.movimientos_caso (caso_id, texto) values (new.id, 'Estado: ' || old.estado || ' → ' || new.estado);
    if new.estado = 'cerrado' then new.cerrado := now(); end if;
  end if;
  if new.responsable_id is distinct from old.responsable_id and new.responsable_id is not null then
    insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
    values (new.responsable_id, 'caso_asignado', 'Ahora es responsable del caso ' || new.codigo, '/admin/#casos');
    insert into public.movimientos_caso (caso_id, texto) values (new.id, 'Cambio de responsable');
  end if;
  if new.estado is distinct from old.estado and new.responsable_id is not null and new.responsable_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then
    insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
    values (new.responsable_id, 'caso_estado', 'El caso ' || new.codigo || ' cambió a ' || new.estado, '/admin/#casos');
  end if;
  return new;
end $$;

-- Para programar con pg_cron cuando se active: select cron.schedule('alertas', '0 * * * *', 'select public.alertas_pendientes()');
create or replace function public.alertas_pendientes() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
  select coalesce(s.asignado_a, p.id), 'alerta_pendiente', 'La solicitud ' || s.codigo || ' lleva más de 24 h sin revisar', '/admin/#solicitudes'
  from public.solicitudes s
  join public.perfiles p on p.activo and (p.id = s.asignado_a or (s.asignado_a is null and p.rol = 'admin'))
  where s.estado in ('nueva', 'pendiente') and not s.archivada and s.creada < now() - interval '24 hours'
    and not exists (select 1 from public.notificaciones x where x.tipo = 'alerta_pendiente' and x.titulo like '%' || s.codigo || '%' and x.creada > now() - interval '24 hours');
  get diagnostics n = row_count;
  return n;
end $$;

create trigger t_perfiles_rol before update on public.perfiles for each row execute function public.proteger_rol();
create trigger t_perfiles_act before update on public.perfiles for each row execute function public.tocar_actualizado();
create trigger t_especialidades_act before update on public.especialidades for each row execute function public.tocar_actualizado();
create trigger t_articulos_act before update on public.articulos for each row execute function public.tocar_actualizado();
create trigger t_solicitud_cambio before update on public.solicitudes for each row execute function public.al_cambiar_solicitud();
create trigger t_caso_cambio before update on public.casos for each row execute function public.al_cambiar_caso();
do $$ declare t text; begin
  foreach t in array array['perfiles', 'perfil_especialidades', 'especialidades', 'reglas_clasificacion', 'solicitudes', 'notas_solicitud',
    'clientes', 'casos', 'actividades_caso', 'documentos', 'articulos', 'contenido_sitio', 'preguntas_frecuentes'] loop
    execute format('create trigger t_auditar after insert or update or delete on public.%I for each row execute function public.auditar()', t);
  end loop;
end $$;

-- =====================================================================
-- RLS: activada en TODAS las tablas
-- =====================================================================
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Contenido público (solo lo publicado)
create policy pub_especialidades on public.especialidades for select using (publicada or public.es_staff());
create policy pub_faq on public.preguntas_frecuentes for select using (publicada or public.es_staff());
create policy pub_categorias on public.categorias_articulo for select using (true);
create policy pub_articulos on public.articulos for select using (publicado or public.es_staff());
create policy pub_contenido on public.contenido_sitio for select using (true);
create policy edit_especialidades on public.especialidades for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy edit_faq on public.preguntas_frecuentes for all to authenticated using (public.gestiona_bandeja()) with check (public.gestiona_bandeja());
create policy edit_categorias on public.categorias_articulo for all to authenticated using (public.gestiona_bandeja()) with check (public.gestiona_bandeja());
create policy edit_articulos on public.articulos for all to authenticated using (public.gestiona_bandeja()) with check (public.gestiona_bandeja());
create policy edit_contenido on public.contenido_sitio for all to authenticated using (public.gestiona_bandeja()) with check (public.gestiona_bandeja());

-- Perfiles
create policy perfiles_ver on public.perfiles for select to authenticated using (id = auth.uid() or public.es_staff());
create policy perfiles_propio on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy perfiles_admin on public.perfiles for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy pesp_ver on public.perfil_especialidades for select to authenticated using (public.es_staff());
create policy pesp_admin on public.perfil_especialidades for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Reglas
create policy reglas_ver on public.reglas_clasificacion for select to authenticated using (public.es_staff());
create policy reglas_admin on public.reglas_clasificacion for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Solicitudes: el público NO tiene políticas (solo crear_solicitud). Abogados: solo las asignadas.
create policy sol_ver on public.solicitudes for select to authenticated using (public.gestiona_bandeja() or asignado_a = auth.uid());
create policy sol_editar on public.solicitudes for update to authenticated using (public.gestiona_bandeja() or asignado_a = auth.uid())
  with check (public.gestiona_bandeja() or asignado_a = auth.uid());
create policy notas_ver on public.notas_solicitud for select to authenticated
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and (public.gestiona_bandeja() or s.asignado_a = auth.uid())));
create policy notas_crear on public.notas_solicitud for insert to authenticated with check (autor_id = auth.uid()
  and exists (select 1 from public.solicitudes s where s.id = solicitud_id and (public.gestiona_bandeja() or s.asignado_a = auth.uid())));

-- Clientes y casos
create policy cli_ver on public.clientes for select to authenticated using (public.puede_ver_cliente(id));
create policy cli_crear on public.clientes for insert to authenticated with check (public.mi_rol() in ('admin', 'abogado'));
create policy cli_editar on public.clientes for update to authenticated using (public.puede_ver_cliente(id)) with check (public.puede_ver_cliente(id));
create policy caso_ver on public.casos for select to authenticated using (public.puede_ver_caso(id));
create policy caso_crear on public.casos for insert to authenticated with check (public.es_admin() or responsable_id = auth.uid());
create policy caso_editar on public.casos for update to authenticated using (public.puede_ver_caso(id)) with check (public.es_admin() or responsable_id = auth.uid());
create policy act_todo on public.actividades_caso for all to authenticated using (public.puede_ver_caso(caso_id)) with check (public.puede_ver_caso(caso_id));
create policy mov_ver on public.movimientos_caso for select to authenticated using (public.puede_ver_caso(caso_id));
create policy mov_crear on public.movimientos_caso for insert to authenticated with check (public.puede_ver_caso(caso_id));
create policy doc_ver on public.documentos for select to authenticated using (public.puede_ver_caso(caso_id));
create policy doc_crear on public.documentos for insert to authenticated with check (public.puede_ver_caso(caso_id));
create policy doc_borrar on public.documentos for delete to authenticated using (public.es_admin());

-- Notificaciones: cada quien las suyas
create policy notif_propias on public.notificaciones for select to authenticated using (usuario_id = auth.uid());
create policy notif_leer on public.notificaciones for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Auditoría: solo lectura para administradores. Sin políticas de escritura (la escriben triggers).
create policy auditoria_admin on public.auditoria for select to authenticated using (public.es_admin());
-- cola_correos: sin políticas; solo la usa el servidor (service_role en la Edge Function).

-- ---------- Permisos de ejecución ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.crear_solicitud(jsonb) to anon, authenticated;
grant execute on function public.convertir_solicitud(uuid, text) to authenticated;
-- Las políticas de lectura pública llaman a es_staff(), por eso anon también puede ejecutarlas (devuelven falso).
grant execute on function public.mi_rol(), public.es_admin(), public.es_staff(), public.gestiona_bandeja() to anon, authenticated;
grant execute on function public.puede_ver_caso(uuid), public.puede_ver_cliente(uuid) to authenticated;
grant select on public.equipo_publico to anon, authenticated;

-- =====================================================================
-- Storage: documentos privados y archivos públicos del sitio
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documentos', 'documentos', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('sitio', 'sitio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do nothing;

-- Ruta de documentos: casos/<caso_id>/<archivo>. Acceso por URL firmada.
create policy docs_leer on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = 'casos' and public.puede_ver_caso(((storage.foldername(name))[2])::uuid));
create policy docs_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = 'casos' and public.puede_ver_caso(((storage.foldername(name))[2])::uuid));
create policy docs_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.es_admin());
create policy sitio_leer on storage.objects for select using (bucket_id = 'sitio');
create policy sitio_escribir on storage.objects for insert to authenticated with check (bucket_id = 'sitio' and public.gestiona_bandeja());
create policy sitio_editar on storage.objects for update to authenticated using (bucket_id = 'sitio' and public.gestiona_bandeja());
create policy sitio_borrar on storage.objects for delete to authenticated using (bucket_id = 'sitio' and public.gestiona_bandeja());
