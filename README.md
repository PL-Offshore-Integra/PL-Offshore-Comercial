# Comercial

App de seguimiento comercial que reemplaza el tracker
`Tacker Ventas-Calendario Ferias -.xlsx`: pipeline de oportunidades (CRM) y
calendario de ferias/eventos del sector, para Terra Mare, Clean Sea, Parana
Logistica y HF Offshore.

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase.

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

## Deploy

1. `git push` a `main` en GitHub.
2. En Vercel (team `terracompras-projects`), importar el repo
   `PL-Offshore-Integra/PL-Offshore-Comerical`.
3. Configurar las mismas variables de entorno que en `.env.local` en el
   proyecto de Vercel.

## Estructura

- `app/oportunidades` — pipeline de oportunidades, agrupado por estadio.
- `app/calendario` — calendario de ferias/eventos y participacion por empresa.
- `app/dashboard` — ganancia total, por empresa y por proyecto.
- `supabase/migrations` — esquema SQL.
- `supabase/seed.sql` — datos iniciales migrados del Excel original.
