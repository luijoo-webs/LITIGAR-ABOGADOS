/* Datos compartidos del preview: contenido del sitio, reglas de clasificación y almacenamiento de demostración.
   En producción este contenido sale de Supabase (tablas contenido_sitio, especialidades, perfiles, articulos, reglas_clasificacion). */
(function () {
  const PROV = 'Provisional';

  const contacto = {
    nombre: 'Litigar Group S.A.S.',
    lema: 'Abogados & Asesores',
    telefonos: ['315 050 6085', '318 239 1588'],
    correo: 'info@litigar.co',
    whatsapp: 'https://api.whatsapp.com/message/6MJQOIN5DEMUP1?autoload=1&app_absent=0',
    instagram: 'https://www.instagram.com/litigar.abogados/',
    ciudad: 'Por confirmar',
    direccion: 'Por confirmar',
    horario: 'Por confirmar',
  };

  // Áreas vistas en el Instagram de la firma; las descripciones son provisionales.
  const areas = [
    { id: 'familia', nombre: 'Derecho de Familia', corto: 'Familia',
      resumen: 'Acompañamiento en asuntos que afectan a su núcleo familiar, con criterio jurídico y trato humano.',
      temas: ['Cuotas alimentarias', 'Impugnación de paternidad', 'Custodia y visitas', 'Divorcios y liquidación de sociedad conyugal'],
      ampliado: 'Texto provisional. Aquí la firma describirá su enfoque en Derecho de Familia, el tipo de casos que atiende y qué documentos conviene tener a mano en la primera consulta.' },
    { id: 'laboral', nombre: 'Derecho Laboral', corto: 'Laboral',
      resumen: 'Protección de los derechos que nacen de la relación de trabajo, para trabajadores y empleadores.',
      temas: ['Despido injustificado o indirecto', 'Llamados de atención y debido proceso', 'Accidentes de trabajo', 'Liquidaciones y prestaciones'],
      ampliado: 'Texto provisional. Aquí la firma describirá cómo acompaña a trabajadores y empresas, y en qué momento conviene buscar asesoría.' },
    { id: 'civil', nombre: 'Derecho Civil', corto: 'Civil',
      resumen: 'Soluciones para conflictos entre particulares: contratos, bienes, obligaciones y responsabilidad.',
      temas: ['Contratos e incumplimientos', 'Cobros y obligaciones', 'Bienes y sucesiones', 'Responsabilidad civil'],
      ampliado: 'Texto provisional. Aquí la firma describirá los asuntos civiles que atiende y su forma de abordarlos, por vía conciliatoria o judicial.' },
    { id: 'seguridad-social', nombre: 'Seguridad Social', corto: 'Seguridad social',
      resumen: 'Orientación en pensiones, salud y riesgos laborales para que su protección no quede en el papel.',
      temas: ['Pensiones', 'Incapacidades', 'Calificación de pérdida de capacidad laboral', 'Reclamaciones ante EPS y ARL'],
      ampliado: 'Texto provisional. Aquí la firma describirá su experiencia en seguridad social y los trámites que acompaña.' },
    { id: 'tributario', nombre: 'Tributario y Finanzas', corto: 'Tributario',
      resumen: 'Abogados y contadores trabajando juntos en sus obligaciones tributarias y financieras.',
      temas: ['Declaración de renta', 'Corrección de declaraciones', 'Requerimientos de la DIAN', 'Planeación tributaria'],
      ampliado: 'Texto provisional. Aquí la firma describirá cómo integra la asesoría jurídica y contable en asuntos tributarios.' },
  ];

  const pasos = [
    { t: 'Nos cuenta su situación', d: 'Por WhatsApp, por teléfono o con el formulario de este sitio. Son preguntas cortas y no necesita términos jurídicos.' },
    { t: 'Revisamos y le orientamos', d: 'Una persona del equipo lee su caso y valora si corresponde a los servicios de la firma. Ningún sistema decide por usted.' },
    { t: 'Le acompañamos', d: 'Si podemos ayudarle, le contactamos por el canal que indicó para coordinar la consulta y los siguientes pasos.' },
  ];

  // Sin nombres reales: la firma los confirmará. En producción se administran desde el panel (Equipo).
  const equipo = [
    { nombre: 'Integrante por confirmar', cargo: 'Socio fundador', especialidad: 'Por confirmar', bio: 'Descripción profesional provisional. Se reemplaza desde el panel administrativo.' },
    { nombre: 'Integrante por confirmar', cargo: 'Abogado asociado', especialidad: 'Por confirmar', bio: 'Descripción profesional provisional. Se reemplaza desde el panel administrativo.' },
    { nombre: 'Integrante por confirmar', cargo: 'Contador asesor', especialidad: 'Tributario y Finanzas', bio: 'Descripción profesional provisional. Se reemplaza desde el panel administrativo.' },
    { nombre: 'Integrante por confirmar', cargo: 'Abogado', especialidad: 'Por confirmar', bio: 'Descripción profesional provisional. Se reemplaza desde el panel administrativo.' },
  ];

  // Títulos basados en temas publicados en el Instagram de la firma; fechas y resúmenes provisionales.
  const articulos = [
    { titulo: '¿Declaras renta? Lo que conviene revisar antes de presentar', cat: 'Tributario', fecha: '2026-11-18', destacado: true, min: 6,
      resumen: 'Resumen provisional: quiénes deben declarar, qué documentos reunir y qué hacer si ya presentó con errores.' },
    { titulo: 'La inasistencia alimentaria también es un delito', cat: 'Familia', fecha: '2026-11-10', min: 4,
      resumen: 'Resumen provisional sobre las consecuencias de no cumplir la cuota alimentaria.' },
    { titulo: '¿Conoces el despido indirecto?', cat: 'Laboral', fecha: '2026-11-02', min: 5,
      resumen: 'Resumen provisional: cuándo el trabajador puede terminar el contrato por causas atribuibles al empleador.' },
    { titulo: '¿A los 18 o a los 25 años se quita la cuota de alimentos?', cat: 'Familia', fecha: '2026-10-25', min: 4,
      resumen: 'Resumen provisional sobre la duración de la obligación alimentaria con hijos mayores de edad.' },
    { titulo: 'Un accidente antes de entrar al trabajo, ¿puede ser laboral?', cat: 'Laboral', fecha: '2026-10-15', min: 5,
      resumen: 'Resumen provisional sobre un pronunciamiento de la Corte Suprema de Justicia.' },
    { titulo: 'Impugnación de paternidad: plazos y pruebas', cat: 'Familia', fecha: '2026-10-05', min: 6,
      resumen: 'Resumen provisional sobre el proceso y la prueba de ADN.' },
  ];

  const faqs = [
    { p: '¿La primera consulta tiene costo?', r: 'Por confirmar con la firma.' },
    { p: '¿Atienden de forma virtual?', r: 'Por confirmar con la firma.' },
    { p: '¿Enviar una solicitud me compromete a algo?', r: 'No. La solicitud solo permite que el equipo revise su situación. Ni usted ni la firma adquieren un compromiso por enviarla.' },
    { p: '¿Qué pasa con la información que envío?', r: 'Se trata de forma confidencial y solo para atender su solicitud, conforme a la política de tratamiento de datos personales.' },
  ];

  // Preguntas del asistente de captación.
  const asistente = {
    situaciones: [
      { id: 'conflicto', t: 'Tengo un conflicto o una disputa' },
      { id: 'demanda', t: 'Me demandaron o me notificaron algo' },
      { id: 'tramite', t: 'Necesito hacer un trámite o una gestión' },
      { id: 'asesoria', t: 'Quiero asesoría preventiva' },
      { id: 'otra', t: 'Otra situación' },
    ],
    urgencias: [
      { id: 'alta', t: 'Urgente', d: 'Tengo una fecha límite o una audiencia en los próximos días' },
      { id: 'media', t: 'Pronto', d: 'Necesito orientación en las próximas semanas' },
      { id: 'baja', t: 'Sin prisa', d: 'Estoy averiguando opciones' },
    ],
    procesos: [
      { id: 'si', t: 'Sí, hay un proceso en curso' },
      { id: 'no', t: 'No' },
      { id: 'nose', t: 'No estoy seguro' },
    ],
  };

  // Reglas de clasificación configurables (en producción: tabla reglas_clasificacion).
  // La puntuación solo ordena la bandeja; nunca acepta ni rechaza un caso.
  const reglasBase = {
    areasAtendidas: areas.map((a) => a.id),
    pesos: { area: 35, urgencia: 25, proceso: 15, descripcion: 15, contacto: 10 },
    urgencia: { alta: 1, media: 0.6, baja: 0.25 },
    proceso: { si: 1, nose: 0.5, no: 0.3 },
    minDescripcion: 80,
    umbralCalificada: 70,
    umbralEvaluacion: 45,
  };

  function clasificar(s, reglas) {
    const r = reglas || reglasBase, p = r.pesos;
    const atendida = r.areasAtendidas.includes(s.area);
    const largo = (s.descripcion || '').trim().length;
    const completa = largo >= r.minDescripcion;
    const contacto = !!(s.telefono || s.correo);
    let puntaje = (atendida ? p.area : 0)
      + p.urgencia * (r.urgencia[s.urgencia] || 0)
      + p.proceso * (r.proceso[s.proceso] || 0)
      + p.descripcion * Math.min(1, largo / r.minDescripcion)
      + (contacto ? p.contacto : 0);
    puntaje = Math.round(puntaje);
    let estado = 'nueva';
    if (!atendida) estado = 'no_corresponde';
    else if (!completa || !contacto) estado = 'incompleta';
    else if (puntaje >= r.umbralCalificada) estado = 'requiere_evaluacion';
    const prioridad = s.urgencia === 'alta' ? 'alta' : s.urgencia === 'media' ? 'media' : 'baja';
    return { puntaje, estadoSugerido: estado, prioridad };
  }

  const estados = {
    nueva: 'Nueva solicitud',
    pendiente: 'Pendiente de revisión',
    incompleta: 'Información incompleta',
    requiere_evaluacion: 'Requiere evaluación',
    calificada: 'Consulta calificada',
    no_corresponde: 'No corresponde a los servicios',
    convertida: 'Convertida en cliente',
    cerrada: 'Cerrada',
  };

  /* Almacenamiento de demostración: localStorage, solo en este navegador.
     shortcut: sin servidor ni autenticación; en producción se reemplaza por llamadas a Supabase (ver supabase/schema.sql). */
  const KEY = 'litigar-demo-v1';
  const store = {
    leer() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } },
    guardar(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; } },
    borrar() { try { localStorage.removeItem(KEY); } catch (e) {} },
  };

  let seq = 0;
  const codigo = (pref) => `${pref}-${new Date().getFullYear()}-${String(Date.now() % 100000 + seq++).padStart(5, '0')}`;

  // Guarda una solicitud del sitio público en la base de demostración (la crea si no existe).
  function crearSolicitud(datos) {
    const db = store.leer() || window.LITIGAR.semilla();
    const c = clasificar(datos, db.reglas);
    const sol = Object.assign({}, datos, {
      id: codigo('SOL'), creada: new Date().toISOString(), estado: c.estadoSugerido,
      puntaje: c.puntaje, prioridad: c.prioridad, asignado: null, notas: [], archivada: false, origen: 'Sitio web',
    });
    db.solicitudes.unshift(sol);
    db.auditoria.unshift({ fecha: sol.creada, quien: 'Sitio web', accion: `Nueva solicitud ${sol.id} (${c.puntaje} pts, sugerido: ${estados[c.estadoSugerido]})` });
    return store.guardar(db) ? sol : null;
  }

  // Contenido editado desde el panel de demostración (en producción viene de Supabase).
  const editado = (store.leer() || {}).contenido || {};
  [[areas, editado.areas], [equipo, editado.equipo], [articulos, editado.articulos], [faqs, editado.faqs]]
    .forEach(([base, nuevo]) => Array.isArray(nuevo) && nuevo.forEach((x, i) => base[i] && Object.assign(base[i], x)));
  if (editado.contacto) Object.assign(contacto, editado.contacto);

  window.LITIGAR = { PROV, contacto, areas, pasos, equipo, articulos, faqs, asistente, reglasBase, clasificar, estados, store, codigo, crearSolicitud };
})();
