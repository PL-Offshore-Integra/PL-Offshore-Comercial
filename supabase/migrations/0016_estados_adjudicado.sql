-- ============================================================
-- 0016 · Tres estados: en curso, adjudicado, cancelado
--
-- El modelo de 0013/0014 tenia cuatro estados (abierto, en curso,
-- cerrado, cancelado) mas un resultado (ganado / perdido) que solo
-- aplicaba a las cerradas. Dos campos para decir una sola cosa.
--
-- Queda uno solo, con tres valores:
--
--   en_curso     la oportunidad esta viva
--   adjudicado   nos la dieron. Dispara la creacion del proyecto.
--   cancelado    no va. Pide comentario, que es lo que se lee en el
--                listado.
--
-- Lo que se pierde: la diferencia entre "perdida" (nos la dieron a
-- otro) y "cancelada" (no se hizo). Las dos son ahora cancelado, y el
-- motivo queda escrito en el comentario. La columna `resultado` NO se
-- borra: guarda esa distincion para las filas que ya la tenian, y
-- permite volver atras si alguna vez hace falta separar las dos cosas
-- para medir tasa de exito. La app deja de escribirla.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0015.
-- ============================================================

-- ------------------------------------------------------------
-- Primero las restricciones, despues los datos
--
-- El check viejo rechaza 'adjudicado', asi que si se actualizan las
-- filas antes de soltarlo la migracion aborta entera. Misma leccion
-- que en 0013.
-- ------------------------------------------------------------
alter table comercial.oportunidades
  drop constraint if exists opp_estado_check;
alter table comercial.oportunidades
  drop constraint if exists opp_perdida_con_comentario;

-- ------------------------------------------------------------
-- Los datos, en este orden
-- ------------------------------------------------------------

-- Una cerrada que se gano quedo adjudicada.
update comercial.oportunidades
set estado = 'adjudicado'
where estado = 'cerrado' and resultado = 'ganado';

-- Una cerrada que se perdio pasa a cancelada. El motivo ya vive en
-- `comentarios` desde 0013, asi que no se pierde el porque.
update comercial.oportunidades
set estado = 'cancelado'
where estado = 'cerrado' and resultado = 'perdido';

-- Todo lo demas esta vivo: las abiertas, y cualquier cerrada sin
-- resultado (que no significaba nada).
update comercial.oportunidades
set estado = 'en_curso'
where estado in ('abierto', 'cerrado');

-- Una cancelada sin comentario no puede existir de aca en adelante,
-- pero puede haber quedado alguna de antes. Se le pone una marca en vez
-- de dejar la restriccion sin poder validarse nunca.
update comercial.oportunidades
set comentarios = 'Cancelada antes de que el comentario fuera obligatorio.'
where estado = 'cancelado' and comentarios is null;

-- ------------------------------------------------------------
-- Las restricciones nuevas
-- ------------------------------------------------------------
alter table comercial.oportunidades
  alter column estado set default 'en_curso';

alter table comercial.oportunidades
  add constraint opp_estado_check
  check (estado in ('en_curso', 'adjudicado', 'cancelado'));

-- Cancelar es un final, y un final sin motivo no le sirve a nadie. La
-- app tambien lo exige, en el formulario y en el servidor; esto es el
-- piso.
alter table comercial.oportunidades
  add constraint opp_cancelada_con_comentario
  check (estado <> 'cancelado' or comentarios is not null) not valid;
alter table comercial.oportunidades
  validate constraint opp_cancelada_con_comentario;

-- ------------------------------------------------------------
-- La vista de clientes, con el vocabulario nuevo
--
-- Los contadores se llamaban ganadas / perdidas / abiertas y contaban
-- sobre `resultado`. Ahora cuentan sobre `estado` y se llaman como lo
-- que son. Se recrea con drop porque `create or replace view` no
-- permite renombrar columnas.
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
  count(o.id) filter (where o.estado = 'en_curso')   as en_curso,
  count(o.id) filter (where o.estado = 'adjudicado') as adjudicadas,
  count(o.id) filter (where o.estado = 'cancelado')  as canceladas,
  coalesce(sum(o.valor), 0)                         as valor_total,
  max(o.last_interacted_on)                         as ultimo_contacto,
  max(o.fecha_creacion)                             as ultima_oportunidad
from comercial.cliente_empresas e
join comercial.cliente_contactos c on c.empresa_id = e.id
left join comercial.oportunidades o on o.cliente_contacto_id = c.id
group by e.id, e.nombre, c.id, c.nombre, c.email, c.telefono, c.linkedin, c.cargo

union all

-- Lo que cuelga de la empresa y no de una persona. Sin este segundo
-- brazo, una oportunidad sin contacto desaparecia del listado en
-- cuanto la empresa cargaba su primer contacto (0010).
select
  e.id, e.nombre, null::uuid, null::text, null::text, null::text, null::text, null::text,
  count(o.id),
  count(o.id) filter (where o.estado = 'en_curso'),
  count(o.id) filter (where o.estado = 'adjudicado'),
  count(o.id) filter (where o.estado = 'cancelado'),
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
