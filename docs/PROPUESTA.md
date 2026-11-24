# Litigar Group S.A.S.: propuesta de plataforma (preview)

Este documento recoge el análisis previo y las decisiones de diseño y de arquitectura. El preview está en `preview/` y la base de datos en `supabase/schema.sql`.

## 1. Análisis de la referencia (contenido y estructura, no diseño)

Sitio analizado: pelaezabogadosyasociados.com.

| Lo que tiene la referencia | Qué hacemos en Litigar |
|---|---|
| Menú corto: Inicio, Quiénes somos, Abogados, Áreas, Prensa, Contáctanos | Lo mantenemos corto: Firma, Áreas, Cómo trabajamos, Equipo, Conocimiento y Contacto, más un botón fijo "Iniciar solicitud" |
| 8 áreas en tarjetas iguales con "Ver más" que no lleva a nada | Áreas en formato índice interactivo, con ficha ampliada real y una solicitud precargada por área |
| Sin misión, visión ni valores formales | Bloque institucional con filosofía, enfoque y valores, marcado como provisional hasta que la firma lo confirme |
| Equipo que mezcla internos y aliados, sin especialidad | Ficha con foto, cargo, especialidad y bio, administrada desde el panel |
| "Prensa" con notas de terceros | Centro de conocimiento con artículos propios, categorías y destacados |
| Formulario genérico sin aviso de datos personales | Captación por preguntas progresivas, con consentimiento según la Ley 1581 de 2012 y clasificación interna |
| Muchos enlaces que llevan a "#", sin política de privacidad | Ningún enlace muerto: lo pendiente se muestra como "por confirmar" |
| Fortalezas: teléfonos y sedes siempre visibles, WhatsApp flotante | Las conservamos: contacto en el header y el footer, y WhatsApp flotante |

## 2. Identidad visual real (logo e Instagram)

- **Nombre:** Litigar Group S.A.S., Abogados & Asesores.
- **Bio de Instagram:** firma de abogados y contadores especialistas en Derecho & Finanzas, con "+250 casos exitosos".
- **Logo:** una columna clásica junto a una L y una flecha ascendente dorada. Representa la ley (la columna) y las finanzas (la trayectoria).
- **Colores tomados del logo y de las publicaciones:**
  - Azul marino profundo: `#0B1626` y `#13284A`
  - Azul eléctrico de los resaltados de los posts: `#2F6BEA`
  - Dorado del logo y de los subrayados: `#C9A44C`
  - Blanco
- **Voz de marca en Instagram:**
  - Titulares directos en forma de pregunta ("¿Declaras renta?", "¿Conoces sobre el despido indirecto?")
  - Frases como "Los problemas legales rara vez empiezan siendo grandes" y "Especialidad. Estrategia. Cercanía."
- **Áreas que aparecen en Instagram:**
  - Mencionadas en los posts: Derecho de Familia, Derecho Laboral, Derecho Civil y Seguridad Social
  - Por los temas que publican: Tributario y declaración de renta
  - En el preview figuran como **provisionales**.
- **Contacto que aparece en los posts:** 315 050 6085, 318 239 1588, info@litigar.co y el enlace de WhatsApp que entregó el cliente.
- **Falta verificar:**
  - www.litigar.com responde sin contenido legible y litigar.co da error 404.
  - El logo disponible mide 150 px. Para producción hace falta el archivo vectorial.

## 3. Dirección creativa: "La columna y la trayectoria"

El concepto sale del propio logo: **la columna** representa la solidez jurídica y **la trayectoria ascendente** representa la estrategia y el resultado.

- **Fondo:** azul marino profundo, con líneas finas doradas como hilo conductor que se dibujan al hacer scroll.
- **Tipografía:**
  - Fraunces, una serif con carácter, para los titulares; da autoridad sin caer en lo anticuado.
  - Manrope para el texto: limpia y muy legible.
- **Hero:** una composición SVG animada en la que una columna de líneas se construye y una trayectoria dorada asciende. Reacciona levemente al mouse. No usa mazos, balanzas ni fotos de banco.
- **Ritmo de composición, una distinta por sección:**
  - Hero en pantalla completa
  - Sobre la firma con texto partido y una cifra grande
  - Áreas como índice y ficha
  - Proceso como línea de tiempo que avanza
  - Equipo como galería con revelado
  - Conocimiento como revista: un destacado y una lista
  - Captación como conversación paso a paso
- **Movimiento:** solo transform y opacity, que no pesan en el rendimiento. Se respeta "reducir movimiento" del sistema.

## 4. Arquitectura de la página pública

