(function () {
  const L = window.LITIGAR;
  const C = window.LITIGAR_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const puntero = matchMedia('(hover: hover)').matches;
  const fecha = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const c = L.contacto;
  const flecha = '<span class="f" aria-hidden="true">→</span>';
  // Fotografías de referencia (Unsplash) mientras llegan las de la firma
  const foto = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;
  const fotoArea = { familia: '1562564055-71e051d33c19', laboral: '1551135049-8a33b5883817', civil: '1564846824194-346b7871b855',
    'seguridad-social': '1758518729912-bf3a84c400e0', tributario: '1520607162513-77705c0f0d4a' };

  $$('[data-wa]').forEach((a) => (a.href = c.whatsapp));
  $('#anio').textContent = new Date().getFullYear();

  // Marquesina: áreas y teléfono, duplicada para el bucle continuo
  const sep = '<span class="sep" aria-hidden="true">✦</span>';
  const bloque = ['Consulta inicial', ...L.areas.map((a) => a.corto), c.telefonos[0]].map((t) => `<span>${esc(t)}</span>`).join(sep) + sep;
  $('#marquesina').innerHTML = bloque + `<span aria-hidden="true" style="display:contents">${bloque}</span>`;

  /* ===== Cabecera y menú ===== */
  const cab = $('#cabecera'), menu = $('#menu'), mb = $('#menuBoton'), hero = $('.hero');
  const enlaces = $$('.menu a[href^="#"]');
  const alScroll = () => {
    const sobreHero = hero && scrollY < hero.offsetTop + hero.offsetHeight - cab.offsetHeight;
    cab.classList.toggle('sobre-oscuro', !!sobreHero && !menu.classList.contains('abierto'));
    cab.classList.toggle('con-borde', !sobreHero && scrollY > 10);
    cab.classList.toggle('velado', !!sobreHero && scrollY > 40);
    if (scrollY < 200) enlaces.forEach((a) => a.classList.remove('activo'));
  };
  addEventListener('scroll', alScroll, { passive: true }); alScroll();
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

  /* ===== Revelado al hacer scroll (una vez). Las fotos usan una cortina que se retira:
     nunca se recorta el elemento observado, porque entonces el observador no lo ve. ===== */
  const obs = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  const observar = (root = document) => $$('.revelar:not(.visible), .cortina:not(.visible)', root).forEach((el, i) => { el.style.transitionDelay = (i % 4) * 80 + 'ms'; obs.observe(el); });

  /* ===== Cajón (carrito y artículos) ===== */
  const cajon = $('#cajon'), velo = $('#velo');
  let focoPrevio = null;
  function abrirCajon(html, vista) {
    if (!cajon.classList.contains('abierto')) focoPrevio = document.activeElement;
    $('#cajonCuerpo').innerHTML = html; cajon.dataset.vista = vista || '';
    velo.hidden = false; cajon.classList.add('abierto'); cajon.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sin-scroll');
  }
  function cerrarCajon() {
    if (!cajon.classList.contains('abierto')) return;
    cajon.classList.remove('abierto'); cajon.setAttribute('aria-hidden', 'true'); velo.hidden = true;
    document.body.classList.remove('sin-scroll');
    if (focoPrevio) focoPrevio.focus();
  }
  velo.addEventListener('click', cerrarCajon);
  $('[data-cerrar]', cajon).addEventListener('click', cerrarCajon);
  cajon.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar-ir]')) cerrarCajon(); });

  /* ===== Carrito de servicios ===== */
  const CLAVE = 'litigar-carrito';
  let carrito = [];
  try { carrito = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) {}
  carrito = Array.isArray(carrito) ? carrito.filter((x) => x && L.areas.some((a) => a.id === x.area) && typeof x.tema === 'string') : [];
  const llave = (area, tema) => `${area}::${tema}`;
  const enCarrito = (area, tema) => carrito.some((x) => x.area === area && x.tema === tema);
  const nombreArea = (id) => (L.areas.find((a) => a.id === id) || {}).corto || id;
  const aviso = document.createElement('div'); aviso.className = 'aviso-flot'; aviso.setAttribute('role', 'status'); document.body.appendChild(aviso);
  function avisar(html) { aviso.innerHTML = html; aviso.classList.add('ver'); clearTimeout(aviso.t); aviso.t = setTimeout(() => aviso.classList.remove('ver'), 3400); }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch (e) {} };
  function alternar(area, tema) {
    const estaba = enCarrito(area, tema);
    carrito = estaba ? carrito.filter((x) => !(x.area === area && x.tema === tema)) : [...carrito, { area, tema }];
    guardar(); pintarCarrito();
    if (!estaba) {
      avisar(`<strong>${esc(tema)}</strong> se añadió a su solicitud <a href="#cita">Solicitar →</a>`);
      const b = $('#carritoBtn'); b.classList.remove('salto'); void b.offsetWidth; b.classList.add('salto');
    } else avisar(`${esc(tema)} se quitó de su solicitud`);
  }
  const itemHtml = (x, txt) => `<li><span><small>${esc(nombreArea(x.area))}</small>${esc(x.tema)}</span><button type="button" data-quitar="${esc(llave(x.area, x.tema))}" aria-label="Quitar ${esc(x.tema)}">${txt}</button></li>`;
  function pintarCarrito() {
    const n = carrito.length, cu = $('#ctaCuenta');
    cu.hidden = !n; cu.textContent = n;
    $('#carritoBtn').setAttribute('aria-label', n ? `Ver mi solicitud: ${n} servicio${n === 1 ? '' : 's'}` : 'Ver mi solicitud');
    $$('[data-servicio]').forEach((b) => {
      const [a, t] = b.dataset.servicio.split('::'), si = enCarrito(a, t);
      b.setAttribute('aria-pressed', si); const m = b.querySelector('.mas'); if (m) m.textContent = si ? '✓' : '+';
    });
    const lista = $('#citaServicios');
    if (lista) {
      lista.innerHTML = carrito.map((x) => itemHtml(x, '×')).join('');
      $('#citaVacio').hidden = n > 0;
      $('#citaCuenta').textContent = n || '';
    }
    if (cajon.classList.contains('abierto') && cajon.dataset.vista === 'carrito') abrirCarrito(true);
  }
  function abrirCarrito(refrescar) {
    const n = carrito.length;
    abrirCajon(`<p class="eyebrow">Mi solicitud</p><h2 id="cajonTitulo">${n ? `${n} servicio${n === 1 ? '' : 's'} de interés` : 'Aún no ha añadido servicios'}</h2>
      ${n ? `<ul class="carrito-lista">${carrito.map((x) => itemHtml(x, 'Quitar')).join('')}</ul>`
        : '<p class="ayuda">Abra un área en la sección de servicios y pulse <strong>+</strong> en lo que necesite. También puede pedir la cita y contarnos su caso en el mensaje.</p>'}
      <div class="carrito-acciones"><a href="#cita" class="btn btn-oro" data-cerrar-ir>Pedir cita o cotización ${flecha}</a><a href="#areas" class="btn btn-linea" data-cerrar-ir>Seguir viendo servicios</a></div>`, 'carrito');
    if (!refrescar) setTimeout(() => $('.cerrar', cajon).focus(), 50);
  }
  $('#carritoBtn').addEventListener('click', () => abrirCarrito());
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-servicio]');
    if (b) { const [a, t] = b.dataset.servicio.split('::'); alternar(a, t); return; }
    const q = e.target.closest('[data-quitar]');
    if (q) { const [a, t] = q.dataset.quitar.split('::'); alternar(a, t); }
  });

  /* ===== Servicios: todas las áreas a la vista ===== */
  const gal = $('#galeria');
  gal.innerHTML = L.areas.map((a, i) => `<article class="area-tarjeta revelar" id="area-${a.id}">
      <figure class="area-img"><img src="${foto(fotoArea[a.id], 900)}" alt="" loading="lazy"><span class="ref">Imagen de referencia</span>
        <span class="area-num">${String(i + 1).padStart(2, '0')}</span></figure>
      <div class="area-cuerpo">
        <h3>${esc(a.nombre)}</h3>
        <p>${esc(a.resumen)}</p>
        <ul class="area-temas">${a.temas.map((t) => `<li><button type="button" class="tema" data-servicio="${esc(llave(a.id, t))}" aria-pressed="false" aria-label="Añadir ${esc(t)} a mi solicitud"><span>${esc(t)}</span><span class="mas" aria-hidden="true">+</span></button></li>`).join('')}</ul>
        <button type="button" class="btn btn-oro area-cta" data-solicitar-area="${a.id}">Solicitar asesoría ${flecha}</button>
      </div>
    </article>`).join('');
  const abrirPanel = (i) => { const t = $$('.area-tarjeta', gal)[i]; if (t) { t.classList.remove('resalta'); void t.offsetWidth; t.classList.add('resalta'); } };

  /* ===== Firma: palabras en movimiento ===== */
  const pal = L.areas.map((a) => `<span>${esc(a.corto)}</span><i>✦</i>`).join('');
  $('#palabras').innerHTML = pal + pal + pal;

  /* ===== Cómo trabajamos: relato con scroll ===== */
  const fotosPaso = ['1758519288550-1975537cff9a', '1564846824194-346b7871b855', '1551135049-8a33b5883817'];
  $('#procesoFotos').innerHTML = L.pasos.map((p, i) => `<figure class="${i === 0 ? 'activa' : ''}"><img src="${foto(fotosPaso[i % fotosPaso.length], 1000)}" alt="" loading="lazy"></figure>`).join('') + '<span class="ref">Imagen de referencia</span>';
  $('#pasos').innerHTML = L.pasos.map((p, i) => `<li class="paso${i === 0 ? ' activo' : ''}" data-i="${i}"><span class="paso-n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></div></li>`).join('');
  const pasosEl = $$('.paso'), fotosEl = $$('#procesoFotos figure');
  const activarPaso = (i) => {
    pasosEl.forEach((p, j) => p.classList.toggle('activo', j === i));
    fotosEl.forEach((f, j) => f.classList.toggle('activa', j === i));
    $('#procesoNum').textContent = String(i + 1).padStart(2, '0');
  };
  const obsPaso = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) activarPaso(+en.target.dataset.i); }), { rootMargin: '-45% 0px -45% 0px' });
  pasosEl.forEach((p) => { obsPaso.observe(p); p.addEventListener('mouseenter', () => activarPaso(+p.dataset.i)); });

  /* ===== Equipo: espacios reservados (aquí nunca se usan fotos de stock) ===== */
  const silueta = '<svg viewBox="0 0 120 140" aria-hidden="true"><circle cx="60" cy="48" r="24"/><path d="M14 140c2-30 22-50 46-50s44 20 46 50z"/></svg>';
  $('#equipoLista').innerHTML = L.equipo.map((m, i) => `<li class="miembro revelar">
      <div class="miembro-foto">${silueta}<span class="miembro-pend">Foto oficial pendiente</span>
        <div class="miembro-capa"><button type="button" class="btn btn-claro btn-sm" data-perfil="${i}">Ver perfil</button></div></div>
      <div class="miembro-texto"><h3>${esc(m.nombre)}</h3><p class="cargo">${esc(m.cargo)}</p></div></li>`).join('');
  $('#equipoLista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-perfil]'); if (!b) return;
    const m = L.equipo[+b.dataset.perfil];
    abrirCajon(`<p class="eyebrow">${esc(m.cargo)}</p><h2 id="cajonTitulo">${esc(m.nombre)}</h2>
      <p><strong>Especialidad:</strong> ${esc(m.especialidad)}</p><p>${esc(m.bio)}</p>
      <p class="ayuda">Perfil provisional. La firma lo completará desde el panel con la información y la fotografía oficial.</p>`, 'perfil');
    setTimeout(() => $('.cerrar', cajon).focus(), 50);
  });

  /* ===== Artículos ===== */
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
  $('#articulos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-art]'); if (!b) return;
    const art = L.articulos.find((x) => x.titulo === b.dataset.art);
    const area = L.areas.find((x) => x.corto.toLowerCase().startsWith(art.cat.toLowerCase().slice(0, 5)));
    abrirCajon(`<p class="eyebrow">${esc(art.cat)} · ${fecha(art.fecha)} · ${art.min} min</p><h2 id="cajonTitulo">${esc(art.titulo)}</h2><p>${esc(art.resumen)}</p>
      <p class="ayuda">El artículo completo lo publicará la firma desde el panel. Este texto es provisional.</p>
      ${area ? `<button type="button" class="btn btn-tinta" data-servicio="${esc(llave(area.id, 'Asesoría general en ' + area.corto.toLowerCase()))}"><span class="mas" aria-hidden="true">+</span> Añadir asesoría en ${esc(area.corto.toLowerCase())}</button>` : ''}`, 'articulo');
    pintarCarrito();
    setTimeout(() => $('.cerrar', cajon).focus(), 50);
  });

  /* ===== Contacto, preguntas y pie ===== */
  const canal = (label, valor, href, ext) => `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}><small>${label}</small><strong>${esc(valor)}</strong></a></li>`;
  const pendiente = (label) => `<li><div class="pend"><small>${label}</small><strong>Por confirmar</strong></div></li>`;
  $('#canales').innerHTML = canal('WhatsApp', 'Escribir ahora', c.whatsapp, true)
    + c.telefonos.map((t) => canal('Teléfono', t, `tel:+57${t.replace(/\s/g, '')}`)).join('')
    + canal('Correo', c.correo, `mailto:${c.correo}`)
    + canal('Instagram', '@litigar.abogados', c.instagram, true)
    + pendiente('Dirección') + pendiente('Horario');
  $('#faqs').innerHTML = L.faqs.map((f) => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('');
  $('#pieAreas').innerHTML = L.areas.map((a, i) => `<li><a href="#area-${a.id}" data-abrir-area="${i}">${esc(a.corto)}</a></li>`).join('');
  $('#pieContacto').innerHTML = c.telefonos.map((t) => `<li><a href="tel:+57${t.replace(/\s/g, '')}">${t}</a></li>`).join('')
    + `<li><a href="mailto:${c.correo}">${c.correo}</a></li><li><a href="${c.instagram}" target="_blank" rel="noopener">Instagram</a></li>`;
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-abrir-area]'); if (a) abrirPanel(+a.dataset.abrirArea); });

  /* ===== Ventanas legales ===== */
  const modal = $('#modal');
  const legales = {
    privacidad: `<h2>Política de privacidad</h2><p class="nota-prov">Documento pendiente</p>
      <p>La firma redactará este documento. Debe explicar qué información recoge el sitio, para qué la usa, cuánto tiempo la conserva y cómo puede el usuario ejercer sus derechos.</p>`,
    datos: `<h2>Tratamiento de datos personales</h2><p class="nota-prov">Documento pendiente · Ley 1581 de 2012</p>
      <p>Texto provisional. Al enviar una solicitud, usted autoriza a Litigar Group S.A.S. a tratar sus datos personales para atender su solicitud y contactarle. Puede conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización, escribiendo a ${c.correo}.</p>
      <p>La política definitiva (responsable, finalidades, derechos del titular y procedimiento de consultas y reclamos) la redactará y aprobará la firma.</p>`,
  };
  $('[data-cerrar]', modal).addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  document.addEventListener('click', (e) => { const m = e.target.closest('[data-modal]'); if (m) { $('#modalCuerpo').innerHTML = legales[m.dataset.modal]; modal.showModal(); } });

  /* ===== Formulario único: cita o cotización ===== */
  const cf = $('#citaForm'), cErr = $('#citaError');
  const hoy = new Date();
  const iso = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const limitesFecha = () => { const f = $('#c-fecha'); f.min = iso(hoy); f.max = iso(new Date(hoy.getTime() + 120 * 864e5)); };
  const tipoActual = () => ($('input[name=tipo]:checked', cf) || {}).value || 'cita';
  const pintarTipo = () => {
    const cot = tipoActual() === 'cotizacion';
    $('#soloCita').hidden = cot; cf.classList.toggle('es-cotizacion', cot);
    $('#citaBoton').textContent = cot ? 'Pedir cotización' : 'Solicitar cita';
    $('#citaNota').textContent = cot ? 'Los campos con * son obligatorios. Le enviaremos la cotización por el medio que indique.'
      : 'Los campos con * son obligatorios. La fecha es una preferencia; la cita queda confirmada cuando el equipo le contacte.';
  };
  cf.addEventListener('change', (e) => { if (e.target.name === 'tipo') pintarTipo(); });
  limitesFecha(); pintarTipo();

  // Validación común a los dos formularios; devuelve [campo, mensaje] o null
  function revisar(d) {
    if (d.nombre.length < 2) return ['nombre', 'Escriba su nombre.'];
    if (d.apellido.length < 2) return ['apellido', 'Escriba su apellido.'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo)) return ['correo', 'Revise el correo electrónico.'];
    if (!/^[+\d\s()-]{7,20}$/.test(d.telefono)) return ['tel', 'Revise el número de teléfono.'];
    if (d.tipo === 'cotizacion' && !d.servicios.length && d.mensaje.length < 10) return ['mensaje', 'Para cotizar, elija al menos un tema o cuéntenos qué necesita en el mensaje.'];
    if (!d.consentimiento) return [null, 'Debe autorizar el tratamiento de datos para enviar la solicitud.'];
    return null;
  }
  async function enviar(d) {
    if (C.supabaseUrl && C.supabaseKey) {
      // solicitar_cita valida y guarda en el servidor; el público no puede leer la tabla.
      const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/solicitar_cita`, {
        method: 'POST', headers: { apikey: C.supabaseKey, Authorization: `Bearer ${C.supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: Object.assign({}, d, { politica_version: C.politicaVersion || 'provisional-2026-11' }) }),
      });
      const t = await r.json().catch(() => null);
      if (!r.ok) throw new Error((t && t.message) || 'Error ' + r.status);
      return { codigo: t, real: true };
    }
    const db = L.store.leer() || L.semilla(); db.citas = db.citas || [];
    const codigo = `CIT-${hoy.getFullYear()}-${String(db.citas.length + 1).padStart(5, '0')}`;
    db.citas.unshift(Object.assign({ id: codigo, estado: 'pendiente', creada: new Date().toISOString(), notas: '' }, d)); L.store.guardar(db);
    return { codigo, real: false };
  }
  const mensajeError = (err) => `No pudimos enviar su solicitud${/Demasiadas|fecha|autoriz|servicio|cotizar/.test(err.message) ? ': ' + esc(err.message) : ''}. Intente de nuevo o <a href="${c.whatsapp}" target="_blank" rel="noopener">escríbanos por WhatsApp</a>.`;
  const exitoHtml = (d, res) => `<div class="cita-exito"><svg class="check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
      <h3 tabindex="-1" id="citaOk">Recibimos su solicitud, ${esc(d.nombre)}</h3><p>Su código de seguimiento es</p><div class="codigo">${esc(res.codigo)}</div>
      <p>${d.tipo === 'cita' ? 'Una persona del equipo le contactará para confirmar el día y la hora. Hasta entonces la cita no está confirmada.' : 'El equipo revisará lo que necesita y le enviará la cotización por el medio que indicó.'}</p>
      ${res.real ? '' : '<p class="aviso-demo"><strong>Vista previa:</strong> se guardó solo en este navegador; no se envió a la firma.</p>'}</div>`;

  /* ===== Formulario rápido por área (en el cajón lateral) ===== */
  function formularioArea(id) {
    const a = L.areas.find((x) => x.id === id);
    const temas = [...a.temas, 'Otro asunto de ' + a.corto.toLowerCase()];
    abrirCajon(`<p class="eyebrow">Solicitud de asesoría</p><h2 id="cajonTitulo">${esc(a.nombre)}</h2>
      <form class="form-area" id="formArea" novalidate data-area="${a.id}">
        <div class="tipo" role="radiogroup" aria-label="Tipo de solicitud">
          <label><input type="radio" name="atipo" value="cita" checked><span>Agendar cita</span></label>
          <label><input type="radio" name="atipo" value="cotizacion"><span>Pedir cotización</span></label>
          <i class="tipo-marca" aria-hidden="true"></i>
        </div>
        <fieldset class="cita-bloque"><legend class="cita-etq">¿Sobre qué tema? (puede elegir varios)</legend>
          <div class="temas-check">${temas.map((t) => `<label><input type="checkbox" value="${esc(t)}"${enCarrito(a.id, t) ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></fieldset>
        <div class="campos-dos">
          <div class="campo"><label for="a-nombre">Nombre *</label><input id="a-nombre" maxlength="80" autocomplete="given-name"></div>
          <div class="campo"><label for="a-apellido">Apellido *</label><input id="a-apellido" maxlength="80" autocomplete="family-name"></div>
        </div>
        <div class="campos-dos">
          <div class="campo"><label for="a-correo">Correo *</label><input id="a-correo" type="email" maxlength="120" autocomplete="email"></div>
          <div class="campo"><label for="a-tel">Teléfono *</label><input id="a-tel" type="tel" maxlength="20" autocomplete="tel"></div>
        </div>
        <div class="campo" id="aModalidad"><label for="a-modalidad">¿Cómo prefiere la cita?</label><select id="a-modalidad"><option value="videollamada">Videollamada</option><option value="presencial">Presencial</option><option value="llamada">Llamada</option></select></div>
        <div class="campo"><label for="a-mensaje">Cuéntenos brevemente su caso (opcional)</label><textarea id="a-mensaje" maxlength="2000" rows="3"></textarea></div>
        <label class="consentimiento"><input type="checkbox" id="a-consent"><span>Autorizo a Litigar Group S.A.S. a tratar mis datos personales para atender esta solicitud, de acuerdo con la <button type="button" data-modal="datos">política de tratamiento de datos</button>. *</span></label>
        <div class="trampa" aria-hidden="true"><label>No llenar este campo<input id="a-web" tabindex="-1" autocomplete="off"></label></div>
        <p class="error" id="aError" role="alert"></p>
        <button class="btn btn-oro btn-enviar" type="submit"><span id="aBoton">Solicitar cita</span> ${flecha}</button>
        <p class="obligatorios">La cita queda confirmada cuando una persona del equipo le contacte.</p>
      </form>`, 'area');
    setTimeout(() => $('#a-nombre').focus(), 80);
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-solicitar-area]'); if (b) formularioArea(b.dataset.solicitarArea); });
  cajon.addEventListener('change', (e) => {
    if (e.target.name !== 'atipo') return;
    const cot = e.target.value === 'cotizacion', f = $('#formArea');
    f.classList.toggle('es-cotizacion', cot); $('#aModalidad').hidden = cot;
    $('#aBoton').textContent = cot ? 'Pedir cotización' : 'Solicitar cita';
  });
  cajon.addEventListener('submit', async (e) => {
    if (e.target.id !== 'formArea') return;
    e.preventDefault();
    const f = e.target, area = f.dataset.area, err = $('#aError'), v = (id) => $('#' + id, f).value.trim();
    $$('.campo.mal', f).forEach((x) => x.classList.remove('mal')); err.textContent = '';
    const tipo = $('input[name=atipo]:checked', f).value;
    const temas = $$('.temas-check input:checked', f).map((x) => x.value);
    const d = { tipo, nombre: v('a-nombre'), apellido: v('a-apellido'), correo: v('a-correo'), telefono: v('a-tel'),
      areas: [area], servicios: temas.map((t) => `${nombreArea(area)} · ${t}`),
      modalidad: tipo === 'cita' ? $('#a-modalidad', f).value : null, fecha_preferida: '', franja: '',
      mensaje: v('a-mensaje'), consentimiento: $('#a-consent', f).checked, web: v('a-web') };
    const mal = revisar(d);
    if (mal) { if (mal[0]) { const i = $('#a-' + mal[0], f); i.closest('.campo').classList.add('mal'); i.focus(); } err.textContent = mal[1]; return; }
    if (d.web) return; // campo trampa
    const btn = $('.btn-enviar', f); btn.disabled = true; btn.classList.add('cargando'); $('#aBoton').textContent = 'Enviando…';
    let res;
    try { res = await enviar(d); } catch (er) {
      btn.disabled = false; btn.classList.remove('cargando'); $('#aBoton').textContent = tipo === 'cita' ? 'Solicitar cita' : 'Pedir cotización';
      err.innerHTML = mensajeError(er); return;
    }
    f.outerHTML = exitoHtml(d, res);
    $('#citaOk', cajon).focus({ preventScroll: true });
    // Los temas ya enviados salen del carrito
    carrito = carrito.filter((x) => x.area !== area); guardar(); pintarCarrito();
  });

  cf.addEventListener('submit', async (e) => {
    e.preventDefault(); cErr.textContent = '';
    $$('.campo.mal', cf).forEach((x) => x.classList.remove('mal'));
    const v = (id) => $('#' + id).value.trim();
    const tipo = tipoActual(), cita = tipo === 'cita';
    const d = { tipo, nombre: v('c-nombre'), apellido: v('c-apellido'), correo: v('c-correo'), telefono: v('c-tel'),
      areas: [...new Set(carrito.map((x) => x.area))], servicios: carrito.map((x) => `${nombreArea(x.area)} · ${x.tema}`),
      modalidad: cita ? ($('input[name=modalidad]:checked', cf) || {}).value : null,
      fecha_preferida: cita ? v('c-fecha') : '', franja: cita ? $('#c-franja').value : '',
      mensaje: v('c-mensaje'), consentimiento: $('#c-consent').checked, web: v('c-web') };
    const falla = (id, m) => { if (id) { $('#' + id).closest('.campo').classList.add('mal'); $('#' + id).focus(); } cErr.textContent = m; };
    if (d.fecha_preferida && (d.fecha_preferida < $('#c-fecha').min || d.fecha_preferida > $('#c-fecha').max)) return falla('c-fecha', 'Elija una fecha entre hoy y los próximos cuatro meses.');
    const mal = revisar(d);
    if (mal) return falla(mal[0] && 'c-' + mal[0], mal[1]);
    if (d.web) return; // campo trampa: lo llenó un bot
    const btn = $('.btn-enviar', cf), txt = $('#citaBoton'); btn.disabled = true; btn.classList.add('cargando'); txt.textContent = 'Enviando…';
    let res;
    try { res = await enviar(d); } catch (err) {
      btn.disabled = false; btn.classList.remove('cargando'); pintarTipo();
      cErr.innerHTML = mensajeError(err);
      return;
    }
    const cuerpo = $('#citaCuerpo'), previo = cuerpo.innerHTML;
    cuerpo.innerHTML = exitoHtml(d, res) + '<p style="text-align:center"><button type="button" class="btn btn-linea btn-sm" id="citaOtra">Enviar otra solicitud</button></p>';
    $('#citaOk').focus({ preventScroll: true });
    carrito = []; try { localStorage.removeItem(CLAVE); } catch (e2) {}
    $('#citaOtra').addEventListener('click', () => { cuerpo.innerHTML = previo; cf.reset(); limitesFecha(); pintarTipo(); pintarCarrito(); });
    pintarCarrito();
  });

  /* ===== Movimiento ===== */
  const prog = $('#progreso');
  const enVista = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const paralaje = $$('[data-vel]'), palabras = $('#palabras'), heroImg = $('.hero-foto img');
  let pedido = false;
  function cuadro() {
    pedido = false;
    prog.style.transform = `scaleX(${scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
    if (reducir) return;
    if (heroImg && scrollY < innerHeight) heroImg.style.translate = `0 ${scrollY * .25}px`;
    paralaje.forEach((el) => { if (!enVista(el)) return; const r = el.getBoundingClientRect(); el.style.translate = `0 ${(r.top + r.height / 2 - innerHeight / 2) * +el.dataset.vel}px`; });
    if (enVista(palabras)) palabras.style.transform = `translateX(${-((scrollY * .35) % (palabras.scrollWidth / 3))}px)`;
  }
  addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(cuadro); } }, { passive: true });
  cuadro();

  if (!reducir) {
    // Titulares que suben palabra por palabra
    $$('h2.revelar').forEach((h) => {
      if (h.children.length) return;
      h.classList.add('partir');
      h.innerHTML = h.textContent.trim().split(/\s+/).map((w, i) => `<span class="pal"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
    });
    // Cifras que cuentan al aparecer
    const obsCifra = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return; obsCifra.unobserve(en.target);
      const el = en.target, m = el.textContent.match(/^(\D*)(\d+)(.*)$/); if (!m) return;
      const fin = +m[2], t0 = performance.now();
      const paso = (t) => { const k = Math.min(1, (t - t0) / 1600); el.textContent = m[1] + Math.round(fin * (1 - Math.pow(1 - k, 3))) + m[3]; if (k < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    }), { threshold: .6 });
    $$('.firma-datos dt').forEach((el) => obsCifra.observe(el));
    if (puntero) {
      // Botones dorados con leve atracción magnética
      $$('.btn-oro').forEach((b) => {
        b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * .12}px ${(e.clientY - r.top - r.height / 2) * .2}px`; });
        b.addEventListener('pointerleave', () => (b.style.translate = ''));
      });
    }
  }

  pintarCarrito();
  observar();
})();
