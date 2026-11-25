-- Una sola solicitud pública: cita o cotización, con los servicios elegidos en el sitio.
-- La modalidad solo se exige cuando es una cita.

alter table public.citas add column tipo text not null default 'cita' check (tipo in ('cita', 'cotizacion'));
alter table public.citas add column servicios text[] not null default '{}' check (cardinality(servicios) <= 20);
alter table public.citas alter column modalidad drop not null;
alter table public.citas add constraint citas_modalidad_si_cita check (tipo = 'cotizacion' or modalidad is not null);

create or replace function public.solicitar_cita(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare
  v_tipo text := coalesce(nullif(p ->> 'tipo', ''), 'cita');
  v_correo text := lower(trim(p ->> 'correo'));
  v_tel text := trim(p ->> 'telefono');
  v_fecha date := nullif(p ->> 'fecha_preferida', '')::date;
  v_areas text[];
  v_servicios text[];
  v public.citas;
begin
  if nullif(p ->> 'web', '') is not null then raise exception 'Solicitud rechazada'; end if;  -- campo trampa
  if v_tipo not in ('cita', 'cotizacion') then raise exception 'Tipo de solicitud no válido'; end if;
  if coalesce((p ->> 'consentimiento')::boolean, false) is not true then
    raise exception 'Se requiere la autorización de tratamiento de datos';
  end if;
  if v_tipo = 'cotizacion' then v_fecha := null; end if;
  if v_fecha is not null and (v_fecha < current_date or v_fecha > current_date + 120) then
    raise exception 'Elija una fecha entre hoy y los próximos cuatro meses';
  end if;
  if (select count(*) from public.citas where creada > now() - interval '1 hour' and (correo = v_correo or telefono = v_tel)) >= 3 then
    raise exception 'Demasiadas solicitudes. Intente más tarde o escríbanos por WhatsApp';
  end if;
  select coalesce(array_agg(x), '{}') into v_areas
  from jsonb_array_elements_text(case when jsonb_typeof(p -> 'areas') = 'array' then p -> 'areas' else '[]' end) x
  where x in (select id from public.especialidades);
  -- Texto libre del sitio: se recorta y se limita, nunca se interpreta
  select coalesce(array_agg(left(trim(x), 120)), '{}') into v_servicios
  from (select x from jsonb_array_elements_text(case when jsonb_typeof(p -> 'servicios') = 'array' then p -> 'servicios' else '[]' end) x
        where trim(x) <> '' limit 20) s;
  if v_tipo = 'cotizacion' and cardinality(v_servicios) = 0 and length(coalesce(trim(p ->> 'mensaje'), '')) < 10 then
    raise exception 'Para cotizar, añada al menos un servicio o cuéntenos qué necesita';
  end if;

  insert into public.citas (tipo, nombre, apellido, correo, telefono, areas, servicios, modalidad, fecha_preferida, franja, mensaje, consentimiento_fecha, politica_version)
  values (v_tipo, trim(p ->> 'nombre'), trim(p ->> 'apellido'), v_correo, v_tel, v_areas, v_servicios,
          case when v_tipo = 'cita' then p ->> 'modalidad' end, v_fecha,
          case when v_tipo = 'cita' then nullif(p ->> 'franja', '') end,
          coalesce(trim(p ->> 'mensaje'), ''), now(), coalesce(p ->> 'politica_version', 'sin-version'))
  returning * into v;

  insert into public.notificaciones (usuario_id, tipo, titulo, enlace)
  select id, 'nueva_cita', case when v_tipo = 'cita' then 'Nueva solicitud de cita ' else 'Nueva solicitud de cotización ' end || v.codigo, '/admin/#citas'
  from public.perfiles where activo and rol in ('admin', 'asistente');
  insert into public.cola_correos (plantilla, destinatario, datos)
  values ('confirmacion_cita', v.correo, jsonb_build_object('codigo', v.codigo, 'tipo', v_tipo));
  return v.codigo;
end $$;

revoke execute on function public.solicitar_cita(jsonb) from public;
grant execute on function public.solicitar_cita(jsonb) to anon, authenticated;
