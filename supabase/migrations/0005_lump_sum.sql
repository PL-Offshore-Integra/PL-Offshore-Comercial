-- ============================================================
-- 0005 · "Precio cerrado" pasa a llamarse Lump Sum
--
-- Se cambia tambien el valor guardado, no solo la etiqueta: si en
-- la empresa se dice "lump sum", tener 'precio_cerrado' en la base
-- es la clase de desfasaje que despues nadie recuerda.
--
-- Corre igual si 0004 ya se ejecuto o si no: primero mueve las
-- filas y despues cambia los checks, asi ninguna queda fuera de los
-- valores permitidos.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0004.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Estructura de cotizacion
-- ------------------------------------------------------------
alter table comercial.oportunidades
  drop constraint if exists oportunidades_estructura_check;

update comercial.oportunidades
set estructura_tarifaria = 'lump_sum'
where estructura_tarifaria = 'precio_cerrado';

alter table comercial.oportunidades
  add constraint oportunidades_estructura_check
  check (estructura_tarifaria in
         ('diaria','daily_hire_mob_desmob','lump_sum','otra'));

-- ------------------------------------------------------------
-- 2) El concepto tarifario homonimo
-- ------------------------------------------------------------
alter table comercial.oportunidad_tarifas
  drop constraint if exists oportunidad_tarifas_concepto_check;

update comercial.oportunidad_tarifas
set concepto = 'lump_sum'
where concepto = 'precio_cerrado';

alter table comercial.oportunidad_tarifas
  add constraint oportunidad_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'lump_sum','otro'));

-- ------------------------------------------------------------
-- 3) Ver como quedo
-- ------------------------------------------------------------
select estructura_tarifaria, count(*)
from comercial.oportunidades
group by estructura_tarifaria
order by estructura_tarifaria;
