/* Panel administrativo. Dos modos con la misma interfaz:
   - Conectado: sesión real de Supabase Auth; lee y escribe en Supabase y los permisos los impone RLS.
   - Demostración: datos ficticios en localStorage; nunca toca Supabase. */
(function () {
  const L = window.LITIGAR;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fh = (iso) => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fd = (iso) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const areaNombre = (id) => (L.areas.find((a) => a.id === id) || {}).nombre || (id === 'otra' ? 'Otra área' : id === 'nose' ? 'No sabe' : id);
  const ESTADOS_CASO = { activo: 'Activo', en_tramite: 'En trámite', en_espera: 'En espera', cerrado: 'Cerrado' };

  const C = window.LITIGAR_CONFIG || {};
  const CONFIGURADO = !!(C.supabaseUrl && C.supabaseKey);
  let modo = null, db = null, ses = null; // modo: 'real' | 'demo'
  const guardar = () => { if (modo === 'demo') L.store.guardar(db); };

  // Permisos por rol (mismo criterio que las políticas RLS del esquema).
  const PERMISOS = {
    admin: ['panel', 'solicitudes', 'citas', 'clientes', 'casos', 'equipo', 'contenido', 'clasificacion', 'auditoria', 'convertir', 'asignar'],
    asistente: ['panel', 'solicitudes', 'citas', 'clientes', 'contenido', 'asignar'],
    abogado: ['panel', 'solicitudes', 'citas', 'clientes', 'casos', 'convertir'],
  };
  const ESTADOS_CITA = { pendiente: 'Por confirmar', confirmada: 'Confirmada', reprogramar: 'Reprogramar', atendida: 'Atendida', cancelada: 'Cancelada' };
  const MODALIDAD = { presencial: 'Presencial', videollamada: 'Videollamada', llamada: 'Llamada' };
  const misCitas = () => (db.citas || []).filter((c) => yo.rol !== 'abogado' || c.asignado === yo.id);
  let yo = null;
  const puede = (p) => PERMISOS[yo.rol].includes(p);
  const quien = (id) => (db.equipo.find((u) => u.id === id) || {}).nombre || 'Sin asignar';
  // En modo conectado la auditoría la escriben los triggers de la base de datos.
  const auditar = (accion) => { if (modo !== 'demo') return; db.auditoria.unshift({ fecha: new Date().toISOString(), quien: yo.nombre, accion }); guardar(); };

  /* ===== Supabase (modo conectado). Solo la clave publicable; los permisos los decide RLS. ===== */
  const SES = 'litigar-sesion';
  async function pedir(ruta, opt = {}, token) {
    const r = await fetch(C.supabaseUrl + ruta, Object.assign({}, opt, {
      headers: Object.assign({ apikey: C.supabaseKey, Authorization: 'Bearer ' + (token || C.supabaseKey), 'Content-Type': 'application/json' }, opt.headers) }));
    const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) throw new Error((d && (d.message || d.msg || d.error_description || d.error)) || `Error ${r.status}`);
    return d;
  }
  async function auth(tipo, cuerpo) {
    ses = await pedir('/auth/v1/token?grant_type=' + tipo, { method: 'POST', body: JSON.stringify(cuerpo) });
    try { sessionStorage.setItem(SES, JSON.stringify(ses)); } catch (e) {}
  }
  async function api(ruta, opt) {
    if (ses.expires_at * 1000 < Date.now() + 60000) await auth('refresh_token', { refresh_token: ses.refresh_token });
    return pedir('/rest/v1/' + ruta, opt, ses.access_token);
  }
  async function editar(tabla, id, cambios) {
    const r = await api(`${tabla}?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(cambios) });
    if (!r || !r.length) throw new Error('su rol no tiene permiso para modificar este registro'); // RLS filtra en silencio
  }
  const crear = (tabla, fila) => api(tabla, { method: 'POST', body: JSON.stringify(fila) });

  // Trae todo lo que RLS deja ver a este usuario y lo deja con la misma forma que los datos de demostración.
  async function cargar() {
    const [perf, pesp, sols, notas, clis, casos, acts, movs, reglas, esp, citas] = await Promise.all([
      'perfiles?select=id,nombre,correo,rol&rol=not.is.null&activo=is.true', 'perfil_especialidades?select=*',
      'solicitudes?select=*&order=creada.desc', 'notas_solicitud?select=*&order=creada', 'clientes?select=*&order=creado.desc',
      'casos?select=*&order=abierto.desc', 'actividades_caso?select=*', 'movimientos_caso?select=*&order=creado',
      'reglas_clasificacion?select=config', 'especialidades?select=id,publicada', 'citas?select=*&order=creada.desc'].map((r) => api(r)));
    const aud = yo.rol === 'admin' ? await api('auditoria?select=fecha,tabla,accion,actor_id&order=fecha.desc&limit=200') : [];
    const equipo = perf.map((p) => ({ id: p.id, nombre: p.nombre || p.correo, correo: p.correo, rol: p.rol,
      areas: pesp.filter((x) => x.perfil_id === p.id).map((x) => x.especialidad_id) }));
    const nombre = (id) => !id ? 'Sitio web / sistema' : (equipo.find((u) => u.id === id) || {}).nombre || 'Usuario inactivo';
    const codCli = Object.fromEntries(clis.map((c) => [c.id, c.codigo]));
    const ACC = { INSERT: 'Creó un registro en', UPDATE: 'Modificó un registro en', DELETE: 'Eliminó un registro de' };
    db = {
      equipo,
      solicitudes: sols.map((s) => Object.assign({}, s, { id: s.codigo, uuid: s.id, asignado: s.asignado_a, cliente: codCli[s.cliente_id] || null,
        notas: notas.filter((n) => n.solicitud_id === s.id).map((n) => ({ fecha: n.creada, autor: nombre(n.autor_id), texto: n.texto })) })),
      clientes: clis.map((c) => ({ id: c.codigo, uuid: c.id, nombre: c.nombre, tipo: c.tipo, documento: c.documento || 'Por registrar',
        contacto: c.telefono || c.correo || '—', ciudad: c.ciudad || '—', desde: c.creado, observaciones: c.observaciones })),
      casos: casos.map((c) => ({ id: c.codigo, uuid: c.id, cliente: codCli[c.cliente_id], responsable: c.responsable_id, area: c.especialidad_id,
        titulo: c.titulo, estado: c.estado, abierto: c.abierto,
        actividades: acts.filter((a) => a.caso_id === c.id).map((a) => ({ fecha: a.fecha, texto: a.texto })),
        movimientos: movs.filter((m) => m.caso_id === c.id).map((m) => ({ fecha: m.creado, texto: m.texto })) })),
      citas: citas.map((c) => Object.assign({}, c, { id: c.codigo, uuid: c.id, asignado: c.asignado_a })),
      auditoria: aud.map((a) => ({ fecha: a.fecha, quien: nombre(a.actor_id), accion: `${ACC[a.accion] || a.accion} ${a.tabla}` })),
      // Las áreas atendidas en la base de datos son las especialidades publicadas.
      reglas: Object.assign({}, (reglas[0] || {}).config, { areasAtendidas: esp.filter((e) => e.publicada).map((e) => e.id) }),
    };
  }

  // Ejecuta un cambio en el modo activo, recarga si es real y vuelve a pintar.
  async function hacer(ok, demo, real, despues) {
    let r;
    if (modo === 'real') {
      try { r = await real(); } catch (e) { toast('No se guardó: ' + e.message); despues(); return; }
      try { await cargar(); } catch (e) { toast('Guardado, pero no se pudo recargar: ' + e.message); return; }
    } else { r = demo(); guardar(); }
    nav(); toast(typeof ok === 'function' ? ok(r) : ok); despues();
  }
  const misSolicitudes = () => db.solicitudes.filter((s) => yo.rol !== 'abogado' || s.asignado === yo.id);
  const misCasos = () => db.casos.filter((c) => yo.rol !== 'abogado' || c.responsable === yo.id);

  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('ver'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('ver'), 2600); }

  const MODULOS = [
    ['panel', 'Panel', '◧'], ['solicitudes', 'Solicitudes', '✉'], ['citas', 'Citas', '◷'], ['clientes', 'Clientes', '◉'], ['casos', 'Casos', '⚖'],
    ['equipo', 'Equipo', '☷'], ['contenido', 'Contenido', '✎'], ['clasificacion', 'Clasificación', '⚙'], ['auditoria', 'Auditoría', '☰'],
  ];
  let actual = 'panel';

  function nav() {
    const cuentas = { solicitudes: misSolicitudes().filter((s) => s.estado === 'nueva' && !s.archivada).length,
      citas: misCitas().filter((c) => c.estado === 'pendiente').length };
    $('#nav').innerHTML = MODULOS.filter(([k]) => puede(k)).map(([k, t, i]) =>
      `<button data-mod="${k}" ${k === actual ? 'aria-current="page"' : ''}><span class="ico" aria-hidden="true">${i}</span>${t}${cuentas[k] ? `<span class="cuenta">${cuentas[k]}</span>` : ''}</button>`).join('');
  }
  function ir(mod) {
    if (!puede(mod)) mod = 'panel';
    actual = mod; nav();
    $('#titulo').textContent = MODULOS.find((m) => m[0] === mod)[1];
    VISTAS[mod]($('#vista'));
    $('#vista').focus({ preventScroll: true });
    $('#lateral').classList.remove('abierto');
    try { sessionStorage.setItem('litigar-mod', mod); } catch (e) {}
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-mod]'); if (b) ir(b.dataset.mod); });

  // Detalle lateral
  const detalle = $('#detalle'), velo = $('#velo');
  function abrir(html) { $('#detalleCuerpo').innerHTML = html; detalle.classList.add('abierto'); detalle.setAttribute('aria-hidden', 'false'); velo.hidden = false; setTimeout(() => $('#cerrarDetalle').focus(), 30); }
  function cerrar() { detalle.classList.remove('abierto'); detalle.setAttribute('aria-hidden', 'true'); velo.hidden = true; }
  $('#cerrarDetalle').addEventListener('click', cerrar); velo.addEventListener('click', cerrar);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });

  const chipEstado = (e) => `<span class="chip est-${e}">${esc(L.estados[e])}</span>`;
  const chipPrio = (p) => `<span class="chip prio-${p}">${p[0].toUpperCase() + p.slice(1)}</span>`;
  const anillo = (p) => `<span class="puntaje" style="--p:${p};--c:${p >= 70 ? 'var(--ok)' : p >= 45 ? 'var(--alerta)' : '#8D99AE'}" title="Puntuación de prioridad, no evaluación jurídica"><span>${p}</span></span>`;

  /* ===== Vistas ===== */
  const VISTAS = {};

  VISTAS.panel = (v) => {
    const sol = misSolicitudes().filter((s) => !s.archivada), casos = misCasos();
    const cuenta = (e) => sol.filter((s) => s.estado === e).length;
    const kpis = [
      ['Nuevas solicitudes', cuenta('nueva'), 'var(--info)'], ['Pendientes de revisión', cuenta('pendiente'), 'var(--alerta)'],
      ['Requieren evaluación', cuenta('requiere_evaluacion'), '#D97706'], ['Citas por confirmar', misCitas().filter((c) => c.estado === 'pendiente').length, '#9C6ADE'],
      ['Clientes registrados', db.clientes.length, 'var(--oro)'], ['Casos activos', casos.filter((c) => c.estado !== 'cerrado').length, 'var(--azul-800)'],
    ];
    const max = Math.max(1, ...Object.keys(L.estados).map(cuenta));
    const proximas = casos.flatMap((c) => c.actividades.map((a) => Object.assign({ caso: c.id }, a))).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);
    const urgentes = sol.filter((s) => s.prioridad === 'alta' && ['nueva', 'pendiente', 'requiere_evaluacion'].includes(s.estado));
    v.innerHTML = `
      ${yo.rol === 'abogado' ? '<p class="aviso">Vista de abogado: solo ve las solicitudes y los casos que tiene asignados.</p>' : ''}
      <div class="kpis">${kpis.map(([l, n, c]) => `<div class="kpi" style="--c:${c}"><div class="v">${n}</div><div class="l">${l}</div></div>`).join('')}</div>
      <div class="rejilla">
        <section class="tarjeta"><h2>Solicitudes urgentes sin resolver <button class="btn btn-borde" data-mod-ir="solicitudes">Ver todas</button></h2>
          ${urgentes.length ? `<ul class="lista-simple">${urgentes.map((s) => `<li data-sol="${s.id}" style="cursor:pointer"><time>${fh(s.creada)}</time><span><strong>${esc(s.nombre)}</strong> · ${esc(areaNombre(s.area))}<span class="sub-linea">${esc(L.estados[s.estado])}</span></span></li>`).join('')}</ul>` : '<p class="vacio">No hay solicitudes urgentes pendientes.</p>'}</section>
        <section class="tarjeta"><h2>Bandeja por estado</h2><div class="embudo">${Object.entries(L.estados).map(([k, t]) =>
          `<div class="embudo-fila"><span>${t}</span><div class="embudo-barra"><span class="est-${k}" style="width:${(cuenta(k) / max) * 100}%;background:var(--c)"></span></div><strong>${cuenta(k)}</strong></div>`).join('')}</div></section>
        <section class="tarjeta"><h2>Próximas actividades</h2>${proximas.length ? `<ul class="lista-simple">${proximas.map((a) => `<li><time>${fd(a.fecha)}</time><span>${esc(a.texto)}<span class="sub-linea">${a.caso}</span></span></li>`).join('')}</ul>` : '<p class="vacio">Sin actividades programadas.</p>'}</section>
        <section class="tarjeta"><h2>Actividad reciente</h2>${db.auditoria.length ? `<ul class="lista-simple">${db.auditoria.slice(0, 6).map((a) => `<li><time>${fh(a.fecha)}</time><span>${esc(a.accion)}<span class="sub-linea">${esc(a.quien)}</span></span></li>`).join('')}</ul>` : '<p class="vacio">El registro de actividad solo lo ve el administrador.</p>'}</section>
      </div>`;
    v.onclick = (e) => { const s = e.target.closest('[data-sol]'); if (s) detalleSolicitud(s.dataset.sol); const m = e.target.closest('[data-mod-ir]'); if (m) ir(m.dataset.modIr); };
  };

  // Solicitudes
  const filtro = { q: '', area: '', prio: '', estado: '', archivadas: false };
  VISTAS.solicitudes = (v) => {
    v.innerHTML = `<div class="herramientas">
      <input type="search" id="fq" placeholder="Buscar por nombre o código (SOL-…)" value="${esc(filtro.q)}" aria-label="Buscar">
      <select id="farea" aria-label="Área"><option value="">Todas las áreas</option>${L.areas.map((a) => `<option value="${a.id}">${a.nombre}</option>`).join('')}<option value="otra">Otra</option><option value="nose">No sabe</option></select>
      <select id="fprio" aria-label="Prioridad"><option value="">Toda prioridad</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select>
      <select id="festado" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(L.estados).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>
      <label style="font-size:.84rem;display:flex;gap:6px;align-items:center"><input type="checkbox" id="farch" ${filtro.archivadas ? 'checked' : ''}> Archivadas</label>
      <span class="resultado" id="fres"></span></div>
      <div class="tabla-envoltura"><table><thead><tr><th>Solicitud</th><th>Área</th><th class="ocultar-movil">Prioridad</th><th>Estado</th><th class="ocultar-movil">Puntaje</th><th class="ocultar-movil">Asignado</th></tr></thead><tbody id="filas"></tbody></table></div>`;
    ['area', 'prio', 'estado'].forEach((k) => ($('#f' + k).value = filtro[k]));
    const pintar = () => {
      const q = filtro.q.toLowerCase();
      const filas = misSolicitudes().filter((s) => s.archivada === filtro.archivadas
        && (!q || s.nombre.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
        && (!filtro.area || s.area === filtro.area) && (!filtro.prio || s.prioridad === filtro.prio) && (!filtro.estado || s.estado === filtro.estado))
        .sort((a, b) => b.puntaje - a.puntaje || b.creada.localeCompare(a.creada));
      $('#fres').textContent = `${filas.length} solicitud${filas.length === 1 ? '' : 'es'} · ordenadas por puntaje`;
      $('#filas').innerHTML = filas.length ? filas.map((s) => `<tr data-sol="${s.id}" tabindex="0"><td><span class="nombre">${esc(s.nombre)}</span><span class="sub-linea"><span class="cod">${s.id}</span> · ${fh(s.creada)}</span></td>
        <td>${esc(areaNombre(s.area))}</td><td class="ocultar-movil">${chipPrio(s.prioridad)}</td><td>${chipEstado(s.estado)}</td><td class="ocultar-movil">${anillo(s.puntaje)}</td><td class="ocultar-movil">${esc(quien(s.asignado))}</td></tr>`).join('')
        : '<tr><td colspan="6" class="vacio" style="text-align:center">No hay solicitudes con estos filtros.</td></tr>';
    };
    $('#fq').addEventListener('input', (e) => { filtro.q = e.target.value; pintar(); });
    [['farea', 'area'], ['fprio', 'prio'], ['festado', 'estado']].forEach(([id, k]) => $('#' + id).addEventListener('change', (e) => { filtro[k] = e.target.value; pintar(); }));
    $('#farch').addEventListener('change', (e) => { filtro.archivadas = e.target.checked; pintar(); });
    $('#filas').addEventListener('click', (e) => { const r = e.target.closest('[data-sol]'); if (r) detalleSolicitud(r.dataset.sol); });
    $('#filas').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const r = e.target.closest('[data-sol]'); if (r) detalleSolicitud(r.dataset.sol); } });
    pintar();
  };

  function desglose(s) {
    const r = db.reglas, p = r.pesos;
    const largo = (s.descripcion || '').trim().length;
    return [
      ['Área atendida por la firma', r.areasAtendidas.includes(s.area) ? p.area : 0, p.area],
      ['Urgencia', Math.round(p.urgencia * (r.urgencia[s.urgencia] || 0)), p.urgencia],
      ['Proceso en curso', Math.round(p.proceso * (r.proceso[s.proceso] || 0)), p.proceso],
      ['Descripción suficiente', Math.round(p.descripcion * Math.min(1, largo / r.minDescripcion)), p.descripcion],
      ['Datos de contacto', s.telefono || s.correo ? p.contacto : 0, p.contacto],
    ];
  }

  function detalleSolicitud(id) {
    const s = db.solicitudes.find((x) => x.id === id);
    if (!s) return;
    const A = L.asistente;
    const t = (lista, k) => (lista.find((x) => x.id === k) || {}).t || k;
    const sugeridos = db.equipo.filter((u) => u.rol === 'abogado' && u.areas.includes(s.area));
    abrir(`<div class="det-cabeza"><span class="cod">${s.id} · ${esc(s.origen)} · ${fh(s.creada)}</span><h2>${esc(s.nombre)}</h2>${chipEstado(s.estado)} ${chipPrio(s.prioridad)} ${s.archivada ? '<span class="chip">Archivada</span>' : ''}</div>
      <dl class="det-grid">
        <div><dt>Área</dt><dd>${esc(areaNombre(s.area))}</dd></div><div><dt>Situación</dt><dd>${esc(t(A.situaciones, s.situacion))}</dd></div>
        <div><dt>Tipo</dt><dd>${s.tipo === 'empresa' ? 'Empresa' : 'Persona natural'}</dd></div><div><dt>Ciudad</dt><dd>${esc(s.ciudad)}</dd></div>
        <div><dt>Proceso en curso</dt><dd>${esc(t(A.procesos, s.proceso))}</dd></div><div><dt>Urgencia</dt><dd>${esc(t(A.urgencias, s.urgencia))}</dd></div>
        <div><dt>Teléfono</dt><dd>${esc(s.telefono || '—')}</dd></div><div><dt>Correo</dt><dd>${esc(s.correo || '—')}</dd></div>
      </dl>
      <div class="det-texto">${esc(s.descripcion)}</div>
      <div class="det-seccion"><h3>Clasificación automática · ${anillo(s.puntaje)}</h3>
        <ul class="desglose">${desglose(s).map(([n, v, m]) => `<li><span>${n}</span><strong>${v} / ${m}</strong></li>`).join('')}</ul>
        <p class="explica">La puntuación solo ordena la bandeja según las reglas configuradas. No es una evaluación jurídica ni decide si la firma acepta el caso: eso lo define una persona del equipo.</p></div>
      <div class="det-seccion"><h3>Gestión</h3><div class="acciones">
        <label>Estado<select id="dEstado">${Object.entries(L.estados).filter(([k]) => k !== 'convertida' || s.estado === 'convertida').map(([k, v]) => `<option value="${k}" ${k === s.estado ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Asignado a<select id="dAsig" ${puede('asignar') ? '' : 'disabled'}><option value="">Sin asignar</option>${db.equipo.filter((u) => u.rol === 'abogado').map((u) => `<option value="${u.id}" ${u.id === s.asignado ? 'selected' : ''}>${esc(u.nombre)}${sugeridos.includes(u) ? ' · sugerido' : ''}</option>`).join('')}</select></label>
      </div>
      <div class="botonera">
        ${puede('convertir') && s.estado !== 'convertida' ? '<button class="btn btn-oro" id="dConvertir">Convertir en cliente y caso</button>' : ''}
        <button class="btn btn-borde" id="dArchivar">${s.archivada ? 'Desarchivar' : 'Archivar'}</button>
      </div></div>
      <div class="det-seccion"><h3>Notas internas</h3>
        <div id="dNotas">${s.notas.length ? s.notas.map((n) => `<div class="nota"><small>${esc(n.autor)} · ${fh(n.fecha)}</small>${esc(n.texto)}</div>`).join('') : '<p class="vacio">Sin notas.</p>'}</div>
        <form class="nota-form" id="dNotaForm"><textarea id="dNota" maxlength="1000" placeholder="Escriba una nota visible solo para el equipo"></textarea><button class="btn btn-primario" type="submit">Añadir nota</button></form></div>`);
    const tras = () => { VISTAS[actual]($('#vista')); detalleSolicitud(id); };
    $('#dEstado').addEventListener('change', (e) => {
      const a = s.estado, n = e.target.value;
      hacer('Estado actualizado', () => { s.estado = n; auditar(`Cambió ${s.id}: ${L.estados[a]} → ${L.estados[n]}`); },
        () => editar('solicitudes', s.uuid, { estado: n }), tras);
    });
    $('#dAsig').addEventListener('change', (e) => {
      const u = e.target.value || null;
      hacer('Asignación guardada', () => { s.asignado = u; if (u && s.estado === 'nueva') s.estado = 'pendiente'; auditar(`Asignó ${s.id} a ${quien(u)}`); },
        () => editar('solicitudes', s.uuid, { asignado_a: u }), tras);
    });
    $('#dArchivar').addEventListener('click', () => {
      const v = !s.archivada;
      hacer(v ? 'Solicitud archivada' : 'Solicitud restaurada', () => { s.archivada = v; auditar(`${v ? 'Archivó' : 'Desarchivó'} ${s.id}`); },
        () => editar('solicitudes', s.uuid, { archivada: v }), tras);
    });
    $('#dNotaForm').addEventListener('submit', (e) => {
      e.preventDefault(); const tx = $('#dNota').value.trim(); if (!tx) return;
      hacer('Nota añadida', () => { s.notas.push({ fecha: new Date().toISOString(), autor: yo.nombre, texto: tx }); auditar(`Añadió una nota a ${s.id}`); },
        () => crear('notas_solicitud', { solicitud_id: s.uuid, texto: tx }), tras);
    });
    const conv = $('#dConvertir');
    if (conv) conv.addEventListener('click', () => {
      conv.disabled = true;
      hacer((r) => r, () => {
        const cli = { id: `CLI-${String(db.clientes.length + 1).padStart(4, '0')}`, nombre: s.nombre, tipo: s.tipo, documento: 'Por registrar', contacto: s.telefono || s.correo, ciudad: s.ciudad, desde: new Date().toISOString(), observaciones: '' };
        const caso = { id: `CAS-${new Date().getFullYear()}-${String(db.casos.length + 13).padStart(4, '0')}`, cliente: cli.id, responsable: s.asignado || (sugeridos[0] || {}).id || null, area: s.area,
          titulo: `Caso desde ${s.id}`, estado: 'activo', abierto: new Date().toISOString(), actividades: [], movimientos: [{ fecha: new Date().toISOString(), texto: `Caso abierto desde la solicitud ${s.id}` }] };
        db.clientes.unshift(cli); db.casos.unshift(caso); s.estado = 'convertida'; s.cliente = cli.id;
        auditar(`Convirtió ${s.id} en el cliente ${cli.id} y el caso ${caso.id}`); return `Creados ${cli.id} y ${caso.id}`;
      }, async () => `Creado el caso ${await api('rpc/convertir_solicitud', { method: 'POST', body: JSON.stringify({ p_solicitud: s.uuid }) })} con su cliente`, tras);
    });
  }

  // Citas (formulario "Agendar cita" del sitio)
  const chipCita = (e) => `<span class="chip cita-${e}">${ESTADOS_CITA[e] || e}</span>`;
  const preferencia = (c) => c.fecha_preferida ? `${fd(c.fecha_preferida)}${c.franja ? ` · ${c.franja === 'manana' ? 'mañana' : 'tarde'}` : ''}` : 'Sin preferencia';
  const filtroCita = { estado: 'activas' };
  VISTAS.citas = (v) => {
    v.innerHTML = `<p class="aviso">La fecha que elige el visitante es una preferencia. La cita queda confirmada cuando el equipo le contacta y marca aquí el estado "Confirmada".</p>
      <div class="herramientas"><select id="ceFiltro" aria-label="Estado"><option value="activas">Por confirmar y reprogramar</option><option value="">Todas</option>${Object.entries(ESTADOS_CITA).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select><span class="resultado" id="ceRes"></span></div>
      <div class="tabla-envoltura"><table><thead><tr><th>Solicitante</th><th class="ocultar-movil">Áreas</th><th>Modalidad</th><th class="ocultar-movil">Preferencia</th><th>Estado</th></tr></thead><tbody id="ceFilas"></tbody></table></div>`;
    $('#ceFiltro').value = filtroCita.estado;
    const pintar = () => {
      const f = filtroCita.estado;
      const filas = misCitas().filter((c) => !f || (f === 'activas' ? ['pendiente', 'reprogramar'].includes(c.estado) : c.estado === f));
      $('#ceRes').textContent = `${filas.length} cita${filas.length === 1 ? '' : 's'}`;
      $('#ceFilas').innerHTML = filas.length ? filas.map((c) => `<tr data-cita="${c.id}" tabindex="0"><td><span class="nombre">${esc(c.nombre)} ${esc(c.apellido)}</span><span class="sub-linea"><span class="cod">${c.id}</span> · ${fh(c.creada)}</span></td>
        <td class="ocultar-movil">${c.areas.length ? c.areas.map((a) => esc(areaNombre(a))).join(', ') : '—'}</td><td>${MODALIDAD[c.modalidad] || '—'}</td><td class="ocultar-movil">${preferencia(c)}</td><td>${chipCita(c.estado)}</td></tr>`).join('')
        : '<tr><td colspan="5" class="vacio" style="text-align:center">No hay solicitudes de cita con este filtro.</td></tr>';
    };
    $('#ceFiltro').addEventListener('change', (e) => { filtroCita.estado = e.target.value; pintar(); });
    $('#ceFilas').addEventListener('click', (e) => { const r = e.target.closest('[data-cita]'); if (r) detalleCita(r.dataset.cita); });
    $('#ceFilas').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const r = e.target.closest('[data-cita]'); if (r) detalleCita(r.dataset.cita); } });
    pintar();
  };
  function detalleCita(id) {
    const c = (db.citas || []).find((x) => x.id === id);
    if (!c) return;
    const local = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    abrir(`<div class="det-cabeza"><span class="cod">${c.id} · ${fh(c.creada)}</span><h2>${esc(c.nombre)} ${esc(c.apellido)}</h2>${chipCita(c.estado)}</div>
      <dl class="det-grid">
        <div><dt>Teléfono</dt><dd><a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a></dd></div><div><dt>Correo</dt><dd><a href="mailto:${esc(c.correo)}">${esc(c.correo)}</a></dd></div>
        <div><dt>Modalidad</dt><dd>${MODALIDAD[c.modalidad] || '—'}</dd></div><div><dt>Preferencia</dt><dd>${preferencia(c)}</dd></div>
        <div style="grid-column:1/-1"><dt>Áreas de interés</dt><dd>${c.areas.length ? c.areas.map((a) => esc(areaNombre(a))).join(', ') : 'No indicó'}</dd></div>
      </dl>
      <div class="det-texto">${c.mensaje ? esc(c.mensaje) : '<span class="vacio">Sin mensaje.</span>'}</div>
      <form class="det-seccion" id="ctForm"><h3>Gestión</h3><div class="acciones">
        <label>Estado<select id="ctEstado">${Object.entries(ESTADOS_CITA).map(([k, t]) => `<option value="${k}" ${k === c.estado ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Fecha y hora confirmadas<input type="datetime-local" id="ctFecha" value="${local(c.fecha_confirmada)}"></label>
        <label>Atiende<select id="ctAsig" ${puede('asignar') ? '' : 'disabled'}><option value="">Sin asignar</option>${db.equipo.filter((u) => u.rol === 'abogado' || u.rol === 'admin').map((u) => `<option value="${u.id}" ${u.id === c.asignado ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select></label>
      </div>
      <label class="ancho" style="display:grid;gap:6px;margin-top:12px;font-size:.8rem;font-weight:700">Notas internas<textarea id="ctNotas" maxlength="2000" rows="3">${esc(c.notas || '')}</textarea></label>
      <div class="botonera"><button class="btn btn-primario">Guardar cambios</button></div></form>`);
    $('#ctForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const estado = $('#ctEstado').value, fv = $('#ctFecha').value, fecha = fv ? new Date(fv).toISOString() : null, asig = $('#ctAsig').value || null, notas = $('#ctNotas').value.trim();
      if (estado === 'confirmada' && !fecha) { toast('Indique la fecha y hora confirmadas'); return; }
      hacer('Cita actualizada', () => {
        Object.assign(c, { estado, fecha_confirmada: fecha, asignado: asig, notas }); auditar(`Actualizó la cita ${c.id}: ${ESTADOS_CITA[estado]}`);
      }, () => editar('citas', c.uuid, Object.assign({ estado, fecha_confirmada: fecha, notas }, puede('asignar') ? { asignado_a: asig } : {})),
      () => { VISTAS[actual]($('#vista')); detalleCita(id); });
    });
  }

  // Clientes
  VISTAS.clientes = (v) => {
    const ids = yo.rol === 'abogado' ? new Set(misCasos().map((c) => c.cliente)) : null;
    const lista = db.clientes.filter((c) => !ids || ids.has(c.id));
    v.innerHTML = `<div class="herramientas"><input type="search" id="cq" placeholder="Buscar cliente" aria-label="Buscar cliente"><span class="resultado">${lista.length} clientes</span></div>
      <div class="tabla-envoltura"><table><thead><tr><th>Cliente</th><th>Tipo</th><th class="ocultar-movil">Contacto</th><th>Casos</th><th class="ocultar-movil">Desde</th></tr></thead><tbody id="cfilas"></tbody></table></div>`;
    const pintar = (q = '') => ($('#cfilas').innerHTML = lista.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase())).map((c) =>
      `<tr data-cli="${c.id}" tabindex="0"><td><span class="nombre">${esc(c.nombre)}</span><span class="sub-linea cod">${c.id}</span></td><td>${c.tipo === 'empresa' ? 'Empresa' : 'Persona natural'}</td>
      <td class="ocultar-movil">${esc(c.contacto)}</td><td>${db.casos.filter((k) => k.cliente === c.id).length}</td><td class="ocultar-movil">${fd(c.desde)}</td></tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin clientes.</td></tr>');
    $('#cq').addEventListener('input', (e) => pintar(e.target.value));
    $('#cfilas').addEventListener('click', (e) => { const r = e.target.closest('[data-cli]'); if (r) detalleCliente(r.dataset.cli); });
    pintar();
  };
  function detalleCliente(id) {
    const c = db.clientes.find((x) => x.id === id);
    const casos = db.casos.filter((k) => k.cliente === id), sols = db.solicitudes.filter((s) => s.cliente === id);
    abrir(`<div class="det-cabeza"><span class="cod">${c.id} · cliente desde ${fd(c.desde)}</span><h2>${esc(c.nombre)}</h2></div>
      <dl class="det-grid"><div><dt>Tipo</dt><dd>${c.tipo === 'empresa' ? 'Empresa' : 'Persona natural'}</dd></div><div><dt>Documento</dt><dd>${esc(c.documento)}</dd></div>
      <div><dt>Contacto</dt><dd>${esc(c.contacto)}</dd></div><div><dt>Ciudad</dt><dd>${esc(c.ciudad)}</dd></div></dl>
      <div class="det-seccion"><h3>Casos asociados</h3>${casos.length ? `<ul class="lista-simple">${casos.map((k) => `<li><span class="cod">${k.id}</span><span>${esc(k.titulo)} · ${ESTADOS_CASO[k.estado]}</span></li>`).join('')}</ul>` : '<p class="vacio">Sin casos.</p>'}</div>
      <div class="det-seccion"><h3>Solicitudes asociadas</h3>${sols.length ? `<ul class="lista-simple">${sols.map((s) => `<li><span class="cod">${s.id}</span><span>${esc(areaNombre(s.area))}</span></li>`).join('')}</ul>` : '<p class="vacio">Sin solicitudes vinculadas.</p>'}</div>
      <div class="det-seccion"><h3>Documentos autorizados</h3><p class="explica">En producción, los documentos se guardan en un almacenamiento privado de Supabase y solo los ven el responsable del caso y el administrador, mediante enlaces temporales. Esta función todavía no está activa en el panel.</p></div>
      <div class="det-seccion"><h3>Observaciones</h3><form class="nota-form" id="obsForm"><textarea id="obs" maxlength="2000">${esc(c.observaciones)}</textarea><button class="btn btn-primario">Guardar observaciones</button></form></div>`);
    $('#obsForm').addEventListener('submit', (e) => {
      e.preventDefault(); const tx = $('#obs').value.trim();
      hacer('Observaciones guardadas', () => { c.observaciones = tx; auditar(`Actualizó observaciones de ${c.id}`); },
        () => editar('clientes', c.uuid, { observaciones: tx }), () => detalleCliente(id));
    });
  }

  // Casos (tablero)
  VISTAS.casos = (v) => {
    const casos = misCasos();
    v.innerHTML = `<p class="aviso">Cada cambio de estado registra un movimiento en el historial del caso${modo === 'real' ? ' (lo escribe un trigger de la base de datos)' : ''}.</p>
      <div class="tablero">${Object.entries(ESTADOS_CASO).map(([k, t]) => { const cs = casos.filter((c) => c.estado === k); return `<div class="columna"><h3>${t}<span>${cs.length}</span></h3>${cs.map((c) =>
        `<article class="caso" data-caso="${c.id}" tabindex="0"><span class="cod">${c.id}</span><strong>${esc(c.titulo)}</strong><span class="chip">${esc(areaNombre(c.area))}</span>
        <div class="meta"><span>${esc(quien(c.responsable))}</span><span>${c.actividades.length} act.</span></div></article>`).join('') || '<p class="vacio">Sin casos</p>'}</div>`; }).join('')}</div>`;
    v.onclick = (e) => { const c = e.target.closest('[data-caso]'); if (c) detalleCaso(c.dataset.caso); };
  };
  function detalleCaso(id) {
    const c = db.casos.find((x) => x.id === id), cli = db.clientes.find((x) => x.id === c.cliente) || {};
    abrir(`<div class="det-cabeza"><span class="cod">${c.id} · abierto el ${fd(c.abierto)}</span><h2>${esc(c.titulo)}</h2><span class="chip">${ESTADOS_CASO[c.estado]}</span></div>
      <dl class="det-grid"><div><dt>Cliente</dt><dd>${esc(cli.nombre)}</dd></div><div><dt>Responsable</dt><dd>${esc(quien(c.responsable))}</dd></div><div><dt>Área</dt><dd>${esc(areaNombre(c.area))}</dd></div></dl>
      <div class="det-seccion"><h3>Estado</h3><div class="acciones"><label>Cambiar estado<select id="cEstado">${Object.entries(ESTADOS_CASO).map(([k, t]) => `<option value="${k}" ${k === c.estado ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div></div>
      <div class="det-seccion"><h3>Próximas actividades</h3>${c.actividades.length ? `<ul class="lista-simple">${c.actividades.sort((a, b) => a.fecha.localeCompare(b.fecha)).map((a) => `<li><time>${fd(a.fecha)}</time><span>${esc(a.texto)}</span></li>`).join('')}</ul>` : '<p class="vacio">Sin actividades.</p>'}
        <form class="form-grid" id="actForm" style="margin-top:10px"><label>Fecha<input type="date" id="aFecha" required></label><label>Actividad<input id="aTexto" maxlength="200" required></label><button class="btn btn-primario ancho">Añadir actividad</button></form></div>
      <div class="det-seccion"><h3>Historial de movimientos</h3><ul class="linea-tiempo">${[...c.movimientos].reverse().map((m) => `<li><time>${fh(m.fecha)}</time>${esc(m.texto)}</li>`).join('')}</ul></div>`);
    const tras = () => { VISTAS[actual]($('#vista')); detalleCaso(id); };
    $('#cEstado').addEventListener('change', (e) => {
      const a = c.estado, n = e.target.value;
      hacer('Estado del caso actualizado', () => {
        c.estado = n; c.movimientos.push({ fecha: new Date().toISOString(), texto: `Estado: ${ESTADOS_CASO[a]} → ${ESTADOS_CASO[n]} (${yo.nombre})` });
        auditar(`Cambió el estado de ${c.id} a ${ESTADOS_CASO[n]}`);
      }, () => editar('casos', c.uuid, { estado: n }), tras);
    });
    $('#actForm').addEventListener('submit', (e) => {
      e.preventDefault(); const f = $('#aFecha').value, tx = $('#aTexto').value.trim();
      hacer('Actividad añadida', () => {
        c.actividades.push({ fecha: f, texto: tx }); c.movimientos.push({ fecha: new Date().toISOString(), texto: `Actividad programada: ${tx}` });
        auditar(`Programó una actividad en ${c.id}`);
      }, async () => {
        await crear('actividades_caso', { caso_id: c.uuid, fecha: f, texto: tx });
        await crear('movimientos_caso', { caso_id: c.uuid, texto: `Actividad programada: ${tx}` });
      }, tras);
    });
  }

  // Equipo
  VISTAS.equipo = (v) => {
    const filasPerm = [['Ver panel', 'panel'], ['Ver solicitudes', 'solicitudes'], ['Asignar solicitudes', 'asignar'], ['Convertir en cliente y caso', 'convertir'], ['Ver casos', 'casos'], ['Gestionar equipo', 'equipo'], ['Editar contenido', 'contenido'], ['Configurar clasificación', 'clasificacion'], ['Ver auditoría', 'auditoria']];
    v.innerHTML = `<div class="personas">${db.equipo.map((u) => `<article class="persona"><div class="avatar">${esc(u.nombre[0])}</div><h3>${esc(u.nombre)}</h3><p>${esc(u.correo)}</p>
      <div class="etiquetas"><span>${u.rol === 'admin' ? 'Administrador' : u.rol === 'abogado' ? 'Abogado' : 'Asistente'}</span>${u.areas.map((a) => `<span>${esc(areaNombre(a))}</span>`).join('')}</div></article>`).join('')}</div>
      <div class="rejilla" style="margin-top:18px">
        <section class="tarjeta"><h2>Añadir integrante</h2>${modo === 'real'
          ? `<p class="explica" style="margin-top:0">Invitar desde el panel necesita una función del servidor (Edge Function) que todavía no está implementada. Por ahora:</p>
          <ol class="explica"><li>Invite a la persona en Supabase → Authentication → Users.</li><li>Asígnele el rol en el editor SQL:<br><code>update public.perfiles set rol = 'abogado', activo = true where correo = '…';</code></li></ol>`
          : `<p class="explica" style="margin-top:0">En la demostración solo se añade a la lista local de este navegador.</p>
          <form class="form-grid" id="uForm"><label>Nombre<input id="uNombre" required maxlength="80"></label><label>Correo<input id="uCorreo" type="email" required maxlength="120"></label>
          <label>Rol<select id="uRol"><option value="abogado">Abogado</option><option value="asistente">Asistente</option><option value="admin">Administrador</option></select></label>
          <div class="ancho"><span style="font-size:.8rem;font-weight:700;color:var(--gris)">Especialidades</span><div class="areas-check">${L.areas.map((a) => `<label><input type="checkbox" value="${a.id}"> ${a.corto}</label>`).join('')}</div></div>
          <button class="btn btn-primario ancho">Añadir</button></form>`}</section>
        <section class="tarjeta"><h2>Permisos por rol</h2><div class="tabla-envoltura" style="border:0"><table class="permisos"><thead><tr><th>Permiso</th><th>Admin.</th><th>Abogado</th><th>Asistente</th></tr></thead><tbody>
          ${filasPerm.map(([t, k]) => `<tr><td>${t}</td>${['admin', 'abogado', 'asistente'].map((r) => PERMISOS[r].includes(k) ? '<td class="si">✓</td>' : '<td class="no">—</td>').join('')}</tr>`).join('')}</tbody></table></div>
          <p class="explica">Los abogados solo ven sus solicitudes y casos asignados. Estas reglas se aplican en la base de datos (RLS), no solo en la interfaz.</p></section>
      </div>`;
    if (modo === 'demo') $('#uForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = { id: 'u' + Date.now(), nombre: $('#uNombre').value.trim(), correo: $('#uCorreo').value.trim(), rol: $('#uRol').value, areas: $$('.areas-check input:checked', e.target).map((i) => i.value) };
      db.equipo.push(u); auditar(`Añadió a ${u.nombre} como ${u.rol}`); toast('Integrante añadido (solo en la demostración)'); VISTAS.equipo(v);
    });
  };

  // Contenido
  let pestana = 'areas';
  VISTAS.contenido = (v) => {
    if (modo === 'real') {
      v.innerHTML = '<p class="aviso oro">La edición de contenido desde el panel todavía no está conectada a Supabase. Por ahora el sitio público toma sus textos de <code>assets/js/datos.js</code> y los cambios se hacen allí.</p>';
      return;
    }
    db.contenido = db.contenido || {};
    const tabs = [['areas', 'Áreas de práctica'], ['equipo', 'Equipo público'], ['articulos', 'Artículos'], ['faqs', 'Preguntas frecuentes'], ['contacto', 'Contacto']];
    const datos = { areas: L.areas, equipo: L.equipo, articulos: L.articulos, faqs: L.faqs };
    let html = `<p class="aviso oro">Los cambios se guardan en este navegador y se ven en el sitio al recargarlo. En producción se guardan en Supabase y se publican para todos los visitantes.</p>
      <div class="pestanas" role="tablist">${tabs.map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${k === pestana}">${t}</button>`).join('')}</div><div class="tarjeta">`;
    const campo = (i, k, label, val, area) => `<label class="${area ? 'ancho' : ''}">${label}${area ? `<textarea data-i="${i}" data-k="${k}" rows="3">${esc(val)}</textarea>` : `<input data-i="${i}" data-k="${k}" value="${esc(val)}">`}</label>`;
    if (pestana === 'contacto') {
      html += `<form class="form-grid" id="contForm">${Object.entries(L.contacto).filter(([k]) => !['nombre', 'lema'].includes(k)).map(([k, val]) => `<label>${k}<input data-k="${k}" value="${esc(Array.isArray(val) ? val.join(', ') : val)}"></label>`).join('')}<button class="btn btn-primario ancho">Guardar contacto</button></form>`;
    } else {
      const lista = datos[pestana];
      html += `<form id="contForm">${lista.map((x, i) => `<fieldset style="border:0;border-bottom:1px solid var(--linea);padding:0 0 16px;margin:0 0 16px"><div class="form-grid">${
        pestana === 'areas' ? campo(i, 'nombre', 'Nombre', x.nombre) + campo(i, 'corto', 'Nombre corto', x.corto) + campo(i, 'resumen', 'Descripción', x.resumen, 1) + campo(i, 'ampliado', 'Información ampliada', x.ampliado, 1)
        : pestana === 'equipo' ? campo(i, 'nombre', 'Nombre', x.nombre) + campo(i, 'cargo', 'Cargo', x.cargo) + campo(i, 'especialidad', 'Especialidad', x.especialidad) + campo(i, 'bio', 'Descripción profesional', x.bio, 1)
        : pestana === 'articulos' ? campo(i, 'titulo', 'Título', x.titulo, 1) + campo(i, 'cat', 'Categoría', x.cat) + campo(i, 'fecha', 'Fecha (AAAA-MM-DD)', x.fecha) + campo(i, 'resumen', 'Resumen', x.resumen, 1)
        : campo(i, 'p', 'Pregunta', x.p, 1) + campo(i, 'r', 'Respuesta', x.r, 1)}</div></fieldset>`).join('')}<button class="btn btn-primario">Guardar cambios</button></form>`;
    }
    v.innerHTML = html + '</div>';
    v.querySelector('.pestanas').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { pestana = b.dataset.tab; VISTAS.contenido(v); } };
    $('#contForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (pestana === 'contacto') {
        const c = {}; $$('[data-k]', e.target).forEach((i) => (c[i.dataset.k] = i.dataset.k === 'telefonos' ? i.value.split(',').map((s) => s.trim()).filter(Boolean) : i.value.trim()));
        db.contenido.contacto = c; Object.assign(L.contacto, c);
      } else {
        const lista = datos[pestana];
        $$('[data-i]', e.target).forEach((i) => (lista[+i.dataset.i][i.dataset.k] = i.value.trim()));
        db.contenido[pestana] = lista;
      }
      auditar(`Editó el contenido: ${tabs.find((t) => t[0] === pestana)[1]}`); toast('Contenido guardado. Recargue el sitio para verlo.');
    });
  };

  // Clasificación
  VISTAS.clasificacion = (v) => {
    const r = db.reglas;
    const prueba = { area: 'laboral', urgencia: 'alta', proceso: 'no', descripcion: 'x'.repeat(90), telefono: '1' };
    v.innerHTML = `<p class="aviso">Estas reglas ordenan la bandeja y sugieren un estado inicial. <strong>No deciden la aceptación de un caso ni constituyen una evaluación jurídica.</strong> ${modo === 'real' ? 'Se guardan en la tabla <code>reglas_clasificacion</code> y la función del servidor las aplica a cada solicitud nueva.' : 'En la demostración se guardan en este navegador.'}</p>
      <div class="rejilla"><section class="tarjeta"><h2>Pesos de la puntuación</h2>
        ${Object.entries({ area: 'Área atendida por la firma', urgencia: 'Urgencia', proceso: 'Proceso en curso', descripcion: 'Descripción suficiente', contacto: 'Datos de contacto' }).map(([k, t]) =>
          `<div class="regla"><span>${t}</span><input type="range" min="0" max="50" value="${r.pesos[k]}" data-peso="${k}" aria-label="${t}"><output>${r.pesos[k]}</output></div>`).join('')}
        <div class="regla"><span>Umbral "Requiere evaluación"</span><input type="range" min="0" max="100" value="${r.umbralCalificada}" data-umbral aria-label="Umbral"><output>${r.umbralCalificada}</output></div>
        <div class="regla"><span>Mínimo de caracteres en la descripción</span><input type="range" min="20" max="300" step="10" value="${r.minDescripcion}" data-min aria-label="Mínimo de caracteres"><output>${r.minDescripcion}</output></div>
        <p class="explica" id="total"></p></section>
        <section class="tarjeta"><h2>Áreas que atiende la firma</h2><p class="explica" style="margin-top:0">Las solicitudes de otras áreas se marcan como "No corresponde a los servicios" para revisión, sin descartarse automáticamente.</p>
          <div class="areas-check">${L.areas.map((a) => `<label><input type="checkbox" value="${a.id}" ${r.areasAtendidas.includes(a.id) ? 'checked' : ''} ${modo === 'real' ? 'disabled' : ''} data-area> ${a.nombre}</label>`).join('')}</div>
          ${modo === 'real' ? '<p class="explica">En la base de datos son las especialidades publicadas (tabla <code>especialidades</code>).</p>' : ''}
          <h2 style="margin-top:22px">Ejemplo</h2><p class="explica" id="ejemplo"></p>
          <div class="botonera"><button class="btn btn-primario" id="recalcular">${modo === 'real' ? 'Guardar reglas' : 'Guardar y recalcular bandeja'}</button><button class="btn btn-borde" id="restablecerReglas">Valores por defecto</button></div></section></div>`;
    const actualizar = () => {
      $$('[data-peso]', v).forEach((i) => { r.pesos[i.dataset.peso] = +i.value; i.nextElementSibling.textContent = i.value; });
      const u = $('[data-umbral]', v); r.umbralCalificada = +u.value; u.nextElementSibling.textContent = u.value;
      const m = $('[data-min]', v); r.minDescripcion = +m.value; m.nextElementSibling.textContent = m.value;
      r.areasAtendidas = $$('[data-area]:checked', v).map((i) => i.value);
      const tot = Object.values(r.pesos).reduce((a, b) => a + b, 0);
      $('#total').textContent = `Puntuación máxima posible: ${tot}. Se recomienda que los pesos sumen 100.`;
      const c = L.clasificar(prueba, r);
      $('#ejemplo').textContent = `Solicitud laboral urgente, sin proceso, con descripción completa y teléfono: ${c.puntaje} puntos → ${L.estados[c.estadoSugerido]}.`;
    };
    v.oninput = actualizar; v.onchange = actualizar; actualizar();
    $('#recalcular').addEventListener('click', () => {
      if (modo === 'real') {
        const config = Object.assign({}, r); delete config.areasAtendidas;
        return hacer('Reglas guardadas · se aplican a las solicitudes nuevas', null,
          () => editar('reglas_clasificacion', 'true', { config, actualizado_por: yo.id }), () => VISTAS.clasificacion(v));
      }
      let n = 0;
      db.solicitudes.forEach((s) => { const c = L.clasificar(s, r); s.puntaje = c.puntaje; s.prioridad = c.prioridad; if (s.estado === 'nueva' || s.estado === 'incompleta' || s.estado === 'requiere_evaluacion' || s.estado === 'no_corresponde') { if (!s.asignado) { s.estado = c.estadoSugerido; n++; } } });
      auditar('Actualizó las reglas de clasificación y recalculó la bandeja'); toast(`Reglas guardadas · ${n} solicitudes sin revisar reclasificadas`);
    });
    $('#restablecerReglas').addEventListener('click', () => {
      db.reglas = Object.assign(JSON.parse(JSON.stringify(L.reglasBase)), modo === 'real' ? { areasAtendidas: r.areasAtendidas } : {});
      guardar(); VISTAS.clasificacion(v); if (modo === 'real') toast('Valores por defecto cargados. Pulse "Guardar reglas" para aplicarlos.');
    });
  };

  VISTAS.auditoria = (v) => {
    v.innerHTML = `<p class="aviso">Registro de acciones importantes. ${modo === 'real' ? 'Lo escriben triggers de la base de datos y nadie puede editarlo ni borrarlo desde el panel. Se muestran los 200 más recientes.' : 'En la demostración se guarda en este navegador.'}</p>
      <div class="tabla-envoltura"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th></tr></thead><tbody>${db.auditoria.map((a) => `<tr style="cursor:default"><td style="white-space:nowrap">${fh(a.fecha)}</td><td>${esc(a.quien)}</td><td>${esc(a.accion)}</td></tr>`).join('')}</tbody></table></div>`;
  };

  /* ===== Arranque ===== */
  function mostrarApp() {
    const demo = modo === 'demo';
    $('#acceso').hidden = true; $('#app').hidden = false;
    $('#rol').closest('label').style.display = demo ? '' : 'none'; $('#reiniciar').style.display = demo ? '' : 'none';
    const ins = $('.insignia-demo');
    ins.textContent = demo ? 'Modo demostración · datos ficticios' : `Conectado · ${yo.nombre}`;
    ins.title = demo ? 'Datos ficticios guardados solo en este navegador' : 'Datos reales de Supabase; los permisos los aplica la base de datos';
    let mod = 'panel'; try { mod = sessionStorage.getItem('litigar-mod') || 'panel'; } catch (e) {}
    ir(mod);
  }
  function entrarDemo() {
    modo = 'demo'; db = L.store.leer(); if (!db) { db = L.semilla(); guardar(); }
    if (!db.citas) { // citas ficticias para presentar el módulo
      const dia = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
      db.citas = [
        { id: 'CIT-2026-00002', nombre: 'Persona', apellido: 'de ejemplo 1', correo: 'ejemplo1@correo.test', telefono: '300 000 0001', areas: ['laboral'], modalidad: 'videollamada', fecha_preferida: dia(2), franja: 'tarde', mensaje: 'Dato ficticio de demostración.', estado: 'pendiente', creada: new Date().toISOString(), notas: '', asignado: null },
        { id: 'CIT-2026-00001', nombre: 'Persona', apellido: 'de ejemplo 2', correo: 'ejemplo2@correo.test', telefono: '300 000 0002', areas: ['familia', 'civil'], modalidad: 'presencial', fecha_preferida: null, franja: '', mensaje: '', estado: 'confirmada', fecha_confirmada: dia(3) + 'T15:00:00Z', creada: new Date(Date.now() - 864e5).toISOString(), notas: '', asignado: null },
      ];
      guardar();
    }
    yo = db.equipo[0]; $('#rol').value = yo.id;
    try { sessionStorage.setItem('litigar-demo', '1'); } catch (e) {}
    mostrarApp();
  }
  // Exige un perfil con rol y activo: una cuenta de Auth sin rol no entra al panel.
  async function abrirSesion() {
    const [p] = await api(`perfiles?id=eq.${ses.user.id}&select=id,nombre,correo,rol,activo`);
    if (!p || !p.rol || !p.activo) throw new Error('Su cuenta existe, pero un administrador todavía no le ha asignado un rol en el panel.');
    yo = { id: p.id, nombre: p.nombre || p.correo, correo: p.correo, rol: p.rol, areas: [] };
    modo = 'real'; await cargar(); mostrarApp();
  }
  const olvidarSesion = () => { ses = null; try { sessionStorage.removeItem(SES); } catch (e) {} };

  const fa = $('#formAcceso'), msj = $('#accesoMsj');
  if (!CONFIGURADO) {
    msj.textContent = 'El inicio de sesión real no está configurado (falta config.js). Solo está disponible el modo demostración.';
  } else {
    $$('input, button', fa).forEach((el) => (el.disabled = false));
    fa.addEventListener('submit', async (e) => {
      e.preventDefault(); const b = $('button', fa); b.disabled = true; msj.textContent = 'Verificando…';
      try {
        await auth('password', { email: $('#correo').value.trim(), password: $('#clave').value });
        await abrirSesion(); fa.reset(); msj.textContent = '';
      } catch (err) {
        olvidarSesion(); modo = null;
        msj.textContent = /invalid login|invalid_grant/i.test(err.message) ? 'Correo o contraseña incorrectos.' : err.message;
      }
      b.disabled = false;
    });
  }
  $('#entrarDemo').addEventListener('click', entrarDemo);
  $('#salir').addEventListener('click', () => {
    if (modo === 'real' && ses) pedir('/auth/v1/logout', { method: 'POST' }, ses.access_token).catch(() => {});
    olvidarSesion(); modo = null; db = null; cerrar();
    try { sessionStorage.removeItem('litigar-demo'); } catch (e) {}
    $('#app').hidden = true; $('#acceso').hidden = false;
  });
  $('#rol').addEventListener('change', (e) => { yo = db.equipo.find((u) => u.id === e.target.value) || db.equipo[0]; toast(`Viendo el panel como: ${yo.nombre}`); ir(actual); });
  $('#reiniciar').addEventListener('click', () => { if (!confirm('¿Restablecer los datos de demostración? Se borran los cambios hechos en este navegador.')) return; db = L.semilla(); guardar(); ir('panel'); toast('Datos de demostración restablecidos'); });
  $('#menuMovil').addEventListener('click', () => $('#lateral').classList.toggle('abierto'));

  let guardada = null; try { guardada = JSON.parse(sessionStorage.getItem(SES)); } catch (e) {}
  if (CONFIGURADO && guardada) { ses = guardada; abrirSesion().catch((err) => { olvidarSesion(); modo = null; msj.textContent = err.message; }); }
  else { try { if (sessionStorage.getItem('litigar-demo')) entrarDemo(); } catch (e) {} }
})();
