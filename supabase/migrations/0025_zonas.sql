-- ============================================================
-- 0025 · Maestro de zonas, y el mapa que sale de el
--
-- Silvestre pidio un mapa que muestre donde se harian los trabajos
-- posibles, y de paso donde se trabajo. El problema no era el mapa: era
-- que hasta hoy el lugar vive en prosa y en tres formas distintas.
--
--   PL-1-2026   "relevamiento geofisico de proyecto ampliacion FENIX
--                (Total Austral) en Magallanes"
--   PL-2-2026   "Relevamiento Geofisico en area Magallanes."
--   OP-1-2026   zona = 'Alfa'
--
-- Un humano entiende las tres. Un mapa no puede dibujar ninguna.
--
-- Asi que primero el maestro: cada lugar una fila, con nombre y
-- coordenadas, y la oportunidad y el proyecto lo eligen de una lista.
-- El mapa despues es casi un subproducto — y ademas se termina el
-- problema de tener "Bahia Blanca", "Bahía Blanca" e "Ing. White" como
-- tres lugares distintos.
--
-- LAS COORDENADAS PUEDEN FALTAR, A PROPOSITO
--
--   `lat` y `lon` son nullable. Una zona sin posicion sirve igual para
--   agrupar y para filtrar; lo unico que no puede es dibujarse, y el
--   mapa la lista aparte en vez de tragarsela en silencio.
--
--   Esto no es una comodidad: es que no invento posiciones. Las de los
--   puertos son publicas y estan cargadas aproximadas al minuto, para
--   que se vean en el lugar correcto de la costa. Las de las zonas de
--   STS no las se, asi que van vacias y las completa Maximo, que es
--   quien sabe donde queda Alfa.
--
-- POR QUE EN LA OPORTUNIDAD Y EN EL PROYECTO, Y NO EN LA SALIDA
--
--   Las tres categorias del mapa son oportunidad, proyecto en curso y
--   proyecto terminado, asi que con esas dos tablas alcanza.
--   `operaciones.zona` sigue siendo texto libre por ahora; el dia que
--   se quiera cada salida en el mapa, se estructura igual que estas dos
--   y se apunta a este mismo maestro.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0024.
-- ============================================================

-- ------------------------------------------------------------
-- 1) El maestro
-- ------------------------------------------------------------
create table if not exists comercial.zonas (
  id         uuid primary key default gen_random_uuid(),

  -- Como se lo nombra en la operacion, con las palabras de ellos: la
  -- zona de STS se llama 'Alfa' porque asi la escribe Maximo en la
  -- planilla, no 'Zona Alfa (STS)'.
  nombre     text not null,

  tipo       text not null default 'puerto'
    check (tipo in ('puerto','zona_sts','area_offshore','otro')),

  -- Grados decimales, negativos al sur y al oeste. Nullable: ver arriba.
  lat        numeric(9,6),
  lon        numeric(9,6),

  -- Media posicion no es posicion. O estan las dos o no esta ninguna.
  constraint zonas_posicion_completa check ((lat is null) = (lon is null)),
  constraint zonas_lat_valida check (lat is null or lat between  -90 and  90),
  constraint zonas_lon_valida check (lon is null or lon between -180 and 180),

  notas      text,
  -- Retirarla sin borrarla: deja de ofrecerse en los desplegables pero
  -- las oportunidades viejas siguen apuntando bien.
  activa     boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un lugar, una fila. Sin distinguir mayusculas ni espacios de sobra,
-- que es como se cuelan los duplicados.
create unique index if not exists ux_com_zonas_nombre
  on comercial.zonas (lower(trim(nombre)));

comment on column comercial.zonas.lat is
  'Latitud en grados decimales. Aproximada: se corrige desde el maestro de zonas.';
comment on column comercial.zonas.lon is
  'Longitud en grados decimales. Aproximada: se corrige desde el maestro de zonas.';

-- ------------------------------------------------------------
-- 2) Quien apunta al maestro
--
-- `on delete set null`: borrar una zona no puede borrar una
-- oportunidad. Queda sin lugar y se vuelve a elegir.
-- ------------------------------------------------------------
alter table comercial.oportunidades
  add column if not exists zona_id uuid references comercial.zonas(id) on delete set null;

alter table comercial.proyectos
  add column if not exists zona_id uuid references comercial.zonas(id) on delete set null;

create index if not exists ix_com_opp_zona on comercial.oportunidades (zona_id);
create index if not exists ix_com_proy_zona on comercial.proyectos (zona_id);

