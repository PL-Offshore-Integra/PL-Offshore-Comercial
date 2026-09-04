-- ============================================================
-- 0028 · Facturacion y cobranza
--
-- El proyecto se adjudica, se trabaja, y despues hay que cobrarlo. Eso
-- se venia siguiendo en "REMOLCADORES - RESUMEN 2026.xlsx", una hoja
-- por buque, con las columnas de la derecha dedicadas al dinero:
--
--   Facturado · Cobrado · Fecha de Cobro · Dias al Cobro · Vencimiento
--   Estado · TC Pagado · TC Dia Cobro · Dif. de Cambio · Total en Pesos
--
-- Esta migracion trae esa capa al modulo. La de la izquierda —mes,
-- viaje, desde, hasta, dias, charteador, "STS Zona Alfa (Seaways
-- Balboa)"— ya existe: es la operacion.
--
-- DE QUE CUELGA UNA FACTURA
--
--   Del proyecto, y un proyecto puede tener varias. Ademas puede
--   apuntar a la salida que factura, cuando factura una: en el
--   Golondrina cada viaje se factura entero, y en un survey de 48 dias
--   se factura por mes sin que cada factura sea un viaje.
--
--   `operacion_id` es opcional y `on delete set null`: borrar una
--   salida no puede borrar una factura emitida. `proyecto_id` es
--   obligatorio y va en cascada, igual que las salidas.
--
-- POR QUE EL ESTADO NO ES UNA COLUMNA
--
--   En la planilla el estado es una formula, y esa formula tiene un
--   error que hoy hace que el tablero informe 0% cobrado:
--
--     IF(OR(O="USD",O="ARS"),"Cobrado", ... "Vencido")
--
--   pregunta si la columna Cobrado dice USD o ARS, pero ahi esta
--   escrito "Si". Nunca coincide, asi que ninguna fila cobrada cuenta
--   como cobrada: los cuatro primeros viajes del Golondrina y el
--   traslado del POSEIDON —unos 451.400 USD netos, con fecha de cobro
--   cargada— aparecen en cero, y parte cae en "Vencido".
--
--   Aca el estado no se guarda ni se escribe a mano: se deduce de si
--   hay cobro y de la fecha de vencimiento, en un solo lugar
--   (`estadoDeFactura`, lib/types.ts). Un dato que se calcula no puede
--   contradecir al que lo origina.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0027.
-- ============================================================

-- ------------------------------------------------------------
-- 1) A cuantos dias paga cada cliente
--
-- En la planilla el vencimiento es `fecha hasta + 90`, con el 90
-- escrito adentro de la formula y solo para SERVICE MANAGEMENT. Eso es
-- una condicion comercial del cliente, asi que vive en el maestro de
-- clientes y de ahi se propone en cada factura.
-- ------------------------------------------------------------
alter table comercial.cliente_empresas
  add column if not exists dias_de_pago int;

comment on column comercial.cliente_empresas.dias_de_pago is
  'Condicion de pago en dias. Se usa para proponer el vencimiento de cada factura.';

update comercial.cliente_empresas
set dias_de_pago = 90
where dias_de_pago is null
  and lower(trim(nombre)) = 'service management';

