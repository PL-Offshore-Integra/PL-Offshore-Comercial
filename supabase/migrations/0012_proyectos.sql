-- ============================================================
-- 0012 · Proyectos
--
-- Una oportunidad ganada se convierte en proyecto: se editan los datos
-- que venian de la cotizacion, se les agrega lo que solo se sabe al
-- firmar (moneda, IVA, fechas reales, contrato) y queda como el
-- seguimiento del trabajo vendido.
--
-- ┌──────────────────────────────────────────────────────────────┐
-- │ OJO: esta tabla es `comercial.proyectos` y NO es             │
-- │ `public.proyectos`, el maestro de Integra que leen Finanzas, │
-- │ Compras, Viveres y Reparaciones. Son dos cosas distintas y   │
-- │ hoy no se tocan entre si (el puente se saco en 0008). El     │
-- │ cliente de la app apunta al esquema `comercial`, asi que un  │
-- │ .from("proyectos") cae ACA; para el maestro de Integra hay   │
-- │ que pedir .schema("public") explicitamente.                  │
-- └──────────────────────────────────────────────────────────────┘
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0011.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Accommodation como concepto tarifario
--
-- `standby` ya estaba en el check desde 0002; accommodation no. Los dos
-- se cotizan aparte de la estructura elegida: puede haber daily hire y
-- ademas standby y accommodation.
-- ------------------------------------------------------------
alter table comercial.oportunidad_tarifas
  drop constraint if exists oportunidad_tarifas_concepto_check;

alter table comercial.oportunidad_tarifas
  add constraint oportunidad_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','lump_sum','otro'));

-- ------------------------------------------------------------
-- 2) La tabla
--
-- Lo que viene de la oportunidad se copia, no se referencia: el
-- proyecto es lo acordado y la oportunidad queda como registro de lo
-- cotizado. Si despues se corrige el proyecto, la oportunidad no
-- cambia, y al revés tampoco.
-- ------------------------------------------------------------
create table if not exists comercial.proyectos (
  id             uuid primary key default gen_random_uuid(),
  nro_proyecto   text,
  -- Lo pone la persona: es como se lo va a llamar en la operacion.
  nombre         text not null,

  -- De donde salio. Una oportunidad da un solo proyecto.
  oportunidad_id uuid unique
    references comercial.oportunidades(id) on delete set null,

  -- Cliente: el FK manda y el texto es la foto del momento, igual que
  -- en oportunidades.
  cliente_empresa_id  uuid references comercial.cliente_empresas(id) on delete set null,
  cliente_contacto_id uuid references comercial.cliente_contactos(id) on delete set null,
  compania       text,
  contacto       text,

  buque          text,
  descripcion    text,
  alcance        text,

  -- Cuatro fechas: las dos que se estimaron al cotizar y las dos
  -- reales. Casi nunca coinciden, y las dos cosas importan: una es lo
  -- que se prometio, la otra lo que paso.
  fecha_inicio_estimada date,
  fecha_fin_estimada    date,
  fecha_inicio_real     date,
  fecha_fin_real        date,

  -- Plata. La moneda y el IVA solo se saben al firmar, asi que no
  -- vienen de la oportunidad.
  moneda         text not null default 'USD' check (moneda in ('USD','ARS')),
  iva            text not null default '21'  check (iva in ('21','exento')),
  estructura_tarifaria text not null default 'diaria'
    check (estructura_tarifaria in ('diaria','daily_hire_mob_desmob','lump_sum','otra')),
  valor          numeric(14,2) not null default 0,

  estado         text not null default 'por_arrancar'
    check (estado in ('por_arrancar','en_curso','finalizado','cancelado')),

  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ix_com_proy_empresa on comercial.proyectos (cliente_empresa_id);
create index if not exists ix_com_proy_estado  on comercial.proyectos (estado);

create unique index if not exists ux_com_proy_nro
  on comercial.proyectos (lower(nro_proyecto))
  where nro_proyecto is not null;

-- ------------------------------------------------------------
-- 3) Numeracion automatica, igual que las oportunidades
--
-- PRY-<n>-<anio>, con el contador reiniciando cada anio y el anio
-- saliendo de la fecha de alta del proyecto.
-- ------------------------------------------------------------
create table if not exists comercial.proyecto_contador (
  anio   int primary key,
  ultimo int not null default 0
);

