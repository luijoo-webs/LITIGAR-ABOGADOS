/* Datos compartidos del preview: contenido del sitio, reglas de clasificación y almacenamiento de demostración.
   En producción este contenido sale de Supabase (tablas contenido_sitio, especialidades, perfiles, articulos, reglas_clasificacion). */
(function () {
  const PROV = 'Provisional';

  const contacto = {
    nombre: 'Litigar Group – Abogados & Asociados S.A.S.',
    lema: 'Abogados & Asociados',
    telefonos: ['315 050 6085', '318 239 1588'],
    oficinaWa: '573150506085', // la firma pidió que las solicitudes lleguen a este número
    correo: 'info@litigar.co',
    whatsapp: 'https://api.whatsapp.com/message/6MJQOIN5DEMUP1?autoload=1&app_absent=0',
    instagram: 'https://www.instagram.com/litigar.abogados/',
    ciudad: 'Sede en Valledupar · virtual en todo el país',
    direccion: null, // la firma prefiere no publicar dirección
    horario: 'Por confirmar',
  };

  // Áreas y descripciones según el cuestionario respondido por la firma (2026-11).
  // El orden pone primero lo que la firma quiere impulsar: alimentos, prestaciones sociales y declaraciones.
  const areas = [
    { id: 'familia', nombre: 'Derecho de Familia', corto: 'Familia',
      resumen: 'Defendemos a madres y padres que no reciben la cuota de sus hijos, y protegemos el patrimonio de quienes enfrentan un divorcio o una herencia.',
      temas: ['Cuota de alimentos', 'Divorcio', 'Protección del patrimonio en un divorcio', 'Herencias y sucesiones'] },
    { id: 'laboral', nombre: 'Derecho Laboral', corto: 'Laboral',
      resumen: 'Recuperamos las prestaciones sociales y las acreencias laborales que se le deben al trabajador.',
      temas: ['Recuperación de prestaciones sociales', 'Liquidación no pagada', 'Años trabajados sin pago de prestaciones'] },
    { id: 'tributario', nombre: 'Contable y Tributario', corto: 'Contable',
      resumen: 'Contadores especialistas en declaraciones de renta de persona natural y jurídica, revisoría fiscal y asesoría en impuestos.',
      temas: ['Declaración de renta (persona natural y jurídica)', 'Declaraciones tributarias', 'Revisoría fiscal', 'Facturación electrónica: resolución e implementación',
        'Creación y liquidación de empresas', 'Renovación de Cámara de Comercio, Industria y Comercio y RUP', 'Información exógena', 'Asesoría financiera y tributaria'] },
    { id: 'penal', nombre: 'Derecho Penal', corto: 'Penal',
      resumen: 'Defensa en todo tipo de delitos. Defendemos la inocencia de las personas.',
      temas: ['Defensa penal'] },
    { id: 'civil', nombre: 'Derecho Civil', corto: 'Civil',
      resumen: 'Nos especializamos en contratos, obligaciones entre partes y cobro coactivo de cartera.',
      temas: ['Contratos', 'Obligaciones entre partes', 'Cobro de cartera'] },
    { id: 'seguridad-social', nombre: 'Seguridad Social y Pensiones', corto: 'Seguridad social',
      resumen: 'Asesoría en pensiones y seguridad social.',
      temas: ['Pensiones'] },
  ];

  const pasos = [
    { t: 'Nos cuenta su caso', d: 'Por WhatsApp, por teléfono o con el formulario de este sitio. No necesita términos jurídicos.' },
    { t: 'Le decimos sus posibilidades', d: 'Hablamos con resultados: antes de empezar le explicamos con franqueza las posibilidades de un resultado favorable. En la mayoría de procesos, los honorarios se definen a partir de esa evaluación.' },
    { t: 'Le acompañamos siempre', d: 'Acompañamiento virtual permanente, con líneas de atención personalizada para clientes nuevos y antiguos.' },
  ];

  // Equipo según el cuestionario. Aún no hay fotografías oficiales (la firma las tomará).
  const equipo = [
    { nombre: 'Gustavo Andrés Chaves Calderón', cargo: 'Abogado · Socio fundador', especialidad: 'Derecho civil, de familia, laboral y seguridad social',
      bio: 'Fundó Litigar con un servicio de atención personalizada.' },
    { nombre: 'Luis David Mieles Castilla', cargo: 'Contador · Socio directivo', especialidad: 'Área contable y tributaria',
      bio: 'Se unió al socio fundador para ofrecer una firma de abogados y contadores que no deja de lado la humanización del servicio.' },
    { nombre: 'Laura Patricia Barros Córdoba', cargo: 'Abogada auxiliar asociada', especialidad: '', bio: '' },
    { nombre: 'Alexandra Manosalva', cargo: 'Auxiliar jurídico', especialidad: '', bio: '' },
    { nombre: 'Yamith Enrique Bornachera Arrieta', cargo: 'Marketing jurídico', especialidad: '', bio: '' },
  ];

  // Títulos basados en temas publicados en el Instagram de la firma; fechas y resúmenes provisionales.
  const articulos = [
    { titulo: '¿Declaras renta? Lo que conviene revisar antes de presentar', cat: 'Contable', fecha: '2026-11-18', destacado: true, min: 6,
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
    { p: '¿La primera consulta tiene costo?', r: 'Depende del caso. Cuéntenos su situación y le diremos desde el inicio si la consulta tiene costo.' },
    { p: '¿Atienden de forma virtual?', r: 'Sí. Tenemos sede presencial en Valledupar y atendemos de forma virtual en todo el país.' },
    { p: '¿Cuánto es la cuota que le corresponde a mi hijo?', r: 'No hay una cifra única: se fija según las necesidades del menor y la capacidad económica de quien debe pagarla, por acuerdo entre los padres o por decisión de un juez. Revisamos su caso y le orientamos para solicitarla o hacerla cumplir.' },
    { p: 'No me pagaron la liquidación, o trabajé años y no me pagaron nada. ¿Qué hago?', r: 'Reúna lo que tenga (contrato, desprendibles de pago, mensajes, certificados) y escríbanos. Nos especializamos en recuperar prestaciones sociales; revisamos qué se le debe y cómo reclamarlo. Estos derechos tienen plazos para reclamarse, así que conviene no esperar.' },
    { p: 'Me quiero divorciar y no me dan la firma', r: 'Si no hay acuerdo, el divorcio puede tramitarse ante un juez por las causales que establece la ley, sin la firma de la otra persona. Le explicamos cuál aplica en su caso.' },
    { p: 'Tengo una sanción de la DIAN y no sé qué hacer', r: 'Revise la fecha en que le notificaron: los plazos para responder son cortos. Nuestros contadores revisan el acto y le orientan para responder o corregir.' },
    { p: '¿Cómo hago mi declaración de renta?', r: 'Le ayudamos a revisar si está obligado a declarar, a reunir los documentos y a presentarla, tanto para personas naturales como para empresas.' },
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
