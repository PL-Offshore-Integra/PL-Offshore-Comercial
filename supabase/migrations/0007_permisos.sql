-- ============================================================
-- 0007 · Permisos del esquema comercial
--
-- El esquema `comercial` se creo sin ACL: dueno postgres y nadie
-- mas. Verificado antes de escribir esto:
--
--   pg_namespace.nspacl = null para comercial
--   0 de 9 objetos legibles por el rol `authenticated`
--
-- Por eso toda la app respondia "permission denied for schema
-- comercial": no era .env.local ni las migraciones sin correr, era
-- que el rol con el que entra la aplicacion no tenia permiso de
-- entrar al esquema. RLS estaba bien configurado todo este tiempo,
-- pero nunca llegaba a evaluarse.
--
-- Se le da acceso a `authenticated`, no a `anon`: las politicas de
-- RLS son todas `to authenticated` y el modulo exige login, asi que
-- una consulta sin sesion tiene que morir aca.
--
-- `service_role` va incluido porque es el rol que usan las Edge
-- Functions y los procesos de servidor.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0006.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Entrar al esquema
-- ------------------------------------------------------------
grant usage on schema comercial to authenticated, service_role;

-- ------------------------------------------------------------
-- 2) Lo que ya existe
--
-- Incluye las vistas (oportunidades_resumen, clientes) y las tablas
-- nuevas: adjuntos, tarifas, historial y el contador de numeracion.
-- Sobre las tablas manda RLS igual; el grant es la puerta, la
-- politica es el filtro.
-- ------------------------------------------------------------
grant select, insert, update, delete on all tables in schema comercial
  to authenticated, service_role;

grant usage, select on all sequences in schema comercial
  to authenticated, service_role;

-- ------------------------------------------------------------
-- 3) Lo que se cree de aca en adelante
--
-- Sin esto, cada tabla nueva vuelve a nacer invisible y el sintoma
-- reaparece una migracion mas tarde. Aplica a los objetos que cree
-- el rol que corre las migraciones (postgres).
-- ------------------------------------------------------------
alter default privileges in schema comercial
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema comercial
  grant usage, select on sequences to authenticated, service_role;

-- ------------------------------------------------------------
-- 4) Ver como quedo
-- ------------------------------------------------------------
select count(*) filter (where c.relkind in ('r','v'))                        as objetos,
       count(*) filter (where has_table_privilege('authenticated', c.oid, 'SELECT'))
                                                                             as legibles,
       has_schema_privilege('authenticated', 'comercial', 'USAGE')           as puede_entrar
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'comercial' and c.relkind in ('r','v');
