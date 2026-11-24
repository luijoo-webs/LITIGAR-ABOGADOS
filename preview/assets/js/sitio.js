(function () {
  const L = window.LITIGAR;
  const C = window.LITIGAR_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fecha = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const c = L.contacto;
  const flecha = '<span class="f" aria-hidden="true">→</span>';

  $$('[data-wa]').forEach((a) => (a.href = c.whatsapp));
  $('#anio').textContent = new Date().getFullYear();

  // Marquesina: áreas y teléfono, duplicada para el bucle continuo
  const sep = '<span class="sep" aria-hidden="true">✦</span>';
  const bloque = ['Consulta inicial', ...L.areas.map((a) => a.corto), c.telefonos[0]].map((t) => `<span>${esc(t)}</span>`).join(sep) + sep;
  $('#marquesina').innerHTML = bloque + `<span aria-hidden="true" style="display:contents">${bloque}</span>`;

  // Cabecera y menú
  const cab = $('#cabecera'), menu = $('#menu'), mb = $('#menuBoton');
  const enlaces = $$('.menu a[href^="#"]');
  const hero = $('.hero');
  // Sobre la foto del inicio la cabecera es transparente con texto claro
  const alScroll = () => {
    const sobreHero = hero && scrollY < hero.offsetTop + hero.offsetHeight - cab.offsetHeight;
    cab.classList.toggle('sobre-oscuro', !!sobreHero && !menu.classList.contains('abierto'));
    cab.classList.toggle('con-borde', !sobreHero && scrollY > 10);
    cab.classList.toggle('velado', !!sobreHero && scrollY > 40);
    if (scrollY < 200) enlaces.forEach((a) => a.classList.remove('activo'));
  };
  addEventListener('scroll', alScroll, { passive: true }); alScroll();

  // Paralaje leve de la banda de columnas (solo con movimiento permitido)
  const banda = $('.banda'), bandaFoto = $('.banda-foto');
  if (banda && !reducir) addEventListener('scroll', () => requestAnimationFrame(() => {
    const r = banda.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    bandaFoto.style.transform = `translateY(${((r.top + r.height / 2) / innerHeight - .5) * -60}px)`;
  }), { passive: true });
  const cerrarMenu = () => { menu.classList.remove('abierto'); mb.setAttribute('aria-expanded', 'false'); document.body.classList.remove('sin-scroll'); alScroll(); };
  mb.addEventListener('click', () => {
    document.documentElement.style.setProperty('--top-menu', cab.getBoundingClientRect().bottom + 'px');
    const a = menu.classList.toggle('abierto');
    mb.setAttribute('aria-expanded', a); document.body.classList.toggle('sin-scroll', a); alScroll();
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', cerrarMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarMenu(); cerrarCajon(); } });

  const obsSec = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) enlaces.forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  enlaces.forEach((a) => { const s = $(a.getAttribute('href')); if (s) obsSec.observe(s); });

  // Revelado suave, una sola vez
  const obs = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); }
  }), { threshold: .1 });
  const observar = (root = document) => $$('.revelar:not(.visible)', root).forEach((el, i) => { el.style.transitionDelay = (i % 4) * 80 + 'ms'; obs.observe(el); });

  // Fotografías de referencia (Unsplash) mientras llegan las de la firma
  const foto = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;
  const fotoArea = { familia: '1562564055-71e051d33c19', laboral: '1551135049-8a33b5883817', civil: '1564846824194-346b7871b855',
    'seguridad-social': '1758518729912-bf3a84c400e0', tributario: '1520607162513-77705c0f0d4a' };

  // Inicio: una fila por área que abre la solicitud con el área elegida
  $('#resolver').innerHTML = L.areas.map((a, i) => `<li><button class="rapido-item" data-solicitar="${a.id}">
    <span class="n">${String(i + 1).padStart(2, '0')}</span><strong>${esc(a.corto)}</strong><small>${esc(a.temas[0])}</small>${flecha}</button></li>`).join('')
    + `<li><button class="rapido-item otro" data-solicitar=""><span class="n">—</span><strong>No sé qué área es</strong><small>El equipo lo revisa</small>${flecha}</button></li>`;

  // Áreas: pestañas subrayadas y panel
  const tabs = $('#areasTabs'), panel = $('#areaPanel');
  $('#areasCuenta').textContent = String(L.areas.length).padStart(2, '0');
  tabs.innerHTML = L.areas.map((a, i) => `<button class="pestana" role="tab" id="tab-${a.id}" aria-controls="areaPanel" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}" data-i="${i}">${esc(a.corto)}</button>`).join('');
  const mostrarArea = (i) => {
    const a = L.areas[i];
    $$('.pestana', tabs).forEach((b, j) => { b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + a.id);
    panel.innerHTML = `<figure class="area-foto"><img src="${foto(fotoArea[a.id], 1000)}" alt=""><figcaption class="ref">Imagen de referencia</figcaption>
        <div class="area-foto-texto"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(a.nombre)}</h3></div></figure>
      <div class="area-info"><p class="resumen-area">${esc(a.resumen)}</p><p class="ampliado">${esc(a.ampliado)}</p><p class="eyebrow claro">Asuntos frecuentes</p><ul class="asuntos">${a.temas.map((t) => `<li><button data-solicitar="${a.id}" data-asunto="${esc(t)}">${esc(t)}<span>Consultar →</span></button></li>`).join('')}</ul>
      <div class="asuntos-pie"><span class="nota-prov">Provisional · se edita desde el panel</span><button class="btn btn-oro btn-sm" data-solicitar="${a.id}">Consultar sobre ${esc(a.corto.toLowerCase())}</button></div></div>`;
  };
  tabs.addEventListener('click', (e) => { const b = e.target.closest('.pestana'); if (b) mostrarArea(+b.dataset.i); });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    const bs = $$('.pestana', tabs), i = bs.indexOf(document.activeElement);
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length;
    bs[n].focus(); mostrarArea(n);
  });
  mostrarArea(0);

  // Pasos
  $('#pasos').innerHTML = L.pasos.map((p) => `<li><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></li>`).join('');

  // Equipo: filas; sin datos confirmados no se muestran fotos ni siluetas
  // Equipo: espacios reservados; aquí nunca se usan fotos de stock
  $('#equipoLista').innerHTML = L.equipo.map((m) => `<li class="miembro revelar"><div class="miembro-foto"><span>Espacio para<br>foto oficial</span></div>
    <p class="cargo">${esc(m.cargo)}</p><h3>${esc(m.nombre)}</h3><p class="esp">${esc(m.especialidad)}</p></li>`).join('');

  // Artículos
  const cats = ['Todos', ...new Set(L.articulos.map((a) => a.cat))];
  const filtros = $('#filtros');
  filtros.innerHTML = cats.map((x, i) => `<button class="pestana" aria-pressed="${i === 0}" data-cat="${esc(x)}">${esc(x)}</button>`).join('');
  function articulos(cat) {
    const arts = L.articulos.filter((a) => cat === 'Todos' || a.cat === cat).sort((a, b) => b.fecha.localeCompare(a.fecha));
    $('#articulos').innerHTML = arts.length ? arts.map((a) => `<li><button class="articulo" data-art="${esc(a.titulo)}">
      <span class="fecha">${fecha(a.fecha)}</span><span class="cat">${esc(a.cat)}</span><span class="tit">${esc(a.titulo)}</span>${flecha}</button></li>`).join('')
      : '<li class="vacio">No hay artículos en esta categoría.</li>';
  }
  filtros.addEventListener('click', (e) => {
    const b = e.target.closest('.pestana'); if (!b) return;
    $$('.pestana', filtros).forEach((x) => x.setAttribute('aria-pressed', x === b));
    articulos(b.dataset.cat);
  });
  articulos('Todos');

  // Contacto y FAQs
  const canal = (label, valor, href, ext) => `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}><small>${label}</small><strong>${esc(valor)}</strong></a></li>`;
  const pendiente = (label) => `<li><div class="pend"><small>${label}</small><strong>Por confirmar</strong></div></li>`;
  $('#canales').innerHTML = canal('WhatsApp', 'Escribir ahora', c.whatsapp, true)
    + c.telefonos.map((t) => canal('Teléfono', t, `tel:+57${t.replace(/\s/g, '')}`)).join('')
    + canal('Correo', c.correo, `mailto:${c.correo}`)
    + canal('Instagram', '@litigar.abogados', c.instagram, true)
    + pendiente('Dirección') + pendiente('Horario');
  $('#faqs').innerHTML = L.faqs.map((f) => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('');
  $('#pieAreas').innerHTML = L.areas.map((a) => `<li><button class="enlace" data-solicitar="${a.id}">${esc(a.corto)}</button></li>`).join('');
  $('#pieContacto').innerHTML = c.telefonos.map((t) => `<li><a href="tel:+57${t.replace(/\s/g, '')}">${t}</a></li>`).join('')
    + `<li><a href="mailto:${c.correo}">${c.correo}</a></li><li><a href="${c.instagram}" target="_blank" rel="noopener">Instagram</a></li>`;

  // Cajón (artículos) y ventanas legales
  const cajon = $('#cajon'), velo = $('#velo');
  let focoPrevio = null;
  function abrirCajon(html) {
    focoPrevio = document.activeElement;
    $('#cajonCuerpo').innerHTML = html;
    velo.hidden = false; cajon.classList.add('abierto'); cajon.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sin-scroll');
    setTimeout(() => $('.cerrar', cajon).focus(), 50);
  }
  function cerrarCajon() {
    if (!cajon.classList.contains('abierto')) return;
    cajon.classList.remove('abierto'); cajon.setAttribute('aria-hidden', 'true'); velo.hidden = true;
    document.body.classList.remove('sin-scroll');
    if (focoPrevio) focoPrevio.focus();
  }
  velo.addEventListener('click', cerrarCajon);
  $('[data-cerrar]', cajon).addEventListener('click', cerrarCajon);

  $('#articulos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-art]'); if (!b) return;
    const art = L.articulos.find((x) => x.titulo === b.dataset.art);
    const area = L.areas.find((x) => x.corto.toLowerCase().startsWith(art.cat.toLowerCase().slice(0, 5)));
    abrirCajon(`<p class="eyebrow">${esc(art.cat)} · ${fecha(art.fecha)} · ${art.min} min</p><h2 id="cajonTitulo">${esc(art.titulo)}</h2><p>${esc(art.resumen)}</p>
      <p class="ayuda">El artículo completo lo publicará la firma desde el panel. Este texto es provisional.</p>
      <button class="btn btn-tinta" data-solicitar="${area ? area.id : ''}">Tengo una situación parecida</button>`);
  });

  const modal = $('#modal');
  const legales = {
    privacidad: `<h2>Política de privacidad</h2><p class="nota-prov">Documento pendiente</p>
      <p>La firma redactará este documento. Debe explicar qué información recoge el sitio, para qué la usa, cuánto tiempo la conserva y cómo puede el usuario ejercer sus derechos.</p>`,
    datos: `<h2>Tratamiento de datos personales</h2><p class="nota-prov">Documento pendiente · Ley 1581 de 2012</p>
      <p>Texto provisional. Al enviar una solicitud, usted autoriza a Litigar Group S.A.S. a tratar sus datos personales para atender su solicitud y contactarle. Puede conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización, escribiendo a ${c.correo}.</p>
      <p>La política definitiva (responsable, finalidades, derechos del titular y procedimiento de consultas y reclamos) la redactará y aprobará la firma.</p>`,
  };
  function abrirModal(k) { $('#modalCuerpo').innerHTML = legales[k]; modal.showModal(); }
  $('[data-cerrar]', modal).addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  document.addEventListener('click', (e) => {
    const sol = e.target.closest('[data-solicitar]');
    if (sol) { cerrarCajon(); iniciarConArea(sol.dataset.solicitar, sol.dataset.asunto); }
    const mod = e.target.closest('[data-modal]');
    if (mod) abrirModal(mod.dataset.modal);
  });

  /* ===== Asistente de solicitud ===== */
  const A = L.asistente;
  const est = {};
  const vistas = [
    { k: 'situacion', r: 'Situación', t: '¿Qué tipo de situación enfrenta?', a: 'Elija la opción que más se parezca. No necesita términos jurídicos.', ops: A.situaciones.map((s) => [s.id, s.t]) },
    { k: 'area', r: 'Área', t: '¿En qué área cree que necesita ayuda?', a: 'Si no está seguro, elija "No lo sé". El equipo lo revisará.', ops: [...L.areas.map((a) => [a.id, a.nombre]), ['otra', 'Otra área'], ['nose', 'No lo sé']], dos: true },
    { k: 'tipo', r: 'Para', t: '¿La solicitud es para una persona o para una empresa?', ops: [['natural', 'Persona natural', 'Para mí o para un familiar'], ['empresa', 'Empresa', 'Para una organización o negocio']] },
    { k: 'ciudad', r: 'Ciudad', t: '¿En qué ciudad se encuentra?', a: 'Nos ayuda a saber si podemos atenderle de forma presencial o virtual.', campo: 'ciudad' },
    { k: 'proceso', r: 'Proceso en curso', t: '¿Existe un proceso judicial en curso?', a: 'Por ejemplo, una demanda, una denuncia o una audiencia programada.', ops: A.procesos.map((p) => [p.id, p.t]) },
    { k: 'urgencia', r: 'Urgencia', t: '¿Qué tan urgente es su situación?', ops: A.urgencias.map((u) => [u.id, u.t, u.d]) },
    { k: 'descripcion', r: 'Descripción', t: 'Describa brevemente su situación', a: 'Qué pasó, cuándo y qué le gustaría lograr. No incluya contraseñas, números de cuenta ni datos de terceros que no sean necesarios.', campo: 'descripcion' },
    { k: 'contacto', r: 'Contacto', t: '¿Cómo podemos contactarle?', a: 'Solo usaremos estos datos para responder a su solicitud.', campo: 'contacto' },
  ];
  let vi = 0;
  const cuerpo = $('#asistenteCuerpo'), btnAtras = $('#btnAtras'), btnSig = $('#btnSiguiente');

  // Resumen "Tu consulta": muestra lo respondido, como un carrito
  const etiqueta = (v) => {
    if (v.ops) { const o = v.ops.find(([id]) => id === est[v.k]); return o ? o[1] : ''; }
    if (v.k === 'descripcion') return est.descripcion ? `${est.descripcion.length} caracteres` : '';
    if (v.k === 'contacto') return est.nombre || '';
    return est[v.k] || '';
  };
  function resumen() {
    let n = 0;
    $('#resumenLista').innerHTML = vistas.map((v) => { const t = etiqueta(v); if (t) n++; return `<div><dt>${v.r}</dt><dd class="${t ? '' : 'vacio-dd'}">${esc(t || '—')}</dd></div>`; }).join('')
      + (est.asunto ? `<div><dt>Asunto</dt><dd>${esc(est.asunto)}</dd></div>` : '');
    $('#resumenCuenta').textContent = `${n} de ${vistas.length}`;
  }
  const rb = $('#resumenBoton');
  rb.addEventListener('click', () => { const a = $('#resumen').classList.toggle('abierto'); rb.setAttribute('aria-expanded', a); });

  function pintar() {
    const v = vistas[vi];
    $('#pasoTexto').textContent = `Paso ${vi + 1} de ${vistas.length}`;
    $('#pasoBarra').style.width = ((vi + 1) / vistas.length) * 100 + '%';
    btnAtras.style.visibility = vi ? 'visible' : 'hidden';
    btnSig.textContent = vi === vistas.length - 1 ? 'Enviar solicitud' : 'Continuar';
    let html = `<div class="vista"><h3 id="vt" tabindex="-1">${esc(v.t)}</h3>${v.a ? `<p class="ayuda">${esc(v.a)}</p>` : ''}`;
    if (vi === 0 && est.area) { const a = L.areas.find((x) => x.id === est.area); if (a) html += `<p class="area-elegida"><strong>Área elegida:</strong> ${esc(a.nombre)}${est.asunto ? ` · ${esc(est.asunto)}` : ''}</p>`; }
    if (v.ops) html += `<div class="opciones ${v.dos ? 'dos' : ''}" role="radiogroup" aria-labelledby="vt">${v.ops.map(([id, t, d]) =>
      `<div class="opcion"><input type="radio" name="${v.k}" id="o-${v.k}-${id}" value="${id}" ${est[v.k] === id ? 'checked' : ''}><label for="o-${v.k}-${id}">${esc(t)}${d ? `<small>${esc(d)}</small>` : ''}</label></div>`).join('')}</div>`;
    if (v.campo === 'ciudad') html += `<div class="campo"><label for="f-ciudad">Ciudad o municipio</label><input id="f-ciudad" maxlength="80" autocomplete="address-level2" value="${esc(est.ciudad || '')}"></div>`;
    if (v.campo === 'descripcion') html += `<div class="campo"><label for="f-desc">Su situación</label><textarea id="f-desc" maxlength="2000">${esc(est.descripcion || (est.asunto ? `Asunto: ${est.asunto}. ` : ''))}</textarea><span class="contador" id="contador">0 / 2000</span></div>`;
    if (v.campo === 'contacto') html += `<div class="campo"><label for="f-nombre">Nombre completo</label><input id="f-nombre" maxlength="120" autocomplete="name" value="${esc(est.nombre || '')}"></div>
      <div class="campos-dos"><div class="campo"><label for="f-tel">Teléfono o WhatsApp</label><input id="f-tel" type="tel" maxlength="20" autocomplete="tel" value="${esc(est.telefono || '')}"></div>
      <div class="campo"><label for="f-correo">Correo electrónico</label><input id="f-correo" type="email" maxlength="120" autocomplete="email" value="${esc(est.correo || '')}"></div></div>
      <label class="consentimiento"><input type="checkbox" id="f-consent" ${est.consentimiento ? 'checked' : ''}><span>Autorizo a Litigar Group S.A.S. a tratar mis datos personales para atender esta solicitud, según la <button type="button" data-modal="datos">política de tratamiento de datos</button>. Entiendo que enviarla no constituye asesoría jurídica ni la aceptación del caso.</span></label>`;
    html += '<p class="error" id="error" role="alert"></p></div>';
    cuerpo.innerHTML = html;
    const ta = $('#f-desc');
    if (ta) { const act = () => ($('#contador').textContent = `${ta.value.length} / 2000`); ta.addEventListener('input', act); act(); }
    $$('input[type=radio]', cuerpo).forEach((r) => r.addEventListener('change', () => { est[v.k] = r.value; resumen(); setTimeout(() => { if (vistas[vi].k === v.k) avanzar(); }, 260); }));
    resumen();
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
    resumen();
    if (vi < vistas.length - 1) {
      vi++;
      // Si el área ya viene elegida desde el sitio, se salta esa pregunta
      if (vistas[vi].k === 'area' && est.area && est.areaPrevia) vi++;
      pintar(); $('#vt').focus({ preventScroll: true }); return;
    }
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
    cuerpo.innerHTML = `<div class="vista exito"><h3 tabindex="-1" id="vt">Recibimos su solicitud</h3>
      <p class="ayuda">Su código de seguimiento es</p><div class="codigo">${esc(codigo)}</div>
      <p class="ayuda">El equipo revisará la información y, si su caso corresponde a nuestros servicios, le contactará por el medio que indicó. Recibir la solicitud no implica la aceptación del caso.</p>
      ${real ? '' : `<p class="aviso-demo"><strong>Vista previa:</strong> esta solicitud se guardó solo en este navegador para la demostración. No se envió a la firma ni se envió ningún correo. Puede verla en el <a href="admin/">panel de demostración</a>.</p>`}
      <button type="button" class="btn btn-texto" id="otra">Enviar otra solicitud</button></div>`;
    $('#vt').focus({ preventScroll: true });
    $('#otra').addEventListener('click', () => { Object.keys(est).forEach((k) => delete est[k]); vi = 0; $('.asistente-pie').hidden = false; btnSig.disabled = false; pintar(); });
  }

  function iniciarConArea(id, asunto) {
    if (id) { est.area = id; est.areaPrevia = true; } else { delete est.area; delete est.areaPrevia; }
    if (asunto) est.asunto = asunto; else delete est.asunto;
    vi = 0; $('.asistente-pie').hidden = false; btnSig.disabled = false; pintar();
    $('#solicitud').scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' });
  }

  pintar();
  observar();
})();
