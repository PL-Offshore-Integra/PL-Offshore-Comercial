-- ============================================================
-- 0014 · Cancelado como cuarto estado
--
-- Los estados pasan a ser cuatro: abierto, en curso, cerrado y
-- cancelado.
--
-- Cancelado es un estado y no un resultado: una oportunidad que se cae
-- antes de definirse no se gano ni se perdio. Por eso no pide
-- resultado ni comentario obligatorio, y se elige directo del
-- desplegable, sin pasar por el cuadro de cierre.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0013.
-- ============================================================

alter table comercial.oportunidades
  drop constraint if exists opp_estado_check;
alter table comercial.oportunidades
  add constraint opp_estado_check
  check (estado in ('abierto','en_curso','cerrado','cancelado'));

-- Las filas que en el modelo viejo eran 'Cancelado' quedaron como
-- 'cerrado' sin resultado al correr 0013. Vuelven a su lugar.
update comercial.oportunidades
set estado = 'cancelado'
where estadio = 'Cancelado' and estado = 'cerrado' and resultado is null;

-- ------------------------------------------------------------
-- La vista de clientes: una cancelada no es una abierta
--
-- El contador decia `estado <> 'cerrado'`, que ahora contaria las
-- canceladas como oportunidades vivas.
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
  count(o.id) filter (where o.resultado = 'ganado')  as ganadas,
  count(o.id) filter (where o.resultado = 'perdido') as perdidas,
  count(o.id) filter (where o.estado not in ('cerrado','cancelado')) as abiertas,
  coalesce(sum(o.valor), 0)                         as valor_total,
  max(o.last_interacted_on)                         as ultimo_contacto,
  max(o.fecha_creacion)                             as ultima_oportunidad
from comercial.cliente_empresas e
join comercial.cliente_contactos c on c.empresa_id = e.id
left join comercial.oportunidades o on o.cliente_contacto_id = c.id
group by e.id, e.nombre, c.id, c.nombre, c.email, c.telefono, c.linkedin, c.cargo

union all

select
  e.id, e.nombre, null::uuid, null::text, null::text, null::text, null::text, null::text,
  count(o.id),
  count(o.id) filter (where o.resultado = 'ganado'),
  count(o.id) filter (where o.resultado = 'perdido'),
  count(o.id) filter (where o.estado not in ('cerrado','cancelado')),
  coalesce(sum(o.valor), 0),
  max(o.last_interacted_on),
  max(o.fecha_creacion)
from comercial.cliente_empresas e
left join comercial.oportunidades o
  on o.cliente_empresa_id = e.id
 and o.cliente_contacto_id is null
where
  not exists (select 1 from comercial.cliente_contactos c where c.empresa_id = e.id)
  or exists (
    select 1 from comercial.oportunidades o2
    where o2.cliente_empresa_id = e.id and o2.cliente_contacto_id is null
  )
group by e.id, e.nombre;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select estado, count(*) as filas
from comercial.oportunidades
group by 1 order by 1;
