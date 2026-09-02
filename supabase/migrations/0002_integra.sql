-- ============================================================
-- 0002 · Conectar Comercial con el resto de Integra
--
-- Hasta acá el módulo era un tracker de ventas cerrado sobre sí
-- mismo: "Ganado" no escribía nada fuera del esquema comercial.
-- Esta migración agrega el puente.
--
-- Tres cosas:
--   1. proyecto_id  -> ganar una oportunidad crea el proyecto en
--                      public.proyectos, que es lo que ven Compras,
--                      Víveres, Reparaciones y Finanzas.
--   2. tarifas      -> movilización, desmovilización, día garantizado
--                      y tarifa diferencial son cuatro números, no
--                      uno. Con esto el ingreso de cada operación se
--                      puede calcular antes de que exista la factura.
--   3. motivo       -> "Perdido" sin motivo no sirve para nada.
--
-- Correr desde Supabase -> SQL Editor -> Run.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Campos nuevos en oportunidades
-- ------------------------------------------------------------
alter table comercial.oportunidades
  -- Con quién se firma ya está en `compania`. Esto es para quién es
  -- el trabajo: Golondrina va por Service Management y el cliente
  -- final es Raízen. Hoy ese dato no existe en ninguna tabla.
  add column if not exists cliente_final text,

  -- Texto libre por ahora. Pasa a FK cuando se unifique el maestro
  -- contra public.mant_buques, que es la única tabla real de buques.
  add column if not exists buque text,

  add column if not exists estructura_tarifaria text not null default 'diaria',
  add column if not exists motivo_perdida text,
  add column if not exists competidor text,

  -- El puente. on delete set null: si alguien borra el proyecto, la
  -- oportunidad no se va con él.
  add column if not exists proyecto_id uuid
    references public.proyectos(id) on delete set null;

create index if not exists ix_com_opp_proyecto
  on comercial.oportunidades (proyecto_id)
  where proyecto_id is not null;

do $bloque$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'oportunidades_estructura_check'
  ) then
    alter table comercial.oportunidades
      add constraint oportunidades_estructura_check
      check (estructura_tarifaria in
             ('diaria','mov_desmov_garantizado','precio_cerrado','otra'));
  end if;
end $bloque$;

-- ------------------------------------------------------------
-- 2) Las dos reglas que le dan sentido al circuito
--
-- NOT VALID a propósito: se aplican a todo lo que se inserte o
-- modifique de acá en adelante, y no revisan las filas que ya
-- están. Hoy ninguna de las 20 filas migradas del Excel está en
-- Ganado ni en Perdido, así que en la práctica no cambia nada —
-- pero si alguien cerró alguna desde entonces, el script igual
-- corre en lugar de fallar a la mitad.
--
-- Para exigirlas también sobre lo viejo, una vez que esas filas
-- estén completas:
--   alter table comercial.oportunidades validate constraint opp_ganado_con_proyecto;
--   alter table comercial.oportunidades validate constraint opp_perdido_con_motivo;
-- ------------------------------------------------------------
do $bloque$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'opp_ganado_con_proyecto'
  ) then
    alter table comercial.oportunidades
      add constraint opp_ganado_con_proyecto
      check (estadio <> 'Ganado' or proyecto_id is not null) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'opp_perdido_con_motivo'
  ) then
    alter table comercial.oportunidades
      add constraint opp_perdido_con_motivo
      check (estadio <> 'Perdido'
             or (motivo_perdida is not null and length(trim(motivo_perdida)) > 0))
      not valid;
  end if;
end $bloque$;

-- ------------------------------------------------------------
-- 3) Conceptos tarifarios
--
-- `valor` y `costo` siguen existiendo y siguen alimentando el
-- dashboard. Esta tabla es otra cosa: el desglose de CÓMO se cobra,
-- que es lo que después se cruza contra las fechas de la operación.
-- ------------------------------------------------------------
create table if not exists comercial.oportunidad_tarifas (
  id              uuid primary key default gen_random_uuid(),
  oportunidad_id  uuid not null
    references comercial.oportunidades(id) on delete cascade,

  concepto        text not null
    check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                        'tarifa_diaria','tarifa_diferencial','standby',
                        'precio_cerrado','otro')),
  detalle         text,

  unidad          text not null default 'global'
    check (unidad in ('dia','hora','viaje','global')),

  monto           numeric(14,2) not null,
  cantidad        numeric(10,2),

  -- Para la tarifa diferencial: a partir de cuántas horas aplica.
  aplica_desde_horas int,

  orden           int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ix_com_tarifas_opp
  on comercial.oportunidad_tarifas (oportunidad_id, orden);

-- ------------------------------------------------------------
-- 4) Historial
--
-- El usuario sale de la sesión, no de un campo de texto. Es el
-- defecto que tiene hoy Víveres, y no vale la pena repetirlo.
-- ------------------------------------------------------------
create table if not exists comercial.oportunidad_historial (
  id              uuid primary key default gen_random_uuid(),
  oportunidad_id  uuid not null
    references comercial.oportunidades(id) on delete cascade,
  estadio_anterior text,
  estadio_nuevo   text not null,
  nota            text,
  usuario_id      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists ix_com_historial_opp
  on comercial.oportunidad_historial (oportunidad_id, created_at desc);

-- ------------------------------------------------------------
-- 5) RLS · mismo criterio que las tablas de 0001
-- ------------------------------------------------------------
alter table comercial.oportunidad_tarifas   enable row level security;
alter table comercial.oportunidad_historial enable row level security;

drop policy if exists "authenticated_all_tarifas" on comercial.oportunidad_tarifas;
create policy "authenticated_all_tarifas" on comercial.oportunidad_tarifas
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_historial" on comercial.oportunidad_historial;
create policy "authenticated_all_historial" on comercial.oportunidad_historial
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 6) La vista del dashboard toma las columnas nuevas
-- ------------------------------------------------------------
create or replace view comercial.oportunidades_resumen as
select
  o.*,
  case when o.valor = 0 then null else (o.valor - o.costo) / o.valor end as margen,
  (o.valor - o.costo) as ganancia
from comercial.oportunidades o;

-- ------------------------------------------------------------
-- 7) Ver cómo quedó
-- ------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'comercial' and table_name = 'oportunidades'
  and column_name in ('cliente_final','buque','estructura_tarifaria',
                      'motivo_perdida','competidor','proyecto_id')
order by column_name;
