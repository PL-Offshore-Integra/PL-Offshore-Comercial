-- ============================================================
-- 0031 · El scope corto del proyecto, en los dos idiomas
--
-- En el track record las filas historicas dicen frases telegraficas
-- —"Lightering Support Vessel", "Towing of sheerleg crane"— y las que
-- salen de un proyecto traian la descripcion completa: "Traslado del
-- POSEIDON de Rosario a Montevideo con estructuras". Al lado una de la
-- otra, la larga desentona.
--
-- Asi que el proyecto pasa a tener dos textos con dos trabajos
-- distintos:
--
--   descripcion            para adentro. Larga, en castellano, todo lo
--                          que haya que saber del trabajo.
--   scope_es / scope_en    para el track record. Una linea, como la
--                          escribe el documento.
--
-- `descripcion_en` se renombra a `scope_en`: nacio hace un rato como
-- "la descripcion en ingles" y en realidad es esto. Mejor arreglar el
-- nombre ahora, con cuatro filas, que arrastrarlo.
--
-- Si el scope esta vacio el track record cae a la descripcion, asi que
-- un proyecto viejo sigue apareciendo igual.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0030.
-- ============================================================

-- La vista de 0018 hace `select p.*` y guarda los numeros de columna, no
-- los nombres: si se renombra la columna por abajo, la vista sigue
-- publicando el nombre viejo. Se rehace para que las dos digan lo mismo.
drop view if exists comercial.proyectos_con_operaciones;

alter table comercial.proyectos
  rename column descripcion_en to scope_en;

alter table comercial.proyectos
  add column if not exists scope_es text;

comment on column comercial.proyectos.scope_es is
  'El alcance en una linea, en castellano, como lo escribe el track record. La descripcion larga es para adentro.';
comment on column comercial.proyectos.scope_en is
  'Scope of work, one line, as the track record writes it.';

create view comercial.proyectos_con_operaciones as
select
  p.*,
  count(o.id)                                      as operaciones,
  count(o.id) filter (where o.estado = 'en_curso') as operaciones_en_curso,
  min(o.fecha_inicio)                              as arranco,
  max(o.fecha_fin)                                 as termino,
  coalesce(sum(o.valor) filter (where o.estado <> 'cancelada'), 0) as valor_ejecutado
from comercial.proyectos p
left join comercial.operaciones o on o.proyecto_id = p.id
group by p.id;

grant select on comercial.proyectos_con_operaciones to authenticated, service_role;

-- ------------------------------------------------------------
-- Los cuatro proyectos que hay, con el scope escrito como lo escribe el
-- documento. El cliente y la region ya van en sus columnas, asi que el
-- scope dice solo el trabajo.
-- ------------------------------------------------------------
update comercial.proyectos set
  scope_es = 'Buque de apoyo al alije',
  scope_en = 'Lightering Support Vessel'
where nombre = 'Service Management / STS';

update comercial.proyectos set
  scope_es = 'Remolque del POSEIDON con estructuras sobre cubierta',
  scope_en = 'Towing of POSEIDON with structures on deck'
where nombre = 'UABL / Traslado POSEIDON';

update comercial.proyectos set
  scope_es = 'Survey geofisico',
  scope_en = 'Geophysical Survey'
where nombre = 'Fugro / Survey Golfo San Matias';

update comercial.proyectos set
  scope_es = 'Apoyo offshore / flotel',
  scope_en = 'Offshore Support / Flotel'
where nombre = 'HOC / Flotel VMOS';

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select nro_proyecto, nombre, scope_es, scope_en
from comercial.proyectos
order by nro_proyecto nulls last;
