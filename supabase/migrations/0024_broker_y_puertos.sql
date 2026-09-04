-- ============================================================
-- 0024 · Broker, comision y los dos puertos del charter
--
-- Tres cosas que pidio Silvestre, todas de la oportunidad:
--
-- 1) DELIVERY PORT y REDELIVERY PORT
--
--    Donde se entrega el buque y donde se lo devuelve. No son el
--    itinerario del trabajo: son los dos puntos que definen desde y
--    hasta donde corre el hire, y por eso van en condiciones
--    comerciales y no en la descripcion de la tarea.
--
-- 2) BROKER, cuarto tipo de contratacion
--
--    Se anota igual que un Time Charter —daily hire, mob, demob, stand
--    by— porque el trato con el cliente es el mismo. Lo que cambia es
--    que el trabajo entra por un broker que cobra comision por dia.
--
-- 3) LA COMISION, aparte del valor
--
--    Dos numeros que se leen juntos y no se suman:
--
--      valor total de la propuesta   daily hire × dias + mob + demob
--      total de comision             dias × comision
--
--    El primero es lo que paga el cliente; el segundo lo que se le
--    paga al broker. Sumarlos daria un total que no existe en ningun
--    lado, asi que la comision tiene columna propia y no entra en
--    `valor`.
--
-- QUE NO SE TOCA, Y POR QUE
--
--   comercial.proyectos no lleva `comision_total`. La comision es
--   dias × tarifa, y el proyecto no tiene dias: tiene un valor
--   acordado que se escribe a mano. La tarifa de comision si baja al
--   proyecto como concepto, para que no se pierda al adjudicar, y el
--   total se calcula donde hay fechas: en cada salida.
--
--   Los checks de estructura y de concepto se abren en las cuatro
--   tablas igual —oportunidad, proyecto, operacion y plantilla— aunque
--   solo la oportunidad muestre lo nuevo hoy. Si no, adjudicar una
--   oportunidad Broker explotaria contra un check al crear el
--   proyecto, y con un error de base, no un mensaje.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0023.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Los dos puertos y el total de comision en la oportunidad
-- ------------------------------------------------------------
alter table comercial.oportunidades
  add column if not exists delivery_port   text,
  add column if not exists redelivery_port text,
  add column if not exists comision_total  numeric(14,2) not null default 0;

comment on column comercial.oportunidades.delivery_port is
  'Puerto donde se entrega el buque: desde ahi corre el hire.';
comment on column comercial.oportunidades.redelivery_port is
  'Puerto donde se devuelve el buque: hasta ahi corre el hire.';
comment on column comercial.oportunidades.comision_total is
  'Comision del broker ya multiplicada por los dias. 0 si no es Broker. Se recalcula al guardar, igual que valor.';

-- ------------------------------------------------------------
-- 2) Broker entra en los cuatro checks de estructura
-- ------------------------------------------------------------
alter table comercial.oportunidades
  drop constraint if exists oportunidades_estructura_check;
alter table comercial.oportunidades
  add constraint oportunidades_estructura_check
  check (estructura_tarifaria in
         ('time_charter','voyage_charter','dia_garantizado','broker'));

alter table comercial.proyectos
  drop constraint if exists proyectos_estructura_tarifaria_check;
alter table comercial.proyectos
  add constraint proyectos_estructura_tarifaria_check
  check (estructura_tarifaria in
         ('time_charter','voyage_charter','dia_garantizado','broker'));

alter table comercial.operaciones
  drop constraint if exists operaciones_estructura_tarifaria_check;
alter table comercial.operaciones
  add constraint operaciones_estructura_tarifaria_check
  check (estructura_tarifaria in
         ('time_charter','voyage_charter','dia_garantizado','broker'));

alter table comercial.plantillas
  drop constraint if exists plantillas_estructura_tarifaria_check;
alter table comercial.plantillas
  add constraint plantillas_estructura_tarifaria_check
  check (estructura_tarifaria in
         ('time_charter','voyage_charter','dia_garantizado','broker'));

-- ------------------------------------------------------------
-- 3) `comision` entra en los cuatro checks de concepto
--
-- Mismo motivo que arriba: la tarifa de comision tiene que poder
-- viajar de la oportunidad al proyecto y de ahi a cada salida.
-- ------------------------------------------------------------
alter table comercial.oportunidad_tarifas
  drop constraint if exists oportunidad_tarifas_concepto_check;
alter table comercial.oportunidad_tarifas
  add constraint oportunidad_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','demurrage','lump_sum','comision','otro'));

alter table comercial.proyecto_tarifas
  drop constraint if exists proyecto_tarifas_concepto_check;
alter table comercial.proyecto_tarifas
  add constraint proyecto_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','demurrage','lump_sum','comision','otro'));

alter table comercial.operacion_tarifas
  drop constraint if exists operacion_tarifas_concepto_check;
alter table comercial.operacion_tarifas
  add constraint operacion_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','demurrage','lump_sum','comision','otro'));

alter table comercial.plantilla_tarifas
  drop constraint if exists plantilla_tarifas_concepto_check;
alter table comercial.plantilla_tarifas
  add constraint plantilla_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','demurrage','lump_sum','comision','otro'));

-- ------------------------------------------------------------
-- 4) La comision de la salida
--
-- Aca si tiene sentido guardarla: la salida tiene fechas, asi que
-- tiene dias, asi que la cuenta cierra. Es el lugar donde la comision
-- se devenga de verdad.
-- ------------------------------------------------------------
alter table comercial.operaciones
  add column if not exists comision_total numeric(14,2) not null default 0;

comment on column comercial.operaciones.comision_total is
  'Comision del broker por esta salida: dias × comision. 0 si no es Broker.';

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select conrelid::regclass::text as tabla, conname, pg_get_constraintdef(oid) as regla
from pg_constraint
where conname in ('oportunidades_estructura_check',
                  'proyectos_estructura_tarifaria_check',
                  'operaciones_estructura_tarifaria_check',
                  'plantillas_estructura_tarifaria_check',
                  'oportunidad_tarifas_concepto_check',
                  'proyecto_tarifas_concepto_check',
                  'operacion_tarifas_concepto_check',
                  'plantilla_tarifas_concepto_check')
order by 1, 2;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'comercial'
  and column_name in ('delivery_port','redelivery_port','comision_total')
order by table_name, column_name;
