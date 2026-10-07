-- ---------------------------------------------------------------------------
-- Las vistas de comercial corren con los permisos de quien consulta
-- ---------------------------------------------------------------------------
--
-- Hasta ahora las cinco vistas corrian con los permisos de su dueño, que se
-- saltea la RLS de las tablas que leen. El Security Advisor de Supabase las
-- marcaba como error (`security_definer_view`). Con `security_invoker` cada
-- consulta aplica la RLS de comercial.* como si leyera las tablas directo.
--
-- No cambia lo que ve nadie: las politicas de esas tablas dejan ver todo a
-- cualquier usuario con sesion, y anon no tiene select sobre las vistas.
-- Este cambio ya se aplico en produccion el 07/10/2026 desde el panel; la
-- migracion lo deja registrado en el repo.
--
-- REGLA PARA LO QUE VENGA: toda vista nueva o recreada en este proyecto
-- lleva `with (security_invoker = on)`. Un `create or replace view` o un
-- `drop view` + `create view` sin esa opcion la vuelve a dejar con los
-- permisos del dueño, y el advisor la vuelve a marcar.
--
--   create or replace view comercial.ejemplo
--     with (security_invoker = on) as
--   select ...;
-- ---------------------------------------------------------------------------

alter view comercial.oportunidades_resumen     set (security_invoker = on);
alter view comercial.clientes                  set (security_invoker = on);
alter view comercial.plantillas_listado        set (security_invoker = on);
alter view comercial.facturas_listado          set (security_invoker = on);
alter view comercial.proyectos_con_operaciones set (security_invoker = on);

-- Verificacion: las cinco con la opcion puesta.
select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'comercial' and c.relkind = 'v'
order by c.relname;