-- ------------------------------------------------------------
-- 2) Las facturas
-- ------------------------------------------------------------
create table if not exists comercial.facturas (
  id           uuid primary key default gen_random_uuid(),

  proyecto_id  uuid not null references comercial.proyectos(id) on delete cascade,
  -- La salida que se esta facturando, cuando la factura corresponde a
  -- una sola. Opcional a proposito.
  operacion_id uuid references comercial.operaciones(id) on delete set null,

  -- El numero que le puso el sistema de facturacion. Texto porque
  -- lleva puntos y guiones: "A-0001-00012345".
  nro_factura  text,

  -- Cual de las empresas de Integra emite. Estos trabajos los factura
  -- Parana Logistica, aunque el buque sea de PL Offshore: por eso la
  -- planilla vive en su carpeta.
  empresa_facturadora text not null default 'Parana Logistica'
    check (empresa_facturadora in
           ('Terra Mare','Clean Sea','Parana Logistica','HF Offshore')),

  fecha_emision date not null default current_date,
  -- Cuando hay que cobrarla. Se propone con los dias del cliente y se
  -- puede corregir: una factura puntual puede tener otro plazo.
  vencimiento   date,

  importe      numeric(14,2) not null default 0,
  -- Lo que se le paga al broker por esta factura. El neto —importe
  -- menos comision— no se guarda: es una resta, y guardarla es dejar
  -- que se desincronice.
  comision     numeric(14,2) not null default 0,
  moneda       text not null default 'USD' check (moneda in ('USD','ARS')),

  -- ---- El cobro. Uno por factura ----
  -- La moneda en la que entro la plata, que no es necesariamente la de
  -- la factura: se factura en USD y se cobra en pesos al TC acordado.
  -- Si esta, la factura esta cobrada.
  cobro_moneda text check (cobro_moneda in ('USD','ARS')),
  cobro_fecha  date,
  -- El TC al que se pago y el del dia en que entro. La diferencia es la
  -- de cambio, y no se guarda porque es una resta.
  tc_pagado    numeric(12,4),
  tc_dia_cobro numeric(12,4),

  notas        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Un cobro sin fecha o una fecha sin moneda es media cobranza, y
  -- media cobranza descuadra cualquier total.
  constraint facturas_cobro_completo
    check ((cobro_moneda is null) = (cobro_fecha is null)),
  -- Cobrado en pesos sin decir a que tipo de cambio no permite saber
  -- cuanta plata entro.
  constraint facturas_pesos_con_tc
    check (cobro_moneda is distinct from 'ARS' or tc_pagado is not null),
  constraint facturas_importe_no_negativo check (importe >= 0),
  constraint facturas_comision_no_negativa check (comision >= 0)
);

-- El mismo numero de factura no puede estar dos veces. Se admite vacio
-- —una factura cargada antes de tener el numero— y ahi el indice no
-- opina.
create unique index if not exists ux_com_facturas_nro
  on comercial.facturas (lower(trim(nro_factura)))
  where nro_factura is not null;

create index if not exists ix_com_facturas_proyecto  on comercial.facturas (proyecto_id);
create index if not exists ix_com_facturas_operacion on comercial.facturas (operacion_id);
create index if not exists ix_com_facturas_venc      on comercial.facturas (vencimiento);

-- ------------------------------------------------------------
-- 3) La vista del seguimiento
--
-- Trae la factura con lo que hace falta para leerla sin ir a buscar el
-- proyecto: de quien es, con que buque se hizo y de que salida sale.
-- El estado NO viene de aca: se calcula en la pantalla, en un solo
-- lugar, para que no haya dos definiciones.
-- ------------------------------------------------------------
create or replace view comercial.facturas_listado as
select
  f.*,
  p.nro_proyecto,
  p.nombre                as proyecto,
  p.compania,
  p.cliente_final,
  coalesce(o.buque, p.buque) as buque,
  o.nro_operacion,
  o.nombre                as salida,
  o.fecha_inicio          as salida_desde,
  o.fecha_fin             as salida_hasta,
  f.importe - f.comision  as neto
from comercial.facturas f
join comercial.proyectos p on p.id = f.proyecto_id
left join comercial.operaciones o on o.id = f.operacion_id;

-- ------------------------------------------------------------
-- 4) RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.facturas enable row level security;

drop policy if exists "authenticated_all_facturas" on comercial.facturas;
create policy "authenticated_all_facturas" on comercial.facturas
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on comercial.facturas
  to authenticated, service_role;

grant select on comercial.facturas_listado to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'comercial' and table_name = 'facturas'
order by ordinal_position;
