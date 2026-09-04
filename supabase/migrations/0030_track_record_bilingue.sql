-- ============================================================
-- 0030 · El track record en los dos idiomas
--
-- El documento se manda afuera en ingles y adentro se lee en
-- castellano, asi que tiene que poder salir de las dos formas. Y para
-- eso hace falta el texto en los dos: las 98 filas historicas estan en
-- ingles y las que se derivan de un proyecto estan en castellano.
--
-- QUE SE TRADUCE Y QUE NO
--
--   El alcance es el unico texto que necesita las dos versiones
--   guardadas: son 43 frases distintas —"Towing of sheerleg crane",
--   "Lightering Support Vessel"— y una traduccion automatica de
--   terminologia maritima no sirve. Van escritas a mano y se pueden
--   corregir.
--
--   El periodo ("~35 days"), el valor ("~0.5 million") y la region
--   ("Uruguay-Brazil") NO se guardan dos veces: son plantillas con un
--   numero adentro y se arman al mostrar. Guardar dos copias de algo
--   generado es garantizar que un dia digan cosas distintas.
--
--   El tipo de buque tampoco: AHTS, Tug, Pusher, Supply, Seismic, LNG y
--   OSV se dicen igual en las dos.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0029.
-- ============================================================

alter table comercial.track_record
  add column if not exists alcance_en text,
  add column if not exists alcance_es text;

comment on column comercial.track_record.alcance_en is
  'Scope of work en ingles. Es el que sale en el documento en ingles.';
comment on column comercial.track_record.alcance_es is
  'El alcance en castellano. Traducido a mano: la terminologia maritima no se traduce sola.';

-- Lo que ya habia esta en ingles: viene del xlsx, que esta en ingles.
update comercial.track_record
set alcance_en = alcance
where alcance_en is null and alcance is not null;

-- ------------------------------------------------------------
-- El alcance en ingles del proyecto
--
-- Un proyecto del modulo se describe en castellano, y esa descripcion
-- es la que el track record muestra. En el documento en ingles queda
-- una linea en castellano en el medio, que en algo que se le manda a un
-- cliente canta.
--
-- Asi que el proyecto puede llevar su alcance en ingles. Vacio no
-- rompe nada: el track record cae al otro idioma y lo avisa en
-- pantalla, no en el PDF.
-- ------------------------------------------------------------
alter table comercial.proyectos
  add column if not exists descripcion_en text;

comment on column comercial.proyectos.descripcion_en is
  'En que consiste, en ingles. Para el track record, que sale para afuera.';

-- La vista de 0018 hace `select p.*`: agregar una columna a la tabla no
-- la agrega a la vista, que congelo su lista el dia que se creo. Se
-- rehace para que el tablero y el track record vean la columna nueva.
drop view if exists comercial.proyectos_con_operaciones;

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

-- Los dos proyectos historicos que ya aparecen en el track record, con
-- su alcance en ingles escrito con las palabras del propio documento.
update comercial.proyectos
set descripcion_en = 'Geophysical survey for YPF/ENI in Golfo San Matias'
where nombre = 'Fugro / Survey Golfo San Matias' and descripcion_en is null;

update comercial.proyectos
set descripcion_en = 'Towing of the POSEIDON from Rosario to Montevideo with structures on deck'
where nombre = 'UABL / Traslado POSEIDON' and descripcion_en is null;

update comercial.proyectos
set descripcion_en = 'Lightering support vessel (STS operations)'
where nombre = 'Service Management / STS' and descripcion_en is null;

update comercial.proyectos
set descripcion_en = 'Offshore support: accommodation vessel (flotel) for the VMOS project'
where nombre = 'HOC / Flotel VMOS' and descripcion_en is null;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select count(*) as filas,
       count(alcance_en) as con_ingles,
       count(alcance_es) as con_castellano
from comercial.track_record;
