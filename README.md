# Comercial · PL Offshore

El modulo comercial de Integra para **PL Offshore**, la naviera del grupo: dos
remolcadores de bandera argentina propios —Atlantic Dama y Golondrina de Mar—,
trabajos brokereados y venta de tonelaje de terceros.

Nacio reemplazando al tracker `Tacker Ventas-Calendario Ferias -.xlsx`, que era
un pipeline de oportunidades y un calendario de ferias. Hoy cubre el ciclo
entero —**oportunidad → proyecto → salida → factura → cobranza**—, mas el track
record de lo que hizo la empresa, el mapa de donde se trabaja, Broker PL y los
maestros (clientes, zonas, plantillas, buques).

**Alcance: solo PL Offshore.** Integra tiene modulos de otras empresas del
grupo en otros repos. Aca no se toca nada de ellas.

- GitHub: https://github.com/PL-Offshore-Integra/PL-Offshore-Comercial
- Produccion: https://pl-offshore-comercial.vercel.app
- Supabase (proyecto compartido, esquema propio `comercial`):
  https://supabase.com/dashboard/project/mwrhonkvcyyueixbdrat
- Vercel (team `terracompras-projects`): https://vercel.com/terracompras-projects

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript + Supabase (datos y Auth).
Componentes de servidor y server actions; cliente solo donde hace falta estado.
Sin libreria de UI ni de estilos: un solo `app/globals.css`.

## Design system

Vive en Claude Design y es **normativo**: cuando el sistema y una convencion
generica de diseno difieren, gana el sistema.

- **Tipografias**: Saira para titulos, numeros, marca y labels; Archivo para el
  cuerpo. H1 30/800 mayusculas, KPI 38/900, eyebrow 11 con tracking .18em.
- **Paleta**: navy `#002247` dominante (~70%), blanco (~20%), amarillo
  `#FBBC05` de acento puntual (~10%). El amarillo **nunca** es el fondo de un
  bloque grande. Gris tecnico `#5B6671` para texto secundario y datos.
- **Radio 2px y sin sombras**, en todo.
- **Sin iconos**: la ausencia es deliberada y la marca los sustituye por
  numeracion en Saira 900, tipografia y color. La unica alternativa que el
  sistema contempla —Lucide con stroke 1.5— la tiene que aprobar Marketing
  Corporativo, asi que no se usa.
- **Una desviacion consciente**, decidida por Silvestre: el sistema define Body
  13/1.55 y aca el cuerpo va en 15 (y los campos de formulario en 14). Esa
  escala esta pensada para piezas documentales —decks, A4, one-pagers—, no para
  una pantalla de carga de datos que se mira de cerca varias horas por dia.

## Setup local

```bash
npm install
cp .env.local.example .env.local
# completar NEXT_PUBLIC_SUPABASE_ANON_KEY desde
# https://supabase.com/dashboard/project/mwrhonkvcyyueixbdrat/settings/api
npm run dev
```

`SUPABASE_SERVICE_ROLE_KEY` no hace falta y no va en ningun archivo del repo:
esa clave ignora la RLS por completo y ningun archivo la usa.

## Base de datos

Las tablas viven en el esquema **`comercial`**, no en `public`, para no chocar
con las de los otros modulos del mismo proyecto Supabase. Los dos clientes
—`lib/supabase/client.ts` y `server.ts`— estan fijados a ese esquema, asi que
la app **no puede leer `public.*`**.

> **Una sola base para desarrollo y produccion. No hay staging.** Una migracion
> esta viva en el momento en que corre. Leer dos veces antes de un `delete` o
> un `alter`.

Para levantar una base de cero:

1. Correr `supabase/migrations/*.sql` **en orden numerico**, desde
   `0001_init.sql` (crea el esquema, las tablas y las policies de RLS).
2. Correr `supabase/seed.sql` (los datos del tracker original) y, si se quiere
   el historico real, las cargas de `supabase/cargas/` — ver su `LEEME.md`.
3. En **Project Settings > API > Exposed schemas**, agregar `comercial`: por
   defecto solo `public` esta expuesto y el cliente no podria leer nada.

Las migraciones se aplican por el SQL Editor del dashboard o por la Management
API (`POST /v1/projects/<ref>/database/query`, con un PAT que vive en el
entorno y nunca en el repo).

