-- Contenido inicial PROVISIONAL (áreas vistas en el Instagram de la firma). Se reemplaza desde el panel.
insert into public.especialidades (id, nombre, corto, resumen, temas, orden) values
  ('familia', 'Derecho de Familia', 'Familia', 'Acompañamiento en asuntos que afectan a su núcleo familiar.', array['Cuotas alimentarias', 'Impugnación de paternidad', 'Custodia y visitas', 'Divorcios'], 1),
  ('laboral', 'Derecho Laboral', 'Laboral', 'Protección de los derechos que nacen de la relación de trabajo.', array['Despido injustificado o indirecto', 'Debido proceso', 'Accidentes de trabajo', 'Liquidaciones'], 2),
  ('civil', 'Derecho Civil', 'Civil', 'Soluciones para conflictos entre particulares.', array['Contratos', 'Cobros y obligaciones', 'Bienes y sucesiones', 'Responsabilidad civil'], 3),
  ('seguridad-social', 'Seguridad Social', 'Seguridad social', 'Orientación en pensiones, salud y riesgos laborales.', array['Pensiones', 'Incapacidades', 'Pérdida de capacidad laboral', 'EPS y ARL'], 4),
  ('tributario', 'Tributario y Finanzas', 'Tributario', 'Abogados y contadores en sus obligaciones tributarias.', array['Declaración de renta', 'Corrección de declaraciones', 'Requerimientos DIAN', 'Planeación tributaria'], 5)
on conflict (id) do nothing;

insert into public.contenido_sitio (clave, valor) values
  ('contacto', '{"telefonos": ["315 050 6085", "318 239 1588"], "correo": "info@litigar.co", "instagram": "https://www.instagram.com/litigar.abogados/", "direccion": "Por confirmar", "ciudad": "Por confirmar", "horario": "Por confirmar"}'),
  ('politica_datos', '{"version": "provisional-2026-11", "texto": "Pendiente de redacción por la firma."}')
on conflict (clave) do nothing;
