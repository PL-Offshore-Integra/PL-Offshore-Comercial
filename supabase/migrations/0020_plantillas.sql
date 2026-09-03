-- ============================================================
-- 0020 · Plantillas de proyecto
--
-- Hay trabajos que se repiten con la misma forma: Service Management
-- contrata el Golondrina para un STS, Arendal el flotel, y cada vez los
-- numeros y las condiciones son los mismos. Cargarlos a mano en cada
-- proyecto nuevo es tipear lo que ya se sabe.
--
-- Una plantilla es ese punto de partida: el cliente habitual, el buque,
-- el tipo de contratacion y las tarifas. Se elige al crear un proyecto
-- y de ahi en adelante los numeros viven en el proyecto, no en la
-- plantilla: cambiar una plantilla NO toca los proyectos ya creados.
-- Eso es a proposito. Un proyecto es un acuerdo cerrado y no puede
-- cambiar porque alguien corrigio una plantilla.
--
-- Va en Maestros y no en Comercial: es una tabla de referencia, como
-- el maestro de clientes.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0019.
-- ============================================================

create table if not exists comercial.plantillas (
  id             uuid primary key default gen_random_uuid(),
  -- Como se la elige en la lista: "Service Management / STS".
  nombre         text not null,
  descripcion    text,

  -- El cliente habitual. Es un FK al maestro y no texto, asi que si la
  -- empresa se renombra la plantilla sigue apuntando bien. Puede
  -- quedar vacio: una plantilla puede describir un tipo de trabajo sin
  -- atarlo a un cliente.
  cliente_empresa_id  uuid references comercial.cliente_empresas(id) on delete set null,
  cliente_contacto_id uuid references comercial.cliente_contactos(id) on delete set null,
  cliente_final  text,

  buque          text,
  alcance        text,

  moneda         text not null default 'USD' check (moneda in ('USD','ARS')),
  iva            text not null default '21'  check (iva in ('21','exento')),
  estructura_tarifaria text not null default 'time_charter'
    check (estructura_tarifaria in ('time_charter','voyage_charter','dia_garantizado')),

  -- Retirar una plantilla sin borrarla: deja de ofrecerse al crear un
  -- proyecto pero no se pierde lo que decia.
  activa         boolean not null default true,

  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists ux_com_plantilla_nombre
  on comercial.plantillas (lower(trim(nombre)));

create index if not exists ix_com_plantilla_activa on comercial.plantillas (activa);

-- ------------------------------------------------------------
-- Las tarifas de la plantilla
--
-- Misma forma que las de oportunidad, proyecto y operacion.
-- ------------------------------------------------------------
create table if not exists comercial.plantilla_tarifas (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references comercial.plantillas(id) on delete cascade,

  concepto     text not null
    check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                        'tarifa_diaria','tarifa_diferencial','standby',
                        'accommodation','lump_sum','demurrage','otro')),
  detalle      text,
  unidad       text not null default 'global'
    check (unidad in ('dia','hora','viaje','global')),
  monto        numeric(14,2) not null,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists ix_com_plantilla_tarifas
  on comercial.plantilla_tarifas (plantilla_id, orden);

-- ------------------------------------------------------------
-- La vista para el desplegable: la plantilla con el nombre de su
-- empresa resuelto y la cuenta de tarifas que trae.
-- ------------------------------------------------------------
create or replace view comercial.plantillas_listado as
select
  p.*,
  e.nombre                as compania,
  c.nombre                as contacto,
  count(t.id)             as tarifas
from comercial.plantillas p
left join comercial.cliente_empresas  e on e.id = p.cliente_empresa_id
left join comercial.cliente_contactos c on c.id = p.cliente_contacto_id
left join comercial.plantilla_tarifas t on t.plantilla_id = p.id
group by p.id, e.nombre, c.nombre;

-- ------------------------------------------------------------
-- RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.plantillas       enable row level security;
alter table comercial.plantilla_tarifas enable row level security;

drop policy if exists "authenticated_all_plantillas" on comercial.plantillas;
create policy "authenticated_all_plantillas" on comercial.plantillas
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_plantilla_tarifas" on comercial.plantilla_tarifas;
create policy "authenticated_all_plantilla_tarifas" on comercial.plantilla_tarifas
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete
  on comercial.plantillas, comercial.plantilla_tarifas
  to authenticated, service_role;

grant select on comercial.plantillas_listado to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select 'plantillas' as que, count(*)::text as v from comercial.plantillas;
