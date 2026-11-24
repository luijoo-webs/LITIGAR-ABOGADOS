/* Datos FICTICIOS para la demostración del panel. Ninguna persona ni caso es real. */
(function () {
  const L = window.LITIGAR;
  const hace = (dias, horas = 0) => new Date(Date.now() - (dias * 24 + horas) * 3600e3).toISOString();
  const pronto = (dias) => new Date(Date.now() + dias * 24 * 3600e3).toISOString().slice(0, 10);

  L.semilla = function () {
    const equipo = [
      { id: 'u1', nombre: 'Administrador (demo)', correo: 'admin@ejemplo.test', rol: 'admin', areas: [] },
      { id: 'u2', nombre: 'Abogado A (demo)', correo: 'abogado.a@ejemplo.test', rol: 'abogado', areas: ['familia', 'civil'] },
      { id: 'u3', nombre: 'Abogada B (demo)', correo: 'abogada.b@ejemplo.test', rol: 'abogado', areas: ['laboral', 'seguridad-social'] },
      { id: 'u4', nombre: 'Contador C (demo)', correo: 'contador.c@ejemplo.test', rol: 'abogado', areas: ['tributario'] },
      { id: 'u5', nombre: 'Asistente D (demo)', correo: 'asistente@ejemplo.test', rol: 'asistente', areas: [] },
    ];
    const base = [
      { nombre: 'Solicitante Ejemplo 1', area: 'laboral', situacion: 'conflicto', tipo: 'natural', ciudad: 'Ciudad de ejemplo', proceso: 'no', urgencia: 'alta', descripcion: 'Texto de ejemplo: me terminaron el contrato sin explicación y no me han pagado la liquidación. Tengo los desprendibles de nómina.', telefono: '300 000 0001', d: 0, h: 2, estado: null },
      { nombre: 'Empresa Ejemplo S.A.S.', area: 'tributario', situacion: 'tramite', tipo: 'empresa', ciudad: 'Ciudad de ejemplo', proceso: 'no', urgencia: 'media', descripcion: 'Texto de ejemplo: recibimos un requerimiento de la DIAN sobre la declaración del año pasado y necesitamos orientación para responder a tiempo.', correo: 'contacto@ejemplo.test', d: 0, h: 6, estado: null },
      { nombre: 'Solicitante Ejemplo 3', area: 'familia', situacion: 'conflicto', tipo: 'natural', ciudad: 'Ciudad de ejemplo', proceso: 'si', urgencia: 'alta', descripcion: 'Texto de ejemplo: tengo audiencia de alimentos la próxima semana y no tengo abogado.', telefono: '300 000 0003', d: 1, estado: 'pendiente', asignado: 'u2' },
      { nombre: 'Solicitante Ejemplo 4', area: 'otra', situacion: 'otra', tipo: 'natural', ciudad: 'Ciudad de ejemplo', proceso: 'no', urgencia: 'baja', descripcion: 'Texto de ejemplo: consulta sobre un tema migratorio.', correo: 'ejemplo4@ejemplo.test', d: 2, estado: null },
      { nombre: 'Solicitante Ejemplo 5', area: 'seguridad-social', situacion: 'tramite', tipo: 'natural', ciudad: 'Ciudad de ejemplo', proceso: 'nose', urgencia: 'media', descripcion: 'Pensión.', telefono: '300 000 0005', d: 3, estado: null },
      { nombre: 'Solicitante Ejemplo 6', area: 'civil', situacion: 'demanda', tipo: 'natural', ciudad: 'Ciudad de ejemplo', proceso: 'si', urgencia: 'alta', descripcion: 'Texto de ejemplo: me notificaron una demanda ejecutiva por una deuda que ya pagué. Tengo los recibos de pago y la notificación.', telefono: '300 000 0006', d: 4, estado: 'calificada', asignado: 'u2' },
      { nombre: 'Solicitante Ejemplo 7', area: 'laboral', situacion: 'asesoria', tipo: 'empresa', ciudad: 'Ciudad de ejemplo', proceso: 'no', urgencia: 'baja', descripcion: 'Texto de ejemplo: somos una empresa pequeña y queremos revisar nuestros contratos laborales y el reglamento interno de trabajo.', correo: 'rrhh@ejemplo.test', d: 6, estado: 'convertida', asignado: 'u3' },
    ];
    const solicitudes = base.map((b, i) => {
      const c = L.clasificar(b, L.reglasBase);
      return Object.assign({}, b, {
        id: `SOL-2026-${String(1040 - i).padStart(5, '0')}`, creada: hace(b.d, b.h || 0), estado: b.estado || c.estadoSugerido,
        puntaje: c.puntaje, prioridad: c.prioridad, asignado: b.asignado || null, archivada: false, origen: 'Sitio web',
        notas: b.estado ? [{ fecha: hace(b.d - 0.5 > 0 ? b.d - 0.5 : 0), autor: 'Administrador (demo)', texto: 'Nota interna de ejemplo.' }] : [],
      });
    });
    const clientes = [
      { id: 'CLI-0001', nombre: 'Empresa Cliente Ejemplo S.A.S.', tipo: 'empresa', documento: 'NIT de ejemplo', contacto: 'rrhh@ejemplo.test', ciudad: 'Ciudad de ejemplo', desde: hace(6), observaciones: 'Cliente ficticio para la demostración.' },
      { id: 'CLI-0002', nombre: 'Cliente Ejemplo 2', tipo: 'natural', documento: 'CC de ejemplo', contacto: '300 000 0010', ciudad: 'Ciudad de ejemplo', desde: hace(40), observaciones: 'Cliente ficticio para la demostración.' },
    ];
    const casos = [
      { id: 'CAS-2026-0012', cliente: 'CLI-0001', responsable: 'u3', area: 'laboral', titulo: 'Revisión de contratos y reglamento interno (ejemplo)', estado: 'activo', abierto: hace(5),
        actividades: [{ fecha: pronto(2), texto: 'Reunión de revisión con el cliente (ejemplo)' }],
        movimientos: [{ fecha: hace(5), texto: 'Caso abierto desde la solicitud SOL-2026-01034' }] },
      { id: 'CAS-2026-0008', cliente: 'CLI-0002', responsable: 'u2', area: 'familia', titulo: 'Proceso de ejemplo de cuota alimentaria', estado: 'en_tramite', abierto: hace(38),
        actividades: [{ fecha: pronto(6), texto: 'Audiencia (ejemplo)' }, { fecha: pronto(1), texto: 'Enviar documentos al despacho (ejemplo)' }],
        movimientos: [{ fecha: hace(38), texto: 'Caso abierto' }, { fecha: hace(20), texto: 'Estado: en trámite' }] },
    ];
    return {
      version: 1, equipo, solicitudes, clientes, casos,
      reglas: JSON.parse(JSON.stringify(L.reglasBase)),
      auditoria: [
        { fecha: hace(0, 2), quien: 'Sitio web', accion: 'Nueva solicitud SOL-2026-01040' },
        { fecha: hace(1), quien: 'Administrador (demo)', accion: 'Asignó SOL-2026-01038 a Abogado A (demo)' },
        { fecha: hace(5), quien: 'Administrador (demo)', accion: 'Convirtió SOL-2026-01034 en el caso CAS-2026-0012' },
      ],
    };
  };
})();