1. Header fijo con logo, navegación, teléfono y CTA "Iniciar solicitud".
2. Hero: titular, propuesta de valor, dos CTA (solicitud y WhatsApp) y la cifra +250 tomada del Instagram.
3. Firma: quiénes son, los pilares Especialidad, Estrategia y Cercanía, y valores provisionales.
4. Áreas de práctica: índice y ficha, con detalle ampliado en un panel lateral y una solicitud precargada.
5. Cómo trabajamos: 5 pasos interactivos.
6. Equipo: fichas cargadas desde los datos, que en producción vienen del panel.
7. Centro de conocimiento: artículo destacado, filtros por categoría y fechas.
8. Captación: asistente de 7 preguntas con resumen y consentimiento.
9. Contacto y footer: canales, redes, ubicación y horario (por confirmar), política de privacidad y tratamiento de datos.

## 5. Módulos del administrador

| Módulo | Qué hace |
|---|---|
| Panel | Indicadores: nuevas, pendientes, calificadas, en evaluación, clientes, casos activos y actividad reciente |
| Solicitudes | Lista con filtros por área, prioridad y estado, búsqueda, detalle, notas internas, asignación, cambio de estado, archivo y conversión en cliente y caso |
| Clientes | Registro, solicitudes y casos asociados, historial y observaciones |
| Casos | Código único, cliente, responsable, área, estado, próximas actividades y movimientos |
| Equipo | Usuarios, roles (administrador, abogado, asistente) y especialidades |
| Contenido | Textos, áreas, equipo, artículos, preguntas frecuentes y contacto |
| Clasificación | Reglas configurables: peso por área atendida, urgencia, proceso en curso y completitud |
| Auditoría | Registro de todas las acciones importantes |

**Puntuación de calificación:** es un número de 0 a 100 que solo ordena la bandeja de entrada. **No es una evaluación jurídica ni acepta casos.** El estado sugerido siempre lo confirma una persona.

## 6. Modelo de datos (Supabase / PostgreSQL)

```
perfiles (usuario, rol) ──< perfil_especialidades >── especialidades
especialidades ──< solicitudes >── perfiles (asignado_a)
solicitudes ──< notas_solicitud
solicitudes ──> clientes ──< casos ──< actividades_caso
casos ──< movimientos_caso        documentos (cliente/caso, bucket privado)
notificaciones (usuario)          auditoria (todas las acciones)
articulos ──> categorias          contenido_sitio, preguntas_frecuentes, reglas_clasificacion
```

- **RLS en todas las tablas:**
  - El público solo lee contenido publicado.
  - El público solo crea solicitudes a través de una función que valida y clasifica en el servidor, nunca en el navegador.
  - Los abogados ven lo que tienen asignado.
  - El administrador ve todo.
- **Documentos** en un bucket privado con URL firmadas.
- **Auditoría** por triggers, para que no dependa del frontend.
- **Consentimiento:** se guardan la fecha, la versión de la política y el texto aceptado.

## 7. Automatizaciones propuestas

| Automatización | Cómo funciona | Estado en el preview |
|---|---|---|
| Clasificación y prioridad al recibir una solicitud | Función SQL `crear_solicitud` | Escrita en SQL; en el preview se simula en el navegador |
| Asignación según especialidad | Elige el abogado con esa especialidad y menos carga | Escrita en SQL |
| Historial cuando cambia el estado de un caso | Trigger hacia `movimientos_caso` | Escrita en SQL |
| Auditoría de acciones | Trigger hacia `auditoria` | Escrita en SQL |
| Notificación interna al responsable | Trigger hacia `notificaciones` | Escrita en SQL |
| Confirmación al solicitante y aviso al administrador por correo | Edge Function + SMTP. El correo no incluye la descripción del caso, solo el código | Pendiente (requiere SMTP) |
| Alertas de solicitudes sin revisar en 24 h y recordatorios de actividades | Tarea programada (pg_cron) | Pendiente |

## 8. Qué funciona en el preview y qué no

**Funciona de verdad:**
- Toda la página pública y sus interacciones
- El asistente de captación y la clasificación con las reglas configurables
- El panel administrativo navegable, con datos de demostración guardados **solo en el navegador** (localStorage)
- Una solicitud enviada desde la página aparece en el panel del mismo navegador, para mostrar el flujo completo en la presentación

**No funciona todavía, y el preview lo dice en pantalla:**
- Autenticación real
- Base de datos compartida
- Correos y notificaciones externas
- Subida de documentos

El SQL de `supabase/schema.sql` deja todo esto listo para conectar sin reconstruir el proyecto.

**Contenido provisional:** todo texto no confirmado por la firma lleva la etiqueta "Provisional" o "Por confirmar". No se inventaron nombres de abogados, años, resultados ni clientes.
