-- ============================================================
-- 0009 · La base de clientes pasa a ser tabla
--
-- Hasta acá `comercial.clientes` era una VISTA sobre las
-- oportunidades: un cliente existía porque existía una oportunidad
-- suya. Eso alcanzaba para mirar, no para cargar. Con esto:
--
--   · se puede dar de alta un cliente sin oportunidad,
--   · la oportunidad lo elige de un desplegable en vez de tipearlo,
--   · y la empresa deja de estar escrita a mano en cada fila, que es
--     de donde salen los duplicados que ya hay en los datos:
--     'Excelerate' y 'Execlerate' son hoy dos clientes distintos.
--
-- Dos niveles, porque son dos cosas distintas: la empresa se firma,
-- la persona se llama por teléfono. Una empresa puede tener varios
-- contactos y los contactos rotan sin que cambie el cliente.
--
-- OJO con los nombres: `oportunidades.empresa` es la empresa PROPIA
-- (Parana Logistica), no el cliente. Por eso las columnas nuevas se
-- llaman cliente_empresa_id y cliente_contacto_id, para que nadie las
-- confunda al leer una consulta a las apuradas.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0008.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Las dos tablas
-- ------------------------------------------------------------
create table if not exists comercial.cliente_empresas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unico por nombre sin distinguir mayusculas ni espacios de mas: es la
-- regla que evita que vuelvan a entrar dos veces la misma empresa.
create unique index if not exists ux_com_cliente_empresa_nombre
  on comercial.cliente_empresas (lower(trim(nombre)));

create table if not exists comercial.cliente_contactos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null
    references comercial.cliente_empresas(id) on delete cascade,
  nombre      text,
  email       text,
  telefono    text,
  linkedin    text,
  cargo       text,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Un contacto sin ningun dato no es un contacto.
alter table comercial.cliente_contactos
  drop constraint if exists cliente_contacto_algo_cargado;
alter table comercial.cliente_contactos
  add constraint cliente_contacto_algo_cargado
  check (
    coalesce(trim(nombre), '') <> ''
    or coalesce(trim(email), '') <> ''
    or coalesce(trim(telefono), '') <> ''
  );

create index if not exists ix_com_cliente_contacto_empresa
  on comercial.cliente_contactos (empresa_id);

alter table comercial.cliente_empresas  enable row level security;
alter table comercial.cliente_contactos enable row level security;

drop policy if exists "authenticated_all_cliente_empresas" on comercial.cliente_empresas;
create policy "authenticated_all_cliente_empresas" on comercial.cliente_empresas
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_cliente_contactos" on comercial.cliente_contactos;
create policy "authenticated_all_cliente_contactos" on comercial.cliente_contactos
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 2) El puente en oportunidades
--
-- Las columnas de texto (compania, contacto, contacto_email...) se
-- quedan, y no por comodidad: son el nombre con el que se firmo esa
-- oportunidad. Si manana la empresa se renombra, las viejas conservan
-- lo que decia el contrato. Manda el FK para el desplegable y para la
-- base de clientes; el texto es la foto del momento.
-- ------------------------------------------------------------
alter table comercial.oportunidades
  add column if not exists cliente_empresa_id uuid
    references comercial.cliente_empresas(id) on delete set null,
  add column if not exists cliente_contacto_id uuid
    references comercial.cliente_contactos(id) on delete set null;

create index if not exists ix_com_opp_cliente_empresa
  on comercial.oportunidades (cliente_empresa_id);
create index if not exists ix_com_opp_cliente_contacto
  on comercial.oportunidades (cliente_contacto_id);

-- ------------------------------------------------------------
-- 3) Carga inicial desde lo que ya hay
--
-- Las empresas primero. `on conflict` no sirve acá porque el unico es
-- un indice sobre una expresion, asi que se filtra con not exists.
-- ------------------------------------------------------------
insert into comercial.cliente_empresas (nombre)
select distinct trim(o.compania)
from comercial.oportunidades o
where coalesce(trim(o.compania), '') <> ''
  and not exists (
    select 1 from comercial.cliente_empresas e
    where lower(trim(e.nombre)) = lower(trim(o.compania))
  );

