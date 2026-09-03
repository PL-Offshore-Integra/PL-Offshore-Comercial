-- ============================================================
-- 0019 · Tercera estructura tarifaria: dia garantizado
--
-- Habia dos tipos de contratacion, Time Charter y Voyage Charter, y
-- ninguno de los dos describe como se cobra el Golondrina.
--
-- La cuenta real, tomada del calculo de "RAIZEN AGO2026 SEAWAYS
-- BALBOA" y verificada al centavo:
--
--   dia garantizado                          18.537,75
--   + horas pasadas las 24, pro rata          3.522,18   (0,2292 x 15.369,50)
--   + mobilization                           18.537,75
--   + demobilization                         18.537,75
--   ------------------------------------------------------
--   total                                    59.135,43
--
-- Con Time Charter —daily hire x dias + mob + demob— el mismo trabajo
-- daba 55.967,18: 3.168 de menos. La diferencia no es un redondeo, es
-- que las primeras 24 h se cobran a una tarifa y lo que pasa de ahi a
-- otra.
--
-- Los dos conceptos que hacen falta —`dia_garantizado` y
-- `tarifa_diferencial`— ya estaban en los checks desde 0002; lo que
-- faltaba era el tipo de contratacion que los muestre. Asi que esto es
-- solo abrir el check.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0018.
-- ============================================================

-- Oportunidades: se puede cotizar asi.
alter table comercial.oportunidades
  drop constraint if exists oportunidades_estructura_check;
alter table comercial.oportunidades
  add constraint oportunidades_estructura_check
  check (estructura_tarifaria in ('time_charter','voyage_charter','dia_garantizado'));

-- Proyectos: y acordarse asi. El check de 0012 admitia los valores del
-- modelo viejo ('diaria', 'daily_hire_mob_desmob', ...) que 0013 dejo
-- de usar en oportunidades pero nunca se limpiaron aca.
alter table comercial.proyectos
  drop constraint if exists proyectos_estructura_tarifaria_check;
alter table comercial.proyectos
  add constraint proyectos_estructura_tarifaria_check
  check (estructura_tarifaria in ('time_charter','voyage_charter','dia_garantizado'));

update comercial.proyectos
set estructura_tarifaria = 'time_charter'
where estructura_tarifaria not in ('time_charter','voyage_charter','dia_garantizado');

alter table comercial.proyectos
  alter column estructura_tarifaria set default 'time_charter';

-- Operaciones: y cobrarse asi, que es donde de verdad se usa.
alter table comercial.operaciones
  drop constraint if exists operaciones_estructura_tarifaria_check;
alter table comercial.operaciones
  add constraint operaciones_estructura_tarifaria_check
  check (estructura_tarifaria in ('time_charter','voyage_charter','dia_garantizado'));

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select conrelid::regclass::text as tabla, pg_get_constraintdef(oid) as regla
from pg_constraint
where conname in ('oportunidades_estructura_check',
                  'proyectos_estructura_tarifaria_check',
                  'operaciones_estructura_tarifaria_check')
order by 1;
