-- ============================================================
-- 0006 · Numeracion de oportunidades: Ploffshore-<n>-<anio>
--
-- Reemplaza el formato PLO-0001 por Ploffshore-1-2026.
--
-- El contador arranca de nuevo en 1 cada anio, que es la
-- convencion habitual para este formato: si no se reiniciara, el
-- anio seria redundante con el orden del numero. Para que NO se
-- reinicie, ver la nota del final.
--
-- El anio sale de `fecha_creacion` (la fecha de alta que muestra el
-- formulario), no de now(): si alguien carga una oportunidad con
-- fecha del anio pasado, el numero acompana esa fecha en lugar de
-- contradecirla.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0005.
-- ============================================================

-- ------------------------------------------------------------
-- 1) El contador, un renglon por anio
--
-- Una tabla y no una secuencia, porque las secuencias no se
-- reinician solas ni saben de anios. El upsert toma un lock de
-- fila, asi que dos altas simultaneas no pueden sacar el mismo
-- numero.
-- ------------------------------------------------------------
create table if not exists comercial.oportunidad_contador (
  anio   int primary key,
  ultimo int not null default 0
);

alter table comercial.oportunidad_contador enable row level security;

drop policy if exists "authenticated_all_contador" on comercial.oportunidad_contador;
create policy "authenticated_all_contador" on comercial.oportunidad_contador
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 2) La funcion del trigger
--
-- Sigue generando SOLO cuando el numero viene vacio, asi los
-- TM-2 / TM-3 / TM-8 del tracker original quedan intactos.
-- ------------------------------------------------------------
create or replace function comercial.set_nro_oportunidad()
returns trigger language plpgsql as $fn$
declare
  v_anio int;
  v_n    int;
begin
  if new.nro_oportunidad is null or trim(new.nro_oportunidad) = '' then
    v_anio := extract(year from coalesce(new.fecha_creacion, current_date))::int;

    insert into comercial.oportunidad_contador (anio, ultimo)
    values (v_anio, 1)
    on conflict (anio)
      do update set ultimo = comercial.oportunidad_contador.ultimo + 1
    returning ultimo into v_n;

    new.nro_oportunidad := 'Ploffshore-' || v_n || '-' || v_anio;
  end if;
  return new;
end;
$fn$;

-- El trigger ya existe desde 0003 y apunta a esta misma funcion,
-- pero se recrea para que el script sea idempotente.
drop trigger if exists oportunidades_set_nro on comercial.oportunidades;
create trigger oportunidades_set_nro
  before insert on comercial.oportunidades
  for each row execute function comercial.set_nro_oportunidad();

-- ------------------------------------------------------------
-- 3) Afuera la secuencia del formato viejo
--
-- Nunca se uso: no hay ninguna fila con numero PLO-.
-- ------------------------------------------------------------
drop sequence if exists comercial.oportunidad_nro_seq;

-- ------------------------------------------------------------
-- 4) Ver como quedo
-- ------------------------------------------------------------
select 'proximo numero seria' as que,
       'Ploffshore-' ||
       (coalesce((select ultimo from comercial.oportunidad_contador
                  where anio = extract(year from current_date)::int), 0) + 1)::text ||
       '-' || extract(year from current_date)::int::text as valor
union all
select 'numeros ya cargados',
       coalesce(string_agg(nro_oportunidad, ', ' order by nro_oportunidad), '(ninguno)')
from comercial.oportunidades where nro_oportunidad is not null;

-- ------------------------------------------------------------
-- Si el contador NO tiene que reiniciarse cada anio, cambiar en la
-- funcion la linea del v_anio por un valor fijo, por ejemplo:
--
--   v_anio := 0;   -- un solo contador para siempre
--
-- y armar el texto con extract(year ...) aparte. Asi el numero
-- sigue creciendo y el anio solo describe cuando se cargo.
-- ------------------------------------------------------------
