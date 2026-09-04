-- ============================================================
-- 0027 · La zona es de la salida, no del proyecto
--
-- Cuando le pregunte a Silvestre si en Service Management la zona era
-- siempre la misma —para ponersela a la plantilla y que baje sola— la
-- respuesta fue que no: el buque puede operar en zona Alfa, en zona
-- Delta o en KM 171.
--
-- Eso cambia donde vive el dato. Si un proyecto de cinco años trabaja
-- en tres lugares distintos, el lugar no es del proyecto: es de cada
-- salida. El proyecto puede seguir teniendo una zona —sirve como
-- referencia y es lo que hoy lo pone en el mapa—, pero la verdad de
-- donde se trabajo esta en la operacion.
--
-- Asi que la salida deja de tener la zona como texto libre y pasa a
-- elegirla del maestro, igual que la oportunidad y el proyecto. La
-- columna vieja `zona` se queda con lo que tenga: no la escribe nadie
-- mas. Mismo criterio que `alcance` en 0026.
--
-- Las dos zonas nuevas van sin coordenadas, igual que Alfa: no las
-- invento. Las tres se completan de una sola vez en Maestros -> Zonas
-- cuando Maximo diga donde quedan.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0026.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Las otras dos zonas donde trabaja el Golondrina
-- ------------------------------------------------------------
insert into comercial.zonas (nombre, tipo, lat, lon, notas) values
  ('Delta',  'zona_sts', null, null,
   'Zona de STS. Falta la posicion.'),
  ('KM 171', 'zona_sts', null, null,
   'Punto de operacion sobre el rio, por kilometro. Falta la posicion.')
on conflict do nothing;

-- Y se deja dicho en Alfa que no esta sola.
update comercial.zonas
set notas = 'Zona de STS. Falta la posicion. Con Service Management el buque puede operar aca, en Delta o en KM 171.'
where nombre = 'Alfa'
  and notas = 'Zona de STS. Falta la posicion.';

-- ------------------------------------------------------------
-- 2) La salida apunta al maestro
-- ------------------------------------------------------------
alter table comercial.operaciones
  add column if not exists zona_id uuid references comercial.zonas(id) on delete set null;

create index if not exists ix_com_oper_zona on comercial.operaciones (zona_id);

comment on column comercial.operaciones.zona is
  'Texto libre, historico. Lo reemplazo zona_id en 0027 y el formulario dejo de escribirlo.';

-- Lo que ya se puede pasar solo: donde el texto coincide con una zona
-- del maestro. 'Alfa' de OP-1-2026 entra por aca.
update comercial.operaciones o
set zona_id = z.id
from comercial.zonas z
where o.zona_id is null
  and o.zona is not null
  and lower(trim(z.nombre)) = lower(trim(o.zona));

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select o.nro_operacion, o.nombre, o.zona as texto_viejo, z.nombre as zona_del_maestro
from comercial.operaciones o
left join comercial.zonas z on z.id = o.zona_id
order by o.nro_operacion;

select nombre, tipo, lat is not null as ubicada, notas
from comercial.zonas
where tipo = 'zona_sts'
order by nombre;