-- Los contactos: solo los que tienen algun dato. Las oportunidades sin
-- contacto cargado no generan un contacto fantasma.
insert into comercial.cliente_contactos (empresa_id, nombre, email, telefono, linkedin)
select e.id, d.contacto, d.contacto_email, d.contacto_telefono, d.contacto_linkedin
from (
  select distinct trim(compania) as compania, contacto, contacto_email,
         contacto_telefono, contacto_linkedin
  from comercial.oportunidades
  where coalesce(trim(compania), '') <> ''
    and (coalesce(trim(contacto), '') <> ''
         or coalesce(trim(contacto_email), '') <> ''
         or coalesce(trim(contacto_telefono), '') <> '')
) d
join comercial.cliente_empresas e on lower(trim(e.nombre)) = lower(d.compania)
where not exists (
  select 1 from comercial.cliente_contactos c
  where c.empresa_id = e.id
    and coalesce(c.nombre, '')   = coalesce(d.contacto, '')
    and coalesce(c.email, '')    = coalesce(d.contacto_email, '')
    and coalesce(c.telefono, '') = coalesce(d.contacto_telefono, '')
);

-- Y ahora se enganchan las oportunidades existentes.
update comercial.oportunidades o
set cliente_empresa_id = e.id
from comercial.cliente_empresas e
where o.cliente_empresa_id is null
  and lower(trim(e.nombre)) = lower(trim(o.compania));

update comercial.oportunidades o
set cliente_contacto_id = c.id
from comercial.cliente_contactos c
where o.cliente_contacto_id is null
  and c.empresa_id = o.cliente_empresa_id
  and coalesce(c.nombre, '')   = coalesce(o.contacto, '')
  and coalesce(c.email, '')    = coalesce(o.contacto_email, '')
  and coalesce(c.telefono, '') = coalesce(o.contacto_telefono, '');

-- ------------------------------------------------------------
-- 4) La vista de la pantalla de clientes, ahora sobre las tablas
--
-- Una fila por contacto, y tambien una fila por empresa que todavia no
-- tiene ninguno: una empresa recien cargada tiene que verse.
--
-- Los contadores se cuentan por el FK. Las oportunidades de una
-- empresa que no apuntan a ningun contacto se suman en la fila de la
-- empresa sin contacto.
-- ------------------------------------------------------------
drop view if exists comercial.clientes;

create view comercial.clientes as
select
  e.id                                              as empresa_id,
  e.nombre                                          as compania,
  c.id                                              as contacto_id,
  c.nombre                                          as contacto,
  c.email                                           as contacto_email,
  c.telefono                                        as contacto_telefono,
  c.linkedin                                        as contacto_linkedin,
  c.cargo                                           as contacto_cargo,
  count(o.id)                                       as oportunidades,
  count(o.id) filter (where o.estadio = 'Ganado')   as ganadas,
  count(o.id) filter (where o.estadio = 'Perdido')  as perdidas,
  count(o.id) filter (where o.estadio not in ('Ganado','Perdido','Cancelado'))
                                                    as abiertas,
  coalesce(sum(o.valor), 0)                         as valor_total,
  max(o.last_interacted_on)                         as ultimo_contacto,
  max(o.fecha_creacion)                             as ultima_oportunidad
from comercial.cliente_empresas e
left join comercial.cliente_contactos c on c.empresa_id = e.id
left join comercial.oportunidades o
  on o.cliente_empresa_id = e.id
 and (o.cliente_contacto_id = c.id or (c.id is null and o.cliente_contacto_id is null))
group by e.id, e.nombre, c.id, c.nombre, c.email, c.telefono, c.linkedin, c.cargo;

-- ------------------------------------------------------------
-- 5) Ver como quedo
-- ------------------------------------------------------------
select 'empresas' as que, count(*)::text as v from comercial.cliente_empresas
union all select 'contactos', count(*)::text from comercial.cliente_contactos
union all select 'oportunidades con empresa', count(*)::text
  from comercial.oportunidades where cliente_empresa_id is not null
union all select 'oportunidades sin empresa', count(*)::text
  from comercial.oportunidades where cliente_empresa_id is null
union all select 'filas en la vista clientes', count(*)::text from comercial.clientes;
