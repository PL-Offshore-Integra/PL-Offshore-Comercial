-- ============================================================
-- 0010 · Las oportunidades sin contacto no se pueden perder
--
-- Defecto de la vista que armo 0009. Estaba hecha con un LEFT JOIN
-- contra los contactos y el join de oportunidades decia:
--
--   o.cliente_contacto_id = c.id
--   or (c.id is null and o.cliente_contacto_id is null)
--
-- La segunda parte solo se cumple cuando la empresa NO tiene ningun
-- contacto. En el momento en que se le carga el primero, la fila
-- "(sin contacto)" desaparece —correcto— pero las oportunidades que
-- no tienen contacto asignado se van con ella: no matchean con la
-- fila del contacto nuevo ni con ninguna otra.
--
-- Visto en la practica: Arendal tiene 2 oportunidades, las dos sin
-- contacto. Al cargarle un contacto, la pantalla de clientes pasaba a
-- mostrar "Arendal · 0 oportunidades" y las 2 no aparecian en ningun
-- lado.
--
-- Ahora son dos consultas unidas:
--
--   1. una fila por contacto, con lo que apunta a ese contacto;
--   2. una fila por empresa para lo que no tiene contacto asignado,
--      que aparece si la empresa no tiene contactos O si tiene
--      oportunidades sin contacto.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0009.
-- ============================================================

drop view if exists comercial.clientes;

create view comercial.clientes as

-- 1) Una fila por contacto cargado.
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
join comercial.cliente_contactos c on c.empresa_id = e.id
left join comercial.oportunidades o on o.cliente_contacto_id = c.id
group by e.id, e.nombre, c.id, c.nombre, c.email, c.telefono, c.linkedin, c.cargo

union all

-- 2) La fila de la empresa, para lo que no cuelga de ningun contacto.
select
  e.id,
  e.nombre,
  null::uuid,
  null::text,
  null::text,
  null::text,
  null::text,
  null::text,
  count(o.id),
  count(o.id) filter (where o.estadio = 'Ganado'),
  count(o.id) filter (where o.estadio = 'Perdido'),
  count(o.id) filter (where o.estadio not in ('Ganado','Perdido','Cancelado')),
  coalesce(sum(o.valor), 0),
  max(o.last_interacted_on),
  max(o.fecha_creacion)
from comercial.cliente_empresas e
left join comercial.oportunidades o
  on o.cliente_empresa_id = e.id
 and o.cliente_contacto_id is null
where
  -- Empresa sin ningun contacto: tiene que verse igual.
  not exists (
    select 1 from comercial.cliente_contactos c where c.empresa_id = e.id
  )
  -- O empresa con contactos pero con oportunidades que no apuntan a ninguno.
  or exists (
    select 1 from comercial.oportunidades o2
    where o2.cliente_empresa_id = e.id and o2.cliente_contacto_id is null
  )
group by e.id, e.nombre;

-- ------------------------------------------------------------
-- Ver como quedo: la suma de la vista tiene que dar el total de
-- oportunidades que tienen empresa cargada.
-- ------------------------------------------------------------
select 'oportunidades con empresa' as que, count(*)::text as v
from comercial.oportunidades where cliente_empresa_id is not null
union all
select 'sumadas en la vista', coalesce(sum(oportunidades), 0)::text from comercial.clientes
union all
select 'filas en la vista', count(*)::text from comercial.clientes;
