-- ============================================================
-- 0026 · La plantilla trae tambien el nombre del proyecto
--
-- En Service Management no cambia nada de una vez a la otra: el
-- proyecto se llama siempre igual y consiste siempre en lo mismo. La
-- plantilla ya traia el texto de "en que consiste" (`descripcion`),
-- pero el nombre habia que tipearlo cada vez.
--
-- Son dos cosas distintas y por eso son dos columnas:
--
--   nombre            como se elige la plantilla en la lista de atajos
--   nombre_proyecto   como se va a llamar el trabajo que salga de ella
--
-- Casi siempre van a decir lo mismo. No tienen por que: uno es la
-- etiqueta de un atajo y el otro el nombre de un trabajo real, que
-- termina en la ficha, en el listado y en lo que ve Finanzas.
--
-- EL ALCANCE SALE DE LOS FORMULARIOS
--
--   `alcance` era un casillero de una palabra que se pisaba con lo que
--   ya dice "en que consiste". Se saca de la pantalla de la plantilla y
--   del proyecto. Las columnas se quedan donde estan, con lo que
--   tengan: no las escribe nadie mas, y borrar datos viejos porque la
--   pantalla dejo de mostrarlos seria otra cosa. Mismo criterio que
--   `notas`/`referencias`/`proximos_pasos` en 0013.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0025.
-- ============================================================

alter table comercial.plantillas
  add column if not exists nombre_proyecto text;

comment on column comercial.plantillas.nombre_proyecto is
  'Como se llama el proyecto que sale de esta plantilla. Distinto de `nombre`, que es como se elige la plantilla.';

-- La que ya existe: el nombre del proyecto es el que tiene el proyecto
-- real que salio de ella, no el de la plantilla, aunque hoy coincidan.
update comercial.plantillas
set nombre_proyecto = 'Service Management / STS'
where nombre_proyecto is null
  and lower(trim(nombre)) = 'service management / sts';

-- El resto: se propone el nombre de la plantilla, que es lo que alguien
-- hubiera tipeado igual. Se puede cambiar desde la pantalla.
update comercial.plantillas
set nombre_proyecto = nombre
where nombre_proyecto is null;

-- ------------------------------------------------------------
-- El valor del proyecto pasa a ser la suma de sus tarifas
--
-- Hasta hoy era un numero que se escribia a mano, y quedaba en 0 si
-- nadie lo llenaba: PRY-1-2026 tiene cuatro tarifas cargadas y valor
-- 0,00. Ahora la pantalla lo calcula —dia garantizado + tarifa
-- diferencial + mob + demob, sin multiplicar por dias, porque un
-- proyecto no tiene dias— y el servidor lo recalcula al guardar.
--
-- Aca se acomodan solo los que estan en cero. Si alguno tuviera un
-- valor escrito a mano se deja como esta: lo va a recalcular la proxima
-- vez que alguien guarde ese proyecto, y que lo haga con la pantalla
-- abierta y a la vista es mejor que hacerlo por lo bajo desde una
-- migracion.
--
-- Quedan afuera de la suma los conceptos contingentes —stand by,
-- demurrage, accommodation— que se cobran solo si pasan, y la comision
-- del broker, que no se le cobra al cliente.
-- ------------------------------------------------------------
update comercial.proyectos p
set valor = s.total
from (
  select t.proyecto_id, sum(t.monto) as total
  from comercial.proyecto_tarifas t
  where t.concepto not in ('standby','demurrage','accommodation','comision')
  group by t.proyecto_id
) s
where p.id = s.proyecto_id
  and coalesce(p.valor, 0) = 0
  and s.total > 0;

-- ------------------------------------------------------------
-- La vista del listado, otra vez
--
-- `plantillas_listado` hace `select p.*`, y un `*` en una vista se
-- congela con las columnas que habia el dia que se creo: la vista
-- seguiria sin `nombre_proyecto` aunque la tabla ya la tenga.
--
-- Hoy no rompe nada —las dos pantallas que la leen no usan esa
-- columna—, pero una vista a la que le falta una columna de su propia
-- tabla es una trampa para el que venga despues. Se rehace.
--
-- Va con drop y no con `create or replace`: la columna nueva cae en el
-- medio de la lista, y reemplazar una vista solo admite columnas
-- agregadas al final.
-- ------------------------------------------------------------
drop view if exists comercial.plantillas_listado;

create view comercial.plantillas_listado as
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

-- El grant se va con el drop.
grant select on comercial.plantillas_listado to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select nombre, nombre_proyecto, estructura_tarifaria, activa
from comercial.plantillas
order by nombre;

select nro_proyecto, nombre, valor, estructura_tarifaria
from comercial.proyectos
order by nro_proyecto;