create or replace function comercial.set_nro_proyecto()
returns trigger language plpgsql as $fn$
declare
  v_anio int;
  v_n    int;
begin
  if new.nro_proyecto is null or trim(new.nro_proyecto) = '' then
    v_anio := extract(year from coalesce(new.created_at, now()))::int;

    insert into comercial.proyecto_contador (anio, ultimo)
    values (v_anio, 1)
    on conflict (anio)
      do update set ultimo = comercial.proyecto_contador.ultimo + 1
    returning ultimo into v_n;

    new.nro_proyecto := 'PRY-' || v_n || '-' || v_anio;
  end if;
  return new;
end;
$fn$;

drop trigger if exists proyectos_set_nro on comercial.proyectos;
create trigger proyectos_set_nro
  before insert on comercial.proyectos
  for each row execute function comercial.set_nro_proyecto();

-- ------------------------------------------------------------
-- 4) Tarifas del proyecto
--
-- Copia editable de las de la oportunidad: lo cotizado queda alla, lo
-- acordado vive aca.
-- ------------------------------------------------------------
create table if not exists comercial.proyecto_tarifas (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references comercial.proyectos(id) on delete cascade,

  concepto     text not null
    check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                        'tarifa_diaria','tarifa_diferencial','standby',
                        'accommodation','lump_sum','otro')),
  detalle      text,
  unidad       text not null default 'global'
    check (unidad in ('dia','hora','viaje','global')),
  monto        numeric(14,2) not null,
  cantidad     numeric(10,2),
  aplica_desde_horas int,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists ix_com_proy_tarifas
  on comercial.proyecto_tarifas (proyecto_id, orden);

-- ------------------------------------------------------------
-- 5) Documentacion del proyecto, con el contrato aparte
--
-- Mismo bucket privado `comercial` y misma mecanica que los adjuntos
-- de oportunidad. `clase` separa el contrato firmado del resto: es el
-- documento que se busca, no uno mas de la pila.
-- ------------------------------------------------------------
create table if not exists comercial.proyecto_adjuntos (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references comercial.proyectos(id) on delete cascade,
  clase        text not null default 'otro' check (clase in ('contrato','otro')),
  nombre       text not null,
  path         text not null unique,
  tipo         text,
  tamano_bytes bigint,
  subido_por   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists ix_com_proy_adjuntos
  on comercial.proyecto_adjuntos (proyecto_id, created_at desc);

-- ------------------------------------------------------------
-- 6) RLS · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.proyectos         enable row level security;
alter table comercial.proyecto_tarifas  enable row level security;
alter table comercial.proyecto_adjuntos enable row level security;
alter table comercial.proyecto_contador enable row level security;

drop policy if exists "authenticated_all_proyectos" on comercial.proyectos;
create policy "authenticated_all_proyectos" on comercial.proyectos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_proy_tarifas" on comercial.proyecto_tarifas;
create policy "authenticated_all_proy_tarifas" on comercial.proyecto_tarifas
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_proy_adjuntos" on comercial.proyecto_adjuntos;
create policy "authenticated_all_proy_adjuntos" on comercial.proyecto_adjuntos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_proy_contador" on comercial.proyecto_contador;
create policy "authenticated_all_proy_contador" on comercial.proyecto_contador
  for all to authenticated using (true) with check (true);

-- Los grants los resuelven los default privileges de 0007, pero se
-- repiten por si esta migracion se corre en una base donde 0007 no
-- estaba.
grant select, insert, update, delete
  on comercial.proyectos, comercial.proyecto_tarifas,
     comercial.proyecto_adjuntos, comercial.proyecto_contador
  to authenticated, service_role;

-- ------------------------------------------------------------
-- 7) Ver como quedo
-- ------------------------------------------------------------
select 'proyectos' as que, count(*)::text as v from comercial.proyectos
union all select 'proximo numero',
  'PRY-' || (coalesce((select ultimo from comercial.proyecto_contador
                       where anio = extract(year from current_date)::int), 0) + 1)::text
         || '-' || extract(year from current_date)::int::text
union all select 'conceptos tarifarios validos',
  (select count(*)::text from pg_constraint
   where conname = 'proyecto_tarifas_concepto_check');