-- ------------------------------------------------------------
-- 3) La carga inicial
--
-- Los puertos de la costa y del Parana, las areas offshore donde se
-- trabaja o se cotiza, y la unica zona de STS que aparece en los datos
-- reales. Es un punto de partida para no arrancar con una lista vacia:
-- lo que sobre se retira con `activa`, y lo que falte se agrega desde
-- el maestro.
--
-- `on conflict do nothing` para que correr esto dos veces no duplique
-- ni pise una posicion ya corregida a mano.
-- ------------------------------------------------------------
insert into comercial.zonas (nombre, tipo, lat, lon, notas) values
  -- La zona de STS que aparece en OP-1-2026. Sin posicion: la carga quien
  -- la sabe.
  ('Alfa', 'zona_sts', null, null, 'Zona de STS. Falta la posicion.'),

  -- Costa atlantica
  ('Ingeniero White',  'puerto', -38.780000, -62.270000, 'Bahia Blanca.'),
  ('Puerto Rosales',   'puerto', -38.920000, -62.070000, 'Bahia Blanca.'),
  ('Mar del Plata',    'puerto', -38.030000, -57.530000, null),
  ('Quequen',          'puerto', -38.570000, -58.700000, 'Necochea.'),
  ('Puerto Madryn',    'puerto', -42.770000, -65.030000, null),
  ('Comodoro Rivadavia','puerto',-45.870000, -67.470000, null),
  ('Puerto Deseado',   'puerto', -47.750000, -65.900000, null),
  ('Punta Loyola',     'puerto', -51.600000, -69.000000, 'Rio Gallegos.'),
  ('Rio Grande',       'puerto', -53.790000, -67.700000, 'Tierra del Fuego.'),
  ('Ushuaia',          'puerto', -54.810000, -68.300000, null),

  -- Rio de la Plata y Parana
  ('Dock Sud',         'puerto', -34.630000, -58.350000, 'Buenos Aires.'),
  ('La Plata',         'puerto', -34.850000, -57.880000, null),
  ('Zarate',           'puerto', -34.100000, -59.030000, null),
  ('Campana',          'puerto', -34.160000, -58.950000, null),
  ('San Lorenzo',      'puerto', -32.750000, -60.730000, null),
  ('Rosario',          'puerto', -32.950000, -60.630000, null),

  -- Areas offshore. El centro del area, no un punto exacto: son
  -- cientos de kilometros cuadrados.
  ('Cuenca Austral (Magallanes)', 'area_offshore', -53.500000, -67.000000,
   'Centro aproximado del area. Es donde cae el proyecto FENIX de Total Austral.'),
  ('Golfo San Jorge', 'area_offshore', -46.000000, -66.500000,
   'Centro aproximado del area.'),
  ('Cuenca Argentina Norte (CAN)', 'area_offshore', -38.500000, -55.000000,
   'Centro aproximado del area, frente a Mar del Plata.')
on conflict do nothing;

-- ------------------------------------------------------------
-- 4) Lo que ya se puede ubicar solo
--
-- Dos oportunidades dicen "Magallanes" en el alcance, sin ambiguedad
-- posible, y la salida de Service Management dice 'Alfa' en su propio
-- casillero. Eso se puede pasar sin adivinar nada. El resto queda vacio
-- y lo elige quien cargo el trabajo.
-- ------------------------------------------------------------
update comercial.oportunidades o
set zona_id = z.id
from comercial.zonas z
where z.nombre = 'Cuenca Austral (Magallanes)'
  and o.zona_id is null
  and o.descripcion_alcance ilike '%magallanes%';

-- El proyecto hereda la zona de su ultima salida, cuando el texto de la
-- salida coincide exacto con una zona del maestro.
update comercial.proyectos p
set zona_id = z.id
from (
  select distinct on (o.proyecto_id) o.proyecto_id, o.zona
  from comercial.operaciones o
  where o.zona is not null
  order by o.proyecto_id, o.fecha_inicio desc nulls last
) ultima
join comercial.zonas z on lower(trim(z.nombre)) = lower(trim(ultima.zona))
where p.id = ultima.proyecto_id
  and p.zona_id is null;

-- ------------------------------------------------------------
-- 5) RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.zonas enable row level security;

drop policy if exists "authenticated_all_zonas" on comercial.zonas;
create policy "authenticated_all_zonas" on comercial.zonas
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on comercial.zonas
  to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select z.nombre, z.tipo,
       z.lat is not null as ubicada,
       (select count(*) from comercial.oportunidades o where o.zona_id = z.id) as oportunidades,
       (select count(*) from comercial.proyectos   p where p.zona_id = z.id) as proyectos
from comercial.zonas z
order by z.tipo, z.nombre;
