-- ============================================================
-- 0017 · Cliente final en el proyecto
--
-- En estos trabajos hay dos clientes y no son el mismo:
--
--   compania       quien nos contrata y nos paga
--   cliente_final  para quien es el trabajo
--
-- El ejemplo que lo hizo evidente: Service Management contrata el
-- Golondrina de Mar, pero el trabajo es para Raizen. Sin el segundo
-- campo, el proyecto no dice para quien se navego.
--
-- La oportunidad ya tenia `cliente_final` desde 0003. El proyecto no,
-- asi que al convertir una oportunidad ese dato se perdia.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0016.
-- ============================================================

alter table comercial.proyectos
  add column if not exists cliente_final text;

-- Los proyectos que ya existen y salieron de una oportunidad heredan el
-- cliente final que tenia esa oportunidad.
update comercial.proyectos p
set cliente_final = o.cliente_final
from comercial.oportunidades o
where p.oportunidad_id = o.id
  and p.cliente_final is null
  and o.cliente_final is not null;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select nro_proyecto, nombre, compania, cliente_final
from comercial.proyectos
order by nro_proyecto;
