-- ============================================================
-- 0018 · Operaciones: el tercer eje
--
-- El modelo de Integra son tres ejes ortogonales:
--
--   buque       el centro de costo. Quien gasto.
--   proyecto    el empleo del barco. Para quien.
--   operacion   la salida concreta, con fechas y tarifa. Cuanto se
--               cobra.
--
-- Comercial tenia los dos primeros y le faltaba el tercero, y sin el
-- tercero no hay ingreso calculado, ni utilizacion, ni costo de
-- amarre.
--
-- El caso que lo hace evidente: Service Management contrata el
-- Golondrina de Mar desde hace anios, sin contrato firmado. Eso es UN
-- proyecto, y adentro va una salida por trabajo: "RAIZEN AGO2026
-- SEAWAYS BALBOA" es una operacion de dos dias, con su calculo y su
-- statement of facts. Cargar cada salida como un proyecto aparte
-- perderia el eje "para quien", que es justamente el que permite
-- decir que un gasto no tiene proyecto y por lo tanto es amarre.
--
-- Ojo con los nombres: `comercial.operaciones` no tiene nada que ver
-- con `public.proyectos` ni con los modulos de Fede. Vive entera en el
-- esquema comercial.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0017.
-- ============================================================

-- ------------------------------------------------------------
-- 1) La tabla
--
-- Las fechas son timestamptz y no date, y no es un detalle: el
-- calculo de estos trabajos es por dia fraccionado. En el ejemplo del
-- Golondrina la operacion va del 20/08 07:00 al 21/08 12:30, y las
-- 0.2292 jornadas que pasan de las 24 h se cobran pro rata. Con
-- fechas sin hora ese numero no se puede calcular.
--
-- El cliente final vive en la operacion y no en el proyecto porque es
-- lo que cambia: Service Management contrata siempre, pero el trabajo
-- de agosto era para Raizen y el que viene puede ser para otro. El
-- proyecto igual conserva el suyo (0017) como el habitual.
-- ------------------------------------------------------------
create table if not exists comercial.operaciones (
  id             uuid primary key default gen_random_uuid(),
  nro_operacion  text,
  -- Lo pone la persona, como en el proyecto: "RAIZEN AGO2026 SEAWAYS
  -- BALBOA" dice mas que cualquier numero.
  nombre         text not null,

  -- Una operacion no existe sin proyecto: es una salida DE algo. Si se
  -- borra el proyecto se van sus operaciones.
  proyecto_id    uuid not null
    references comercial.proyectos(id) on delete cascade,

  -- Que buque salio de verdad. Por defecto el del proyecto, pero puede
  -- cambiar entre una salida y otra.
  buque          text,
  cliente_final  text,
  -- Datos de la salida. En un STS el buque madre y la zona son la
  -- identidad del trabajo.
  zona           text,
  buque_madre    text,

  fecha_inicio   timestamptz,
  fecha_fin      timestamptz,

  -- La moneda y el IVA se heredan del proyecto al crear, pero quedan
  -- en la operacion: un proyecto largo puede tener salidas en monedas
  -- distintas.
  moneda         text not null default 'USD' check (moneda in ('USD','ARS')),
  iva            text not null default '21'  check (iva in ('21','exento')),
  estructura_tarifaria text not null default 'time_charter'
    check (estructura_tarifaria in ('time_charter','voyage_charter')),
  valor          numeric(14,2) not null default 0,

  estado         text not null default 'planificada'
    check (estado in ('planificada','en_curso','finalizada','cancelada')),

  comentarios    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ix_com_oper_proyecto on comercial.operaciones (proyecto_id, fecha_inicio desc);
create index if not exists ix_com_oper_estado   on comercial.operaciones (estado);
create index if not exists ix_com_oper_buque    on comercial.operaciones (buque);

create unique index if not exists ux_com_oper_nro
  on comercial.operaciones (lower(nro_operacion))
  where nro_operacion is not null;

-- ------------------------------------------------------------
-- 2) Numeracion automatica, igual que oportunidades y proyectos
--
-- OP-<n>-<anio>, contador reiniciando cada anio.
-- ------------------------------------------------------------
create table if not exists comercial.operacion_contador (
  anio   int primary key,
  ultimo int not null default 0
);

create or replace function comercial.set_nro_operacion()
returns trigger language plpgsql as $fn$
declare
  v_anio int;
  v_n    int;
begin
  if new.nro_operacion is null or trim(new.nro_operacion) = '' then
    v_anio := extract(year from coalesce(new.created_at, now()))::int;

    insert into comercial.operacion_contador (anio, ultimo)
    values (v_anio, 1)
    on conflict (anio)
      do update set ultimo = comercial.operacion_contador.ultimo + 1
    returning ultimo into v_n;

    new.nro_operacion := 'OP-' || v_n || '-' || v_anio;
  end if;
  return new;
end;
$fn$;

drop trigger if exists operaciones_set_nro on comercial.operaciones;
create trigger operaciones_set_nro
  before insert on comercial.operaciones
  for each row execute function comercial.set_nro_operacion();

