-- Solicitudes de cita desde el formulario del sitio.
-- El público no lee ni escribe la tabla: solo ejecuta solicitar_cita(). La fecha es una preferencia;
-- la cita la confirma una persona del equipo desde el panel.

create sequence public.seq_cita;
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default 'CIT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.seq_cita')::text, 5, '0'),
  nombre text not null check (length(nombre) between 2 and 80),
  apellido text not null check (length(apellido) between 2 and 80),
  correo text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono text not null check (telefono ~ '^[+0-9 ()-]{7,20}$'),
  areas text[] not null default '{}',
  modalidad text not null check (modalidad in ('presencial', 'videollamada', 'llamada')),
  fecha_preferida date,
  franja text check (franja in ('manana', 'tarde')),
  mensaje text not null default '' check (length(mensaje) <= 2000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'reprogramar', 'atendida', 'cancelada')),
  fecha_confirmada timestamptz,
  asignado_a uuid references public.perfiles (id) on delete set null,
  notas text not null default '' check (length(notas) <= 2000),
  consentimiento_fecha timestamptz not null,
  politica_version text not null,
  creada timestamptz not null default now()
);
create index on public.citas (estado, creada desc);
create index on public.citas (asignado_a);

alter table public.citas enable row level security;
create policy citas_ver on public.citas for select to authenticated using (public.gestiona_bandeja() or asignado_a = auth.uid());
create policy citas_editar on public.citas for update to authenticated using (public.gestiona_bandeja() or asignado_a = auth.uid())
  with check (public.gestiona_bandeja() or asignado_a = auth.uid());
create trigger t_auditar after insert or update or delete on public.citas for each row execute function public.auditar();

alter table public.cola_correos drop constraint cola_correos_plantilla_check;
alter table public.cola_correos add constraint cola_correos_plantilla_check
  check (plantilla in ('confirmacion_solicitante', 'aviso_equipo', 'asignacion', 'recordatorio', 'confirmacion_cita'));

create or replace function public.solicitar_cita(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare
  v_correo text := lower(trim(p ->> 'correo'));
  v_tel text := trim(p ->> 'telefono');
  v_fecha date := nullif(p ->> 'fecha_preferida', '')::date;
  v_areas text[];
  v public.citas;
begin
  if nullif(p ->> 'web', '') is not null then raise exception 'Solicitud rechazada'; end if;  -- campo trampa
  if coalesce((p ->> 'consentimiento')::boolean, false) is not true then
    raise exception 'Se requiere la autorización de tratamiento de datos';
  end if;
  if v_fecha is not null and (v_fecha < current_date or v_fecha > current_date + 120) then
    raise exception 'Elija una fecha entre hoy y los próximos cuatro meses';
  end if;
  if (select count(*) from public.citas where creada > now() - interval '1 hour' and (correo = v_correo or telefono = v_tel)) >= 3 then
    raise exception 'Demasiadas solicitudes. Intente más tarde o escríbanos por WhatsApp';
  end if;
  select coalesce(array_agg(x), '{}') into v_areas
  from jsonb_array_elements_text(case when jsonb_typeof(p -> 'areas') = 'array' then p -> 'areas' else '[]' end) x
  where x in (select id from public.especialidades);

  insert into public.citas (nombre, apellido, correo, telefono, areas, modalidad, fecha_preferida, franja, mensaje, consentimiento_fecha, politica_version)
  values (trim(p ->> 'nombre'), trim(p ->> 'apellido'), v_correo, v_tel, v_areas, p ->> 'modalidad', v_fecha, nullif(p ->> 'franja', ''),
          coalesce(trim(p ->> 'mensaje'), ''), now(), coalesce(p ->> 'politica_version', 'sin-version'))
  returning * into v;

  insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
  select id, 'nueva_cita', 'Nueva solicitud de cita ' || v.codigo, '/admin/#citas'
  from public.perfiles where activo and rol in ('admin', 'asistente');
  insert into public.cola_correos (plantilla, destinatario, datos) values ('confirmacion_cita', v.correo, jsonb_build_object('codigo', v.codigo));
  return v.codigo;
end $$;

revoke execute on function public.solicitar_cita(jsonb) from public;
grant execute on function public.solicitar_cita(jsonb) to anon, authenticated;
