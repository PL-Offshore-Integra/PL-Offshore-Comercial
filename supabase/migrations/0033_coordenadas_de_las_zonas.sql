-- ============================================================
-- 0033 · Las coordenadas que faltaban, y las zonas de alijo que faltaban
--
-- En 0025 deje Alfa sin posicion a proposito, y en 0027 hice lo mismo con
-- Delta y KM 171: "no invento posiciones, las carga Maximo, que es quien
-- sabe donde queda Alfa". Llego el documento de zonas de alijo con las
-- coordenadas oficiales, asi que se cargan.
--
-- El documento trae once zonas y el maestro tenia tres. Las ocho que
-- faltaban se agregan aca mismo: son los lugares donde el buque puede
-- llegar a operar, y tenerlos cargados es lo que permite que una
-- oportunidad futura los elija de la lista en vez de escribirlos.
--
-- UN PUNTO PARA ALGO QUE ES UN AREA
--
--   Salvo KM 171, ninguna de estas zonas es un punto: son poligonos de
--   dos a cinco vertices. El maestro guarda un solo par lat/lon, asi que
--   lo que se carga es el promedio de los vertices —el centro— y los
--   vertices originales quedan escritos en las notas, tal como los da el
--   documento, para que se puedan verificar y para que el dia que el mapa
--   dibuje areas no haya que volver a pedirlos.
--
--   Los vertices no se interpretan. Cinco de las zonas vienen con dos
--   puntos y no se si son las esquinas opuestas de un rectangulo o los
--   extremos de una linea de fondeo; el centro es el mismo en los dos
--   casos, que es justamente por lo que se puede cargar sin preguntar.
--   Dibujar la forma si requiere saberlo.
--
-- BAHIA BLANCA SON DOS
--
--   El documento da dos rectangulos segun el calado del buque —hasta 15 m
--   y de 15 a 22 m— y estan a unos 40 km uno del otro. Van como dos zonas
--   y no como una: el promedio de las dos cajas cae en un lugar donde no
--   fondea nadie. No se tocan Ingeniero White ni Puerto Rosales, que son
--   los puertos y ya tienen su posicion.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0032.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Las tres que ya existian y estaban sin ubicar
--
-- Se pisa la posicion sin condicion: la del documento es la buena.
-- ------------------------------------------------------------
update comercial.zonas
set lat = -35.133333,
    lon = -55.687500,
    notas = $z$Zona de STS en el Rio de la Plata exterior (UY). Vertices: 35°06'30"S 55°37'12"W y 35°09'30"S 55°45'18"W; el punto del mapa es el medio de los dos. El documento de zonas de alijo la llama "Zona Alpha". Con Service Management el buque puede operar aca, en Delta o en KM 171.$z$,
    updated_at = now()
where lower(trim(nombre)) = 'alfa';

update comercial.zonas
set lat = -35.083333,
    lon = -55.225000,
    notas = $z$Zona de STS en el Rio de la Plata exterior (AR). Vertices: 35°04'S 55°11'W y 35°06'S 55°16'W; el punto del mapa es el medio de los dos.$z$,
    updated_at = now()
where lower(trim(nombre)) = 'delta';

-- La unica que si es un punto: el documento da una sola coordenada.
update comercial.zonas
set lat = -33.946389,
    lon = -58.866111,
    notas = $z$Punto de operacion sobre el Parana Guazu, kilometro 171 (AR). Posicion exacta, no un promedio: 33°56'47"S 58°51'58"W.$z$,
    updated_at = now()
where lower(trim(nombre)) = 'km 171';

-- ------------------------------------------------------------
-- 2) Las ocho que faltaban
--
-- `on conflict do nothing` contra el indice unico por nombre: correr esto
-- dos veces no duplica ni pisa una posicion corregida a mano.
-- ------------------------------------------------------------
insert into comercial.zonas (nombre, tipo, lat, lon, notas) values
  ('Bravo', 'zona_sts', -35.525000, -56.550000,
   $z$Zona de STS en el Rio de la Plata exterior (AR). Vertices: 35°30'S 56°30'W y 35°33'S 56°36'W; el punto del mapa es el medio de los dos.$z$),

  ('Charlie', 'zona_sts', -36.033333, -56.566667,
   $z$Zona de STS en el Rio de la Plata exterior (AR). Vertices: 35°59'S 56°30'W y 36°05'S 56°38'W; el punto del mapa es el medio de los dos.$z$),

  ('Rada Montevideo', 'zona_sts', -35.049167, -56.043333,
   $z$Zona de servicio en la rada de Montevideo (UY). Vertices: 35°01'33"S 56°04'12"W, 35°02'27"S 55°59'24"W y 35°04'51"S 56°04'12"W; el punto del mapa es el centro.$z$),

  ('La Paloma', 'zona_sts', -35.056667, -54.000000,
   $z$Zona de alijo frente a La Paloma (UY). Cinco vertices: 35°05'S 54°17'W, 34°53'S 53°47'W, 35°01'S 53°49'W, 35°07'S 53°50'W y 35°11'S 54°17'W; el punto del mapa es el centro.$z$),

  ('Bahia Blanca alijo (hasta 15 m)', 'zona_sts', -39.400000, -61.333333,
   $z$Zona de alijo de Bahia Blanca para buques de hasta 15 m de calado (AR). Rectangulo de 39°23'S a 39°25'S por 61°17'W a 61°23'W; el punto del mapa es el centro.$z$),

  ('Bahia Blanca alijo (15 a 22 m)', 'zona_sts', -39.733333, -61.191667,
   $z$Zona de alijo de Bahia Blanca para buques de 15 a 22 m de calado (AR). Rectangulo de 39°43'S a 39°45'S por 61°10'W a 61°13'W; el punto del mapa es el centro. Esta unos 40 km al sudoeste de la de hasta 15 m.$z$),

  ('Balboa Bay Anchorage', 'zona_sts', 8.823333, -79.535000,
   $z$Fondeadero de la bahia de Balboa, Panama (PA). Rectangulo de 8°48.9'N a 8°49.9'N por 79°31.3'W a 79°32.9'W; el punto del mapa es el centro. Coordenadas en grados y minutos decimales, como las da el documento.$z$),

  ('Chiriqui Grande Lagoon', 'zona_sts', 9.044425, -82.093117,
   $z$Laguna de Chiriqui Grande, Panama (PA). Dos puntos: A en 9°02.298'N 81°59.752'W y B en 9°03.033'N 82°11.422'W; el punto del mapa es el medio de los dos.$z$)
on conflict do nothing;

-- ------------------------------------------------------------
-- 3) Ver como quedo
--
-- La segunda consulta es la que importa: lo que siga sin ubicar despues
-- de esto es lo que el documento no cubre.
-- ------------------------------------------------------------
select nombre, tipo, lat, lon
from comercial.zonas
where tipo = 'zona_sts'
order by lower(nombre);

select nombre, tipo
from comercial.zonas
where lat is null
order by lower(nombre);
