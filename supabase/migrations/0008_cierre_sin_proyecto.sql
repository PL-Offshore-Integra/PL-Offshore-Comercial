-- ============================================================
-- 0008 · Ganar sin crear el proyecto
--
-- Se cierra desde la lista, con dos botones por fila: Ganado marca y
-- listo, Perdido abre un cuadro de dialogo y pide la razon.
--
-- Cambia una sola regla:
--
--   opp_ganado_con_proyecto  se cae. Exigia que una oportunidad en
--                            Ganado tuviera proyecto_id, o sea que
--                            ganar creara el proyecto en
--                            public.proyectos. Ahora ganar es solo
--                            ganar.
--
--   opp_perdido_con_motivo   se queda. El cuadro de dialogo pide la
--                            razon, asi que la regla no molesta a
--                            nadie: es la red por si alguna vez se
--                            escribe desde otro lado.
--
-- La columna proyecto_id y su foreign key siguen donde estaban. El dia
-- que el alta del proyecto vuelva —es el puente con Compras, Viveres y
-- Finanzas— se recupera la funcion ganarOportunidad del historial de
-- git y se vuelve a agregar esta regla:
--
--   alter table comercial.oportunidades
--     add constraint opp_ganado_con_proyecto
--     check (estadio <> 'Ganado' or proyecto_id is not null) not valid;
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0007.
-- ============================================================

alter table comercial.oportunidades
  drop constraint if exists opp_ganado_con_proyecto;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select conname as regla, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'comercial.oportunidades'::regclass
  and conname like 'opp_%'
order by conname;
