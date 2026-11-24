# LITIGAR · Plataforma de gestión jurídica

Sitio web y sistema administrativo de **Litigar Group S.A.S. · Abogados & Asesores**.

- **Tipo:** plataforma de gestión jurídica
- **Base de datos:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Estado:** preview para presentar al cliente

## Estructura

```
preview/                  Sitio público y panel (HTML, CSS y JS sin compilación)
  index.html              Página pública
  admin/index.html        Panel administrativo (Supabase Auth o modo demostración)
  config.js               Configuración pública: URL de Supabase y clave publicable
  assets/css, js, img     Estilos, lógica y logo
supabase/
  migrations/             Esquema de Litigar: tablas, RLS, funciones, triggers y storage

docs/PROPUESTA.md         Análisis, dirección creativa, arquitectura y modelo de datos
.env.example              Secretos del servidor (solo como referencia; nunca se suben)
```

## Ver el preview

Desde la carpeta del proyecto:

```bash
python -m http.server 5510 --directory preview
```

Abrir http://localhost:5510 para el sitio y http://localhost:5510/admin/ para el panel.

## Qué funciona y qué no

| Funciona en el preview | Pendiente para producción |
|---|---|
| Sitio completo: áreas, proceso, equipo, artículos, contacto y preguntas frecuentes | Crear el primer administrador (paso 3 de abajo) |
| Asistente de solicitud con validación y consentimiento: **guarda en Supabase** mediante `crear_solicitud()`, que clasifica en el servidor | Invitar integrantes desde el panel (requiere Edge Function) |
| Formulario **Agendar cita** (áreas de interés, modalidad, fecha preferida): guarda en Supabase con `solicitar_cita()`; el panel las gestiona en el módulo Citas | Calendario con disponibilidad real (hoy la fecha es una preferencia que el equipo confirma) |
| Base de datos de Litigar aplicada en Supabase, con RLS en las 18 tablas y los buckets `documentos` (privado) y `sitio` | Correos de confirmación y aviso (Edge Function + SMTP) |
| Panel conectado: inicio de sesión con Supabase Auth; lee y edita solicitudes, notas, clientes, casos, actividades, reglas y auditoría con los permisos de RLS | Subida de documentos al bucket privado |
| Modo demostración del panel con datos ficticios (solo en el navegador) | Editar el contenido del sitio desde el panel (hoy se edita en `datos.js`) |
| | Alertas programadas (pg_cron) |

El panel tiene dos entradas. **Iniciar sesión**: Supabase Auth; solo entran cuentas con rol asignado y activo, y cada rol ve lo que RLS le permite. **Modo demostración**: datos ficticios en localStorage, sin tocar Supabase, y lo indica en pantalla. Si se vacía `config.js`, sitio y panel quedan solo en modo demostración.

Los textos sobre la firma marcados como *Provisional* o *Por confirmar* deben reemplazarse con información confirmada por Litigar. No se inventaron nombres, cifras ni casos: las áreas y los temas salen del Instagram de la firma.

## Conectar Supabase

Pasos 1 y 2 hechos el 2026-11-24 en el proyecto `kycetxzvdhaqjkxcduwq`; quedan el 3 y el 4.

1. Ejecutar las migraciones de `supabase/migrations/` en orden, en el SQL Editor o con `supabase db push`.
2. En `preview/config.js`, poner la URL del proyecto y la **clave publicable** (`sb_publishable_…` o `anon`). Nunca poner la `service_role`.
3. Crear el primer administrador:
   - Invitar al usuario desde Authentication.
   - Ejecutar en SQL: `update public.perfiles set rol = 'admin', activo = true where correo = 'correo@litigar.co';`
4. En Authentication → URL Configuration, poner la URL pública del sitio.

## Seguridad

- **RLS** está activado en todas las tablas:
  - El público solo lee el contenido publicado.
  - El público solo crea solicitudes mediante `crear_solicitud()`, que valida y clasifica en el servidor.
  - Los abogados solo ven sus solicitudes y casos asignados.
- **Documentos jurídicos** en el bucket privado `documentos`, con acceso por caso y URL firmadas.
- **Auditoría** escrita por triggers. El panel no puede editarla.
- **Consentimiento:** se guardan la fecha y la versión de la política de tratamiento de datos (Ley 1581 de 2012).
- **Clasificación:** la puntuación solo ordena la bandeja. No es una evaluación jurídica ni acepta casos.
- **Claves:** el frontend nunca contiene claves secretas. Los secretos van en Supabase (Edge Function secrets) y siguen el formato de `.env.example`.
