-- ============================================================
-- 0011 · El numero pasa a PL-<n>-<anio>
--
-- Era Ploffshore-<n>-<anio> (0006). Cambia solo el prefijo: el
-- contador sigue arrancando en 1 cada anio y el anio sigue saliendo de
-- la fecha de alta, no del reloj.
--
-- No choca con los numeros del tracker original —PL-1, PL-2, PL-3,
-- PL-4— porque el formato nuevo lleva el anio: "PL-1" y "PL-1-2026"
-- son dos cadenas distintas y el indice unico las acepta a las dos.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0010.
-- ============================================================

create or replace function comercial.set_nro_oportunidad()
returns trigger language plpgsql as $fn$
declare
  v_anio int;
  v_n    int;
begin
  if new.nro_oportunidad is null or trim(new.nro_oportunidad) = '' then
    v_anio := extract(year from coalesce(new.fecha_creacion, current_date))::int;

    insert into comercial.oportunidad_contador (anio, ultimo)
    values (v_anio, 1)
    on conflict (anio)
      do update set ultimo = comercial.oportunidad_contador.ultimo + 1
    returning ultimo into v_n;

    new.nro_oportunidad := 'PL-' || v_n || '-' || v_anio;
  end if;
  return new;
end;
$fn$;

-- ------------------------------------------------------------
-- La unica fila que llego a tomar el formato viejo pasa al nuevo, para
-- que la serie 2026 no arranque con dos formatos distintos. El
-- contador no se toca: sigue en 1 y la proxima va a ser PL-2-2026.
-- ------------------------------------------------------------
update comercial.oportunidades
set nro_oportunidad = 'PL-1-2026'
where nro_oportunidad = 'Ploffshore-1-2026';

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select 'proximo numero' as que,
       'PL-' ||
       (coalesce((select ultimo from comercial.oportunidad_contador
                  where anio = extract(year from current_date)::int), 0) + 1)::text ||
       '-' || extract(year from current_date)::int::text as valor
union all
select 'numeros cargados',
       coalesce(string_agg(nro_oportunidad, ', ' order by nro_oportunidad), '(ninguno)')
from comercial.oportunidades where nro_oportunidad is not null;
