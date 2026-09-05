-- ============================================================
-- 0035 · Punta Colorada
--
-- Es donde opera el flotel de VMOS (PRY-4-2026), y no estaba en el
-- maestro. Rio Negro, sobre el Golfo San Matias: en el mapa cae al lado
-- del survey de Fugro, que es en el mismo golfo.
--
--   41°41'S 65°01'W  ->  -41.680000, -65.010000
--
-- Aproximada al minuto, como el resto de los puertos que cargue en 0025:
-- alcanza para que caiga en el lugar correcto de la costa. Si hace falta
-- la posicion exacta del amarre, se corrige desde el maestro de zonas y
-- se mueven todos sus trabajos de una.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0034.
-- ============================================================

insert into comercial.zonas (nombre, tipo, lat, lon, notas) values
  ('Punta Colorada', 'puerto', -41.680000, -65.010000,
   'Rio Negro, sobre el Golfo San Matias. Es donde opera el flotel de VMOS. Posicion aproximada al minuto: 41°41''S 65°01''W.')
on conflict do nothing;

select nombre, tipo, lat, lon from comercial.zonas
where lower(trim(nombre)) = 'punta colorada';
