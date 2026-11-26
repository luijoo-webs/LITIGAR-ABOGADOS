-- Áreas según el cuestionario respondido por la firma (2026-11): se añade Penal y el área contable
-- conserva su id 'tributario' para no romper solicitudes, casos ni asignaciones existentes.
insert into public.especialidades (id, nombre, corto, resumen, temas, orden) values
  ('penal', 'Derecho Penal', 'Penal', 'Defensa en todo tipo de delitos. Defendemos la inocencia de las personas.', array['Defensa penal'], 4)
on conflict (id) do update set nombre = excluded.nombre, corto = excluded.corto, resumen = excluded.resumen, temas = excluded.temas, orden = excluded.orden;

update public.especialidades set orden = 1, resumen = 'Defendemos a madres y padres que no reciben la cuota de sus hijos, y protegemos el patrimonio de quienes enfrentan un divorcio o una herencia.',
  temas = array['Cuota de alimentos', 'Divorcio', 'Protección del patrimonio en un divorcio', 'Herencias y sucesiones'] where id = 'familia';
update public.especialidades set orden = 2, resumen = 'Recuperamos las prestaciones sociales y las acreencias laborales que se le deben al trabajador.',
  temas = array['Recuperación de prestaciones sociales', 'Liquidación no pagada', 'Años trabajados sin pago de prestaciones'] where id = 'laboral';
update public.especialidades set orden = 3, nombre = 'Contable y Tributario', corto = 'Contable',
  resumen = 'Contadores especialistas en declaraciones de renta de persona natural y jurídica, revisoría fiscal y asesoría en impuestos.',
  temas = array['Declaración de renta (persona natural y jurídica)', 'Declaraciones tributarias', 'Revisoría fiscal', 'Facturación electrónica: resolución e implementación',
    'Creación y liquidación de empresas', 'Renovación de Cámara de Comercio, Industria y Comercio y RUP', 'Información exógena', 'Asesoría financiera y tributaria'] where id = 'tributario';
update public.especialidades set orden = 5, resumen = 'Nos especializamos en contratos, obligaciones entre partes y cobro coactivo de cartera.',
  temas = array['Contratos', 'Obligaciones entre partes', 'Cobro de cartera'] where id = 'civil';
update public.especialidades set orden = 6, nombre = 'Seguridad Social y Pensiones', resumen = 'Asesoría en pensiones y seguridad social.', temas = array['Pensiones'] where id = 'seguridad-social';