-- ------------------------------------------------------------
-- 3) Tarifas de la operacion
--
-- Misma forma que las del proyecto. Las del proyecto son lo acordado
-- en general; estas son las de esta salida, que puede tener sus
-- propios numeros.
-- ------------------------------------------------------------
create table if not exists comercial.operacion_tarifas (
  id           uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references comercial.operaciones(id) on delete cascade,

  concepto     text not null
    check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                        'tarifa_diaria','tarifa_diferencial','standby',
                        'accommodation','lump_sum','demurrage','otro')),
  detalle      text,
  unidad       text not null default 'global'
    check (unidad in ('dia','hora','viaje','global')),
  monto        numeric(14,2) not null,
  cantidad     numeric(10,2),
  aplica_desde_horas int,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists ix_com_oper_tarifas
  on comercial.operacion_tarifas (operacion_id, orden);

-- `demurrage` entro en 0013 en las tarifas de oportunidad pero nunca
-- en las de proyecto, asi que un voyage charter con demora no se podia
-- guardar al convertir. Se agrega.
alter table comercial.proyecto_tarifas
  drop constraint if exists proyecto_tarifas_concepto_check;
alter table comercial.proyecto_tarifas
  add constraint proyecto_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','lump_sum','demurrage','otro'));

-- ------------------------------------------------------------
-- 4) Documentacion de la operacion
--
-- Mismo bucket privado. `clase` separa los dos documentos que Maximo
-- arma por salida y le manda al cliente para que de el OK: el calculo
-- y el statement of facts. Hoy los hace en Excel y los pasa a PDF; que
-- el modulo los genere es otra conversacion, pero al menos van a tener
-- donde vivir.
-- ------------------------------------------------------------
create table if not exists comercial.operacion_adjuntos (
  id           uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references comercial.operaciones(id) on delete cascade,
  clase        text not null default 'otro'
    check (clase in ('calculo','sof','otro')),
  nombre       text not null,
  path         text not null unique,
  tipo         text,
  tamano_bytes bigint,
  subido_por   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists ix_com_oper_adjuntos
  on comercial.operacion_adjuntos (operacion_id, created_at desc);

-- ------------------------------------------------------------
-- 5) El proyecto deja de tener fechas reales propias
--
-- Con operaciones, "cuando arranco de verdad" es la primera salida y
-- "cuando termino" la ultima. Dos lugares para el mismo dato es un
-- lugar de mas, y el que sobra es el del proyecto: Service Management
-- no arranca ni termina, cada una de sus salidas si.
--
-- Las estimadas SE QUEDAN: son lo que se prometio al cotizar y no
-- dependen de las salidas. Y `valor` tambien: es lo acordado, distinto
-- de la suma de lo ejecutado, que sale de las operaciones.
--
-- Se hace ahora porque no hay ningun proyecto cargado. Si se corre en
-- una base con proyectos, esto pierde esas dos fechas: conviene
-- cargarlas antes como una operacion.
-- ------------------------------------------------------------
alter table comercial.proyectos drop column if exists fecha_inicio_real;
alter table comercial.proyectos drop column if exists fecha_fin_real;

-- ------------------------------------------------------------
-- 6) La vista que cruza los tres ejes
--
-- Un proyecto con lo que sus operaciones dicen: cuantas salidas,
-- cuando arranco la primera y termino la ultima, y cuanto suma lo
-- ejecutado contra lo acordado.
-- ------------------------------------------------------------
create or replace view comercial.proyectos_con_operaciones as
select
  p.*,
  count(o.id)                                    as operaciones,
  count(o.id) filter (where o.estado = 'en_curso') as operaciones_en_curso,
  min(o.fecha_inicio)                            as arranco,
  max(o.fecha_fin)                               as termino,
  -- Solo lo que no se cancelo: una salida cancelada no factura.
  coalesce(sum(o.valor) filter (where o.estado <> 'cancelada'), 0) as valor_ejecutado
from comercial.proyectos p
left join comercial.operaciones o on o.proyecto_id = p.id
group by p.id;

-- ------------------------------------------------------------
-- 7) RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.operaciones        enable row level security;
alter table comercial.operacion_tarifas  enable row level security;
alter table comercial.operacion_adjuntos enable row level security;
alter table comercial.operacion_contador enable row level security;

drop policy if exists "authenticated_all_operaciones" on comercial.operaciones;
create policy "authenticated_all_operaciones" on comercial.operaciones
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_oper_tarifas" on comercial.operacion_tarifas;
create policy "authenticated_all_oper_tarifas" on comercial.operacion_tarifas
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_oper_adjuntos" on comercial.operacion_adjuntos;
create policy "authenticated_all_oper_adjuntos" on comercial.operacion_adjuntos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_oper_contador" on comercial.operacion_contador;
create policy "authenticated_all_oper_contador" on comercial.operacion_contador
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete
  on comercial.operaciones, comercial.operacion_tarifas,
     comercial.operacion_adjuntos, comercial.operacion_contador
  to authenticated, service_role;

grant select on comercial.proyectos_con_operaciones to authenticated, service_role;

-- ------------------------------------------------------------
-- 8) Ver como quedo
-- ------------------------------------------------------------
select 'operaciones' as que, count(*)::text as v from comercial.operaciones
union all select 'proximo numero',
  'OP-' || (coalesce((select ultimo from comercial.operacion_contador
                      where anio = extract(year from current_date)::int), 0) + 1)::text
        || '-' || extract(year from current_date)::int::text
union all select 'fechas reales del proyecto',
  (select count(*)::text from information_schema.columns
   where table_schema='comercial' and table_name='proyectos'
     and column_name in ('fecha_inicio_real','fecha_fin_real'));
