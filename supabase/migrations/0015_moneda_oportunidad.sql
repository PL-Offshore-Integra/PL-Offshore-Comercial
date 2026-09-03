-- ============================================================
-- 0015 · Moneda en la oportunidad
--
-- Las condiciones comerciales pasan a incluir en que moneda se cotiza:
-- dolares o pesos. El proyecto ya la tenia (0012) y ahora la hereda de
-- la oportunidad al convertirse.
--
-- Default USD porque es como se cotiza casi todo el offshore, y porque
-- las cinco filas que ya estan cargadas estan en dolares.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0014.
-- ============================================================

alter table comercial.oportunidades
  add column if not exists moneda text not null default 'USD';

alter table comercial.oportunidades
  drop constraint if exists opp_moneda_check;
alter table comercial.oportunidades
  add constraint opp_moneda_check check (moneda in ('USD','ARS'));

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select moneda, count(*) as filas, sum(valor) as total
from comercial.oportunidades
group by 1 order by 1;
