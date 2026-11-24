(function () {
  const L = window.LITIGAR;
  const C = window.LITIGAR_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fecha = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  // Enlaces de WhatsApp y año
  $$('[data-wa]').forEach((a) => (a.href = L.contacto.whatsapp));
  $('#anio').textContent = new Date().getFullYear();

  // Cabecera y menú
  const cab = $('#cabecera'), menu = $('#menu'), mb = $('#menuBoton');
  const alScroll = () => cab.classList.toggle('con-fondo', scrollY > 30);
  addEventListener('scroll', alScroll, { passive: true }); alScroll();
  const cerrarMenu = () => { menu.classList.remove('abierto'); mb.setAttribute('aria-expanded', 'false'); };
  mb.addEventListener('click', () => { const a = menu.classList.toggle('abierto'); mb.setAttribute('aria-expanded', a); });
  $$('a', menu).forEach((a) => a.addEventListener('click', cerrarMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarMenu(); cerrarCajon(); } });

  // Enlace activo según la sección visible
  const enlaces = $$('.menu a[href^="#"]:not(.btn)');
  const obsSec = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) enlaces.forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  enlaces.forEach((a) => { const s = $(a.getAttribute('href')); if (s) obsSec.observe(s); });

  // Revelado al hacer scroll
  const obs = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); }
  }), { threshold: .12 });
  const observar = (root = document) => $$('.revelar:not(.visible)', root).forEach((el, i) => { el.style.transitionDelay = (i % 6) * 70 + 'ms'; obs.observe(el); });

  // Hero: parallax leve con el mouse
  const svg = $('#columna');
  if (svg && !reducir && matchMedia('(pointer: fine)').matches) {
    const capas = [['.capa-rejilla', 6], ['.capa-columna', 14], ['.capa-trayectoria', 26]].map(([s, f]) => [$(s, svg), f]);
    $('.hero').addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      capas.forEach(([el, f]) => (el.style.transform = `translate(${x * f}px, ${y * f}px)`));
    });
  }

  // Contador
  $$('[data-contar]').forEach((el) => {
    const fin = +el.dataset.contar;
    if (reducir) return;
    new IntersectionObserver((ents, o) => {
      if (!ents[0].isIntersecting) return; o.disconnect();
      const t0 = performance.now();
      const paso = (t) => { const p = Math.min(1, (t - t0) / 1600); el.textContent = '+' + Math.round(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    }).observe(el);
  });

  // Franja
  const items = L.areas.map((a) => `<span>${esc(a.nombre)}</span>`).join('');
  $('#franja').innerHTML = items + items;

  // Áreas: índice + ficha
  const lista = $('#areasLista'), ficha = $('#areaFicha');
  lista.innerHTML = L.areas.map((a, i) => `<li><button class="area-tab" role="tab" id="tab-${a.id}" aria-controls="areaFicha" aria-selected="${i === 0}" data-i="${i}">
    <span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(a.nombre)}</span><span class="flecha" aria-hidden="true">→</span></button></li>`).join('');
  const mostrarArea = (i) => {
    const a = L.areas[i];
    $$('.area-tab', lista).forEach((b, j) => b.setAttribute('aria-selected', i === j));
    ficha.dataset.num = String(i + 1).padStart(2, '0');
    ficha.setAttribute('aria-labelledby', 'tab-' + a.id);
    ficha.innerHTML = `<div class="contenido"><span class="etiqueta-prov" style="align-self:flex-start;margin-bottom:18px;color:var(--gris-claro)">Descripción provisional</span>
      <h3>${esc(a.nombre)}</h3><p>${esc(a.resumen)}</p>
      <ul class="area-temas">${a.temas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="area-acciones"><button class="btn btn-linea" data-ampliar="${i}">Conocer más</button><button class="btn btn-oro" data-solicitar="${a.id}">Iniciar solicitud de ${esc(a.corto)}</button></div></div>`;
  };
  lista.addEventListener('click', (e) => { const b = e.target.closest('.area-tab'); if (b) mostrarArea(+b.dataset.i); });
  lista.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const tabs = $$('.area-tab', lista), i = tabs.indexOf(document.activeElement);
    const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[n].focus(); mostrarArea(n);
  });
  mostrarArea(0);

  // Cajón de detalle
  const cajon = $('#cajon'), velo = $('#velo');
  let focoPrevio = null;
  function abrirCajon(html) {
    focoPrevio = document.activeElement;
    $('#cajonCuerpo').innerHTML = html;
    velo.hidden = false; cajon.classList.add('abierto'); cajon.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('.cerrar', cajon).focus(), 50);
  }
  function cerrarCajon() {
    if (!cajon.classList.contains('abierto')) return;
    cajon.classList.remove('abierto'); cajon.setAttribute('aria-hidden', 'true'); velo.hidden = true;
    document.body.style.overflow = '';
    if (focoPrevio) focoPrevio.focus();
  }
  velo.addEventListener('click', cerrarCajon);
  $('[data-cerrar]', cajon).addEventListener('click', cerrarCajon);

  document.addEventListener('click', (e) => {
    const amp = e.target.closest('[data-ampliar]');
    if (amp) {
      const a = L.areas[+amp.dataset.ampliar];
      abrirCajon(`<p class="antetitulo">Área de práctica</p><h2 id="cajonTitulo">${esc(a.nombre)}</h2>
        <p style="font-size:1.1rem">${esc(a.resumen)}</p><p style="color:var(--gris)">${esc(a.ampliado)}</p>
        <h3 style="font-size:1.2rem;margin-top:28px">Asuntos frecuentes</h3>
        <ul class="area-temas">${a.temas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="etiqueta-prov">Contenido provisional · se edita desde el panel</p>
        <div style="margin-top:28px"><button class="btn btn-oro" data-solicitar="${a.id}">Iniciar solicitud de ${esc(a.corto)}</button></div>`);
    }
    const sol = e.target.closest('[data-solicitar]');
    if (sol) { cerrarCajon(); iniciarConArea(sol.dataset.solicitar); }
    const mod = e.target.closest('[data-modal]');
    if (mod) abrirModal(mod.dataset.modal);
  });

  // Proceso
  const pasosEl = $('#procesoPasos'), detalle = $('#procesoDetalle'), avance = $('#procesoAvance');
  pasosEl.innerHTML = L.pasos.map((p, i) => `<li><button class="paso-btn" data-i="${i}"><span class="circulo">${i + 1}</span><span class="titulo">${esc(p.t)}</span></button></li>`).join('');
  let pasoActual = 0, autoPaso = null;
  function mostrarPaso(i) {
    pasoActual = i;
    $$('.paso-btn', pasosEl).forEach((b, j) => { b.classList.toggle('hecho', j < i); b.toggleAttribute('aria-current', j === i); if (j === i) b.setAttribute('aria-current', 'step'); });
    const pct = (i / (L.pasos.length - 1)) * 100;
    avance.style.width = pct + '%';
    $('#procesoLinea').style.setProperty('--avance', pct + '%');
    const p = L.pasos[i];
    detalle.innerHTML = `<span class="grande">0${i + 1}</span><div class="contenido"><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>${i === 2 ? '<p class="nota-legal">La organización automática no es una evaluación jurídica ni decide si la firma acepta el caso.</p>' : ''}</div>
      <a href="#solicitud" class="btn btn-oro btn-sm">Empezar ahora</a>`;
  }
  pasosEl.addEventListener('click', (e) => { const b = e.target.closest('.paso-btn'); if (b) { clearInterval(autoPaso); mostrarPaso(+b.dataset.i); } });
  mostrarPaso(0);
  if (!reducir) new IntersectionObserver((ents, o) => {
    if (!ents[0].isIntersecting) return; o.disconnect();
    autoPaso = setInterval(() => { if (pasoActual >= L.pasos.length - 1) return clearInterval(autoPaso); mostrarPaso(pasoActual + 1); }, 2600);
  }, { threshold: .5 }).observe(pasosEl);

  // Equipo
  const silueta = '<svg class="silueta" viewBox="0 0 200 260" aria-hidden="true"><circle cx="100" cy="78" r="46" fill="currentColor"/><path d="M14 260c4-62 40-104 86-104s82 42 86 104z" fill="currentColor"/></svg>';
  $('#equipoGaleria').innerHTML = L.equipo.map((m) => `<article class="miembro revelar" tabindex="0">${silueta}<span class="chip">Foto por confirmar</span>
    <div class="info"><span class="cargo">${esc(m.cargo)}</span><h3>${esc(m.nombre)}</h3><span class="esp">${esc(m.especialidad)}</span><p class="bio">${esc(m.bio)}</p></div></article>`).join('');

  // Centro de conocimiento
  const cats = ['Todas', ...new Set(L.articulos.map((a) => a.cat))];
  const filtros = $('#filtros');
  filtros.innerHTML = cats.map((c, i) => `<button class="filtro" aria-pressed="${i === 0}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  function revista(cat) {
    const arts = L.articulos.filter((a) => cat === 'Todas' || a.cat === cat).sort((a, b) => (b.destacado - a.destacado) || b.fecha.localeCompare(a.fecha));
    if (!arts.length) return ($('#revista').innerHTML = '<p class="revista-vacia">No hay artículos en esta categoría.</p>');
    const [d, ...resto] = arts;
    $('#revista').innerHTML = `<a href="#" class="art-destacado" data-art="${esc(d.titulo)}"><div class="art-meta"><span class="art-cat">${esc(d.cat)}</span><span>${fecha(d.fecha)}</span><span>${d.min} min</span>${d.destacado ? '<span>★ Destacado</span>' : ''}</div><h3>${esc(d.titulo)}</h3><p>${esc(d.resumen)}</p></a>
      <div class="art-lista">${resto.slice(0, 4).map((a) => `<a href="#" class="art-item" data-art="${esc(a.titulo)}"><div><div class="art-meta"><span class="art-cat">${esc(a.cat)}</span><span>${fecha(a.fecha)}</span></div><h4>${esc(a.titulo)}</h4></div><span class="ir" aria-hidden="true">→</span></a>`).join('')}</div>`;
  }
  filtros.addEventListener('click', (e) => {
    const b = e.target.closest('.filtro'); if (!b) return;
    $$('.filtro', filtros).forEach((x) => x.setAttribute('aria-pressed', x === b));
    revista(b.dataset.cat);
  });
  $('#revista').addEventListener('click', (e) => {
    const a = e.target.closest('[data-art]'); if (!a) return;
    e.preventDefault();
    const art = L.articulos.find((x) => x.titulo === a.dataset.art);
    abrirCajon(`<p class="antetitulo">${esc(art.cat)} · ${fecha(art.fecha)}</p><h2 id="cajonTitulo">${esc(art.titulo)}</h2><p>${esc(art.resumen)}</p>
      <p style="color:var(--gris)">El artículo completo lo publicará la firma desde el panel administrativo. Este texto es provisional.</p>
      <button class="btn btn-oro" data-solicitar="${L.areas.find((x) => x.corto.toLowerCase().startsWith(art.cat.toLowerCase().slice(0, 5)))?.id || ''}">Tengo una situación parecida</button>`);
  });
  revista('Todas');

  // Preguntas frecuentes
  $('#faqs').innerHTML = L.faqs.map((f) => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('');

  // Pie
  const c = L.contacto;
  $('#pieContacto').innerHTML = c.telefonos.map((t) => `<li><a href="tel:+57${t.replace(/\s/g, '')}">${t}</a></li>`).join('')
    + `<li><a href="mailto:${c.correo}">${c.correo}</a></li><li><a href="${c.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="${c.instagram}" target="_blank" rel="noopener">Instagram @litigar.abogados</a></li>`;
  $('#pieOficina').innerHTML = `<li class="por-confirmar">Dirección: ${c.direccion}</li><li class="por-confirmar">Ciudad: ${c.ciudad}</li><li class="por-confirmar">Horario: ${c.horario}</li>`;

  // Ventanas legales
  const modal = $('#modal');
  const legales = {
    privacidad: `<h2>Política de privacidad</h2><p><span class="etiqueta-prov">Documento pendiente</span></p>
      <p>La firma redactará este documento. Debe explicar qué información recoge el sitio, para qué la usa, cuánto tiempo la conserva y cómo puede el usuario ejercer sus derechos.</p>`,
    datos: `<h2>Tratamiento de datos personales</h2><p><span class="etiqueta-prov">Documento pendiente · Ley 1581 de 2012</span></p>
      <p>Texto provisional. Al enviar una solicitud, usted autoriza a Litigar Group S.A.S. a tratar sus datos personales para atender su solicitud y contactarle. Puede conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización, escribiendo a ${c.correo}.</p>
      <p>La política definitiva (responsable, finalidades, derechos del titular y procedimiento de consultas y reclamos) la redactará y aprobará la firma.</p>`,
  };
  function abrirModal(k) { $('#modalCuerpo').innerHTML = legales[k]; modal.showModal(); }
  $('[data-cerrar]', modal).addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  /* ===== Asistente de captación ===== */
  const A = L.asistente;
  const est = {};
  const vistas = [
    { k: 'situacion', t: '¿Qué tipo de situación enfrenta?', a: 'Elija la opción que más se parezca. No necesita términos jurídicos.', ops: A.situaciones.map((s) => [s.id, s.t]) },
    { k: 'area', t: '¿En qué área cree que necesita ayuda?', a: 'Si no está seguro, elija "No lo sé". El equipo lo revisará.', ops: [...L.areas.map((a) => [a.id, a.nombre]), ['otra', 'Otra área'], ['nose', 'No lo sé']], dos: true },
    { k: 'tipo', t: '¿La solicitud es para una persona o para una empresa?', ops: [['natural', 'Persona natural', 'Para mí o para un familiar'], ['empresa', 'Empresa', 'Para una organización o negocio']] },
    { k: 'ciudad', t: '¿En qué ciudad se encuentra?', a: 'Nos ayuda a saber si podemos atenderle de forma presencial o virtual.', campo: 'ciudad' },
    { k: 'proceso', t: '¿Existe un proceso judicial en curso?', a: 'Por ejemplo, una demanda, una denuncia o una audiencia programada.', ops: A.procesos.map((p) => [p.id, p.t]) },
    { k: 'urgencia', t: '¿Qué tan urgente es su situación?', ops: A.urgencias.map((u) => [u.id, u.t, u.d]) },
    { k: 'descripcion', t: 'Describa brevemente su situación', a: 'Qué pasó, cuándo y qué le gustaría lograr. No incluya contraseñas, números de cuenta ni datos de terceros que no sean necesarios.', campo: 'descripcion' },
    { k: 'contacto', t: '¿Cómo podemos contactarle?', a: 'Solo usaremos estos datos para responder a su solicitud.', campo: 'contacto' },
  ];
  let vi = 0;
  const cuerpo = $('#asistenteCuerpo'), btnAtras = $('#btnAtras'), btnSig = $('#btnSiguiente');

  function pintar() {
    const v = vistas[vi];
    $('#pasoTexto').textContent = `Paso ${vi + 1} de ${vistas.length}`;
    $('#pasoBarra').style.width = ((vi + 1) / vistas.length) * 100 + '%';
    btnAtras.style.visibility = vi ? 'visible' : 'hidden';
    btnSig.textContent = vi === vistas.length - 1 ? 'Enviar solicitud' : 'Continuar →';
    let html = `<div class="vista"><h3 id="vt">${esc(v.t)}</h3>${v.a ? `<p class="ayuda">${esc(v.a)}</p>` : ''}`;
    if (v.ops) html += `<div class="opciones ${v.dos ? 'dos' : ''}" role="radiogroup" aria-labelledby="vt">${v.ops.map(([id, t, d]) =>
      `<div class="opcion"><input type="radio" name="${v.k}" id="o-${v.k}-${id}" value="${id}" ${est[v.k] === id ? 'checked' : ''}><label for="o-${v.k}-${id}">${esc(t)}${d ? `<small>${esc(d)}</small>` : ''}</label></div>`).join('')}</div>`;
    if (v.campo === 'ciudad') html += `<div class="campo"><label for="f-ciudad">Ciudad o municipio</label><input id="f-ciudad" maxlength="80" autocomplete="address-level2" value="${esc(est.ciudad || '')}"></div>`;
    if (v.campo === 'descripcion') html += `<div class="campo"><label for="f-desc">Su situación</label><textarea id="f-desc" maxlength="2000">${esc(est.descripcion || '')}</textarea><span class="contador" id="contador">0 / 2000</span></div>`;
    if (v.campo === 'contacto') html += `<div class="campo"><label for="f-nombre">Nombre completo</label><input id="f-nombre" maxlength="120" autocomplete="name" value="${esc(est.nombre || '')}"></div>
      <div class="campos-dos"><div class="campo"><label for="f-tel">Teléfono o WhatsApp</label><input id="f-tel" type="tel" maxlength="20" autocomplete="tel" value="${esc(est.telefono || '')}"></div>
      <div class="campo"><label for="f-correo">Correo electrónico</label><input id="f-correo" type="email" maxlength="120" autocomplete="email" value="${esc(est.correo || '')}"></div></div>
      <label class="consentimiento"><input type="checkbox" id="f-consent" ${est.consentimiento ? 'checked' : ''}><span>Autorizo a Litigar Group S.A.S. a tratar mis datos personales para atender esta solicitud, según la <button type="button" data-modal="datos">política de tratamiento de datos</button>. Entiendo que enviarla no constituye asesoría jurídica ni la aceptación del caso.</span></label>`;
    html += '<p class="error" id="error" role="alert"></p></div>';
    cuerpo.innerHTML = html;
    const ta = $('#f-desc');
    if (ta) { const act = () => ($('#contador').textContent = `${ta.value.length} / 2000`); ta.addEventListener('input', act); act(); }
    $$('input[type=radio]', cuerpo).forEach((r) => r.addEventListener('change', () => { est[v.k] = r.value; setTimeout(() => { if (vistas[vi].k === v.k) avanzar(); }, 260); }));
  }

  function leer() {
    const v = vistas[vi], err = $('#error');
    const falla = (m) => { err.textContent = m; return false; };
    if (v.ops && !est[v.k]) return falla('Elija una opción para continuar.');
    if (v.campo === 'ciudad') { est.ciudad = $('#f-ciudad').value.trim(); if (est.ciudad.length < 2) return falla('Escriba su ciudad.'); }
    if (v.campo === 'descripcion') { est.descripcion = $('#f-desc').value.trim(); if (est.descripcion.length < 20) return falla('Cuéntenos un poco más (mínimo 20 caracteres).'); }
    if (v.campo === 'contacto') {
      est.nombre = $('#f-nombre').value.trim(); est.telefono = $('#f-tel').value.trim(); est.correo = $('#f-correo').value.trim(); est.consentimiento = $('#f-consent').checked;
      if (est.nombre.length < 3) return falla('Escriba su nombre.');
      if (!est.telefono && !est.correo) return falla('Deje al menos un teléfono o un correo.');
      if (est.telefono && !/^[+\d\s()-]{7,20}$/.test(est.telefono)) return falla('Revise el número de teléfono.');
      if (est.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(est.correo)) return falla('Revise el correo electrónico.');
      if (!est.consentimiento) return falla('Debe autorizar el tratamiento de datos para enviar la solicitud.');
    }
    return true;
  }

  function avanzar() {
    if (!leer()) return;
    if (vi < vistas.length - 1) { vi++; pintar(); $('#vt').focus?.(); return; }
    enviar();
  }
  btnSig.addEventListener('click', avanzar);
  btnAtras.addEventListener('click', () => { if (vi) { vi--; pintar(); } });
  $('#asistente').addEventListener('submit', (e) => { e.preventDefault(); avanzar(); });

  async function enviar() {
    btnSig.disabled = true; btnSig.textContent = 'Enviando…';
    const datos = { situacion: est.situacion, area: est.area, tipo: est.tipo, ciudad: est.ciudad, proceso: est.proceso, urgencia: est.urgencia,
      descripcion: est.descripcion, nombre: est.nombre, telefono: est.telefono, correo: est.correo, consentimiento: true };
    let codigo = null, real = false;
    try {
      if (C.supabaseUrl && C.supabaseKey) {
        // Producción: la función crear_solicitud valida, clasifica y guarda en el servidor.
        const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/crear_solicitud`, {
          method: 'POST', headers: { apikey: C.supabaseKey, Authorization: `Bearer ${C.supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: Object.assign({}, datos, { politica_version: C.politicaVersion || 'provisional-2026-11' }) }),
        });
        if (!r.ok) throw new Error(await r.text());
        codigo = await r.json(); real = true;
      } else {
        const s = L.crearSolicitud(datos);
        if (!s) throw new Error('No se pudo guardar en este navegador');
        codigo = s.id;
      }
    } catch (e) {
      btnSig.disabled = false; btnSig.textContent = 'Enviar solicitud';
      $('#error').innerHTML = 'No pudimos enviar su solicitud. Intente de nuevo o <a href="' + c.whatsapp + '" target="_blank" rel="noopener">escríbanos por WhatsApp</a>.';
      return;
    }
    $('.asistente-pie').hidden = true;
    $('#pasoTexto').textContent = 'Solicitud enviada'; $('#pasoBarra').style.width = '100%';
    cuerpo.innerHTML = `<div class="vista exito"><div class="sello" aria-hidden="true">✓</div><h3>Recibimos su solicitud</h3>
      <p>Su código de seguimiento es</p><div class="codigo">${esc(codigo)}</div>
      <p class="ayuda">El equipo revisará la información y, si su caso corresponde a nuestros servicios, le contactará por el medio que indicó. Recibir la solicitud no implica la aceptación del caso.</p>
      ${real ? '' : `<p class="aviso-demo"><strong>Vista previa:</strong> esta solicitud se guardó solo en este navegador para la demostración. No se envió a la firma ni se envió ningún correo. Puede verla en el <a href="admin/">panel de demostración</a>.</p>`}
      <button type="button" class="btn btn-texto" id="otra">Enviar otra solicitud</button></div>`;
    $('#otra').addEventListener('click', () => { Object.keys(est).forEach((k) => delete est[k]); vi = 0; $('.asistente-pie').hidden = false; btnSig.disabled = false; pintar(); });
  }

  function iniciarConArea(id) {
    if (id) est.area = id;
    vi = 0; pintar();
    $('#solicitud').scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' });
    if (id) { const a = L.areas.find((x) => x.id === id); $('#error').textContent = ''; $('.ayuda', cuerpo)?.insertAdjacentHTML('afterend', `<p class="ayuda" style="margin-top:-14px"><strong>Área seleccionada:</strong> ${esc(a.nombre)}</p>`); }
  }

  pintar();
  observar();
})();
