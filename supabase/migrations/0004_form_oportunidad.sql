-- ============================================================
-- 0004 · Ajustes al formulario de oportunidad
--
--   · nombre de proyecto deja de ser obligatorio (sale del form)
--   · linkedin del contacto
--   · la estructura de cotizacion pasa a nombrarse como se habla:
--     "Daily Hire + Mobilization + Demobilization"
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0003.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Nombre de proyecto: ya no se pide
--
-- La columna queda (tiene los datos del tracker y el dashboard la
-- usa) pero deja de ser obligatoria. Lo que identifica a una
-- oportunidad pasa a ser el nro + la compania.
-- ------------------------------------------------------------
alter table comercial.oportunidades
  alter column nombre_proyecto drop not null;

-- ------------------------------------------------------------
-- 2) Linkedin del contacto
-- ------------------------------------------------------------
alter table comercial.oportunidades
  add column if not exists contacto_linkedin text;

-- ------------------------------------------------------------
-- 3) Estructura de cotizacion
--
-- 'mov_desmov_garantizado' se renombra a 'daily_hire_mob_desmob'.
-- El dia garantizado sale: los tres conceptos que se cotizan son
-- daily hire, mobilization y demobilization.
--
-- Primero se mueven las filas y despues se cambia el check, para
-- que ninguna quede fuera de los valores permitidos.
-- ------------------------------------------------------------
update comercial.oportunidades
set estructura_tarifaria = 'daily_hire_mob_desmob'
where estructura_tarifaria = 'mov_desmov_garantizado';

alter table comercial.oportunidades
  drop constraint if exists oportunidades_estructura_check;

alter table comercial.oportunidades
  add constraint oportunidades_estructura_check
  check (estructura_tarifaria in
         ('diaria','daily_hire_mob_desmob','precio_cerrado','otra'));

-- ------------------------------------------------------------
-- 4) La base de clientes toma el linkedin
--
-- Se dropea antes de recrear: `create or replace view` solo deja
-- agregar columnas al final, y esta va en el medio del bloque de
-- contacto, que es donde se lee.
-- ------------------------------------------------------------
drop view if exists comercial.clientes;

create view comercial.clientes as
select
  o.compania,
  o.contacto,
  o.contacto_email,
  o.contacto_telefono,
  o.contacto_linkedin,
  count(*)                                          as oportunidades,
  count(*) filter (where o.estadio = 'Ganado')      as ganadas,
  count(*) filter (where o.estadio = 'Perdido')     as perdidas,
  count(*) filter (where o.estadio not in ('Ganado','Perdido','Cancelado'))
                                                    as abiertas,
  sum(o.valor)                                      as valor_total,
  max(o.last_interacted_on)                         as ultimo_contacto,
  max(o.fecha_creacion)                             as ultima_oportunidad
from comercial.oportunidades o
group by o.compania, o.contacto, o.contacto_email, o.contacto_telefono,
         o.contacto_linkedin;

-- ------------------------------------------------------------
-- 5) Ver como quedo
-- ------------------------------------------------------------
select estructura_tarifaria, count(*)
from comercial.oportunidades
group by estructura_tarifaria
order by estructura_tarifaria;
