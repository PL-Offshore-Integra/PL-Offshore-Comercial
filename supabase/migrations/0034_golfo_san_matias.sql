-- ============================================================
-- 0034 · La ultima zona sin ubicar
--
-- Golfo San Matias era lo unico que quedaba sin coordenadas despues de
-- 0033: no estaba en el documento de zonas de alijo porque no es una
-- zona de alijo, es el area del survey de Fugro (PRY-3-2026).
--
--   41°30'S 64°15'W  ->  -41.500000, -64.250000
--
-- Es el centro aproximado del golfo, como las otras areas offshore del
-- maestro. Con esto no queda ninguna zona sin ubicar, y lo unico que
-- sigue fuera del mapa son los dos proyectos que todavia no eligieron
-- lugar (PRY-4-2026 y PRY-5-2026), que se arreglan en su propia ficha.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0033.
-- ============================================================

update comercial.zonas
set lat = -41.500000,
    lon = -64.250000,
    notas = 'Centro aproximado del golfo: 41°30''S 64°15''W. Es donde cae el survey de Fugro para YPF/ENI.',
    updated_at = now()
where lower(trim(nombre)) = 'golfo san matias';

-- Lo que siga sin ubicar despues de esto. Deberia no devolver nada.
select nombre, tipo from comercial.zonas where lat is null order by lower(nombre);
