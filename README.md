# Comercial

App de seguimiento comercial que reemplaza el tracker
`Tacker Ventas-Calendario Ferias -.xlsx`: pipeline de oportunidades (CRM) y
calendario de ferias/eventos del sector, para Terra Mare, Clean Sea, Parana
Logistica y HF Offshore.

Stack: Next.js (App Router) + TypeScript + Supabase (datos y Auth). Estetica
y layout tomados del modulo Compras: sistema de marca "INTEGRA Brand Book
v1.0" (IBM Plex Sans/Mono, navy `#002247` para la instancia PL Offshore),
mismo shell (barra superior + sidebar) y misma pantalla de login.

- GitHub: https://github.com/PL-Offshore-Integra/PL-Offshore-Comerical
- Supabase (proyecto compartido, esquema propio `comercial`):
  https://supabase.com/dashboard/project/mwrhonkvcyyueixbdrat
- Vercel: https://vercel.com/terracompras-projects

## Setup local

```bash
npm install
cp .env.local.example .env.local
# completar NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY
# desde https://supabase.com/dashboard/project/mwrhonkvcyyueixbdrat/settings/api
npm run dev
```

## Base de datos

Las tablas viven en el esquema `comercial` (no en `public`), para no chocar
con otras tablas del mismo proyecto Supabase (ej. `proveedores`).

1. Abrir el SQL Editor del proyecto Supabase.
2. Correr `supabase/migrations/0001_init.sql` (crea el esquema, las tablas y
   las policies de RLS).
3. Correr `supabase/seed.sql` para cargar los datos actuales del tracker
   (20 oportunidades, 16 eventos).
4. En **Project Settings > API > Exposed schemas**, agregar `comercial` a la
   lista de esquemas expuestos (por defecto solo `public` esta expuesto), o
   el cliente de Supabase no va a poder leer/escribir estas tablas.

## Usuarios (login)

No hay alta de usuarios publica: el acceso es por invitacion. Para crear el
primer usuario, en el dashboard de Supabase ir a **Authentication > Users >
Add user**, cargar email y contrasena, y compartirle esos datos a la persona.
Cualquier usuario de Supabase Auth del proyecto puede loguearse.

## Deploy

1. `git push` a `main` en GitHub.
2. En Vercel (team `terracompras-projects`), importar el repo
   `PL-Offshore-Integra/PL-Offshore-Comerical`.
3. Configurar las mismas variables de entorno que en `.env.local` en el
   proyecto de Vercel.

## Estructura

- `app/login` — pantalla de acceso (Supabase Auth, email + contrasena).
- `app/(app)/layout.tsx` — exige sesion activa y arma el shell (barra
  superior + sidebar + encabezado de pantalla).
- `app/(app)/oportunidades` — pipeline de oportunidades, agrupado por estadio.
- `app/(app)/calendario` — calendario de ferias/eventos y participacion por empresa.
- `app/(app)/dashboard` — ganancia total, por empresa y por proyecto.
- `components/Shell.tsx` — navegacion y encabezado, estilo modulo Compras.
- `proxy.ts` — refresca la sesion de Supabase en cada request (antes
  `middleware.ts`; Next.js 16 renombro la convencion a "Proxy").
- `supabase/migrations` — esquema SQL.
- `supabase/seed.sql` — datos iniciales migrados del Excel original.