### Convenciones del SQL

- **Sin acentos ni ñ** en el cuerpo de las migraciones: el unico texto no ASCII
  que sobrevive es `·`, `—` y `°`. Los valores con acento van con escapes
  Unicode de Postgres: `U&'RM Do\00F1a Clary'`.
- Encabezado largo en castellano explicando **por que** se hace el cambio, no
  solo que hace. Cierre con un `select` de verificacion.
- Los `insert` de datos van con `on conflict do nothing`.
- **Toda vista nueva o recreada lleva `with (security_invoker = on)`** (ver
  `0041`). Un `create or replace view` sin esa opcion la deja corriendo con los
  permisos del dueno, salteando la RLS, y el Security Advisor la vuelve a
  marcar como error.
- `supabase/cargas/` no son migraciones: no cambian la forma de la base, meten
  filas, y son idempotentes.

## Usuarios y permisos

No hay alta publica: el acceso es por invitacion. Para crear un usuario, en el
dashboard de Supabase ir a **Authentication > Users > Add user**.

La RLS es `for all to authenticated using (true)` en todas las tablas:
**cualquier usuario con sesion ve todo**. No hay roles ni permisos por pantalla.

`proxy.ts` refresca la cookie de sesion en cada request (antes `middleware.ts`;
Next 16 renombro la convencion a "Proxy"). El que exige la sesion de verdad es
`app/(app)/layout.tsx`, que redirige a `/login` si no hay usuario.

## Deploy

`git push` a `main`. Vercel despliega solo. Las variables de entorno son las
mismas que en `.env.local`.

## Estructura

Once secciones, en el orden del menu:

| Pantalla | Que resuelve |
|---|---|
| `dashboard` | En que anda cada cosa y cuanto: oportunidades, proyectos y el estado de la plata por buque |
| `oportunidades` | El pipeline: lo que se cotizo y como salio |
| `proyectos` | Los trabajos ganados, con sus salidas |
| `facturacion` | Que se facturo, que se cobro, que esta vencido y que falta facturar |
| `mapa` | Donde se harian los posibles, donde se esta trabajando y donde se trabajo |
| `track-record` | Lo que hizo la empresa, imprimible y bilingue |
| `clientes` | El maestro de empresas y contactos |
| `broker` | Broker PL: el tonelaje que se puede ofrecer y la lista a la que se le ofrece |
| `plantillas` | El punto de partida de los trabajos que se repiten |
| `zonas` | Cada lugar donde se trabaja, una vez, con sus coordenadas |
| `calendario` | Ferias y conferencias del sector |

Y las piezas compartidas:

- `components/Shell.tsx` — barra superior, navegacion y encabezado de pantalla.
  En pantalla chica la navegacion **se acuesta** en vez de esconderse: un menu
  detras de un boton pediria un icono, y el design system no los admite.
- `components/Privado.tsx` — el modo privado, que tapa los importes para poder
  mostrar la pantalla en una reunion. El borroneado lo hace el CSS contra
  `data-privado` en el `<html>`, asi que **cualquier importe nuevo que se
  dibuje tiene que llevar la clase `cifra`** (o `cel-valor` si es una celda de
  tabla) para que el modo lo alcance.
- `lib/types.ts` — los tipos y las etiquetas de todo el dominio, mas los
  calculos de valor y de comision.
- `lib/clienteResolver.ts` y `lib/zonas.ts` — resuelven el cliente y la zona
  que eligio un formulario, y los crean si vinieron nuevos. Viven aparte porque
  los usan varias pantallas y tienen que crear con el mismo criterio.
- `lib/facturas.ts` — el estado de cada factura **no se guarda, se deduce** de
  si hay cobro y de la fecha de vencimiento.

## Antes de tocar el campo `buque`

Conviven dos candidatos para dejar de tenerlo como texto libre, y resuelven
preguntas distintas: `comercial.buques` —la lista de tonelaje que se ofrece, de
la que la mayoria no es de PL y nunca va a tener centro de costo— y
`public.centros_costo where es_buque`, los que PL paga, que es lo que Finanzas
necesita para imputar. **Cual alimenta el campo sigue sin decidir**, asi que
los formularios no estan enganchados a ninguno de los dos.
