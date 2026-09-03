-- ============================================================
-- 0022 · Las fechas estimadas del proyecto, con hora
--
-- En estos trabajos la hora no es un detalle: define el precio. Las
-- fechas de la salida ya eran timestamptz desde 0018, pero las
-- estimadas del proyecto habian quedado como `date`, asi que en la
-- misma pantalla convivian dos fechas que se leian igual y una no
-- podia decir la hora.
--
-- El casteo va explicito por zona. Un `date` a timestamptz sin decir
-- nada se interpreta en la zona de la base —UTC— y "2026-08-20" queda
-- en 2026-08-20 00:00 UTC, que en hora argentina es el 19 a las 21:00:
-- un dia menos. Con `at time zone` queda la medianoche de aca, que es
-- lo que la fecha queria decir. Mismo cuidado que en lib/fechas.ts.
--
-- Las oportunidades NO se tocan: ahi el fin estimado se calcula como
-- inicio + dias, aritmetica de dias enteros, y meterle horas cambia esa
-- cuenta. Es otra conversacion.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0021.
-- ============================================================

-- La vista de 0018 hace `select p.*`, asi que depende de estas dos
-- columnas y Postgres no deja cambiarles el tipo mientras exista:
--
--   cannot alter type of a column used by a view or rule
--
-- Se suelta antes y se recrea despues. En la misma transaccion, asi que
-- no hay un momento en que la app la busque y no este.
drop view if exists comercial.proyectos_con_operaciones;

alter table comercial.proyectos
  alter column fecha_inicio_estimada type timestamptz
  using (fecha_inicio_estimada::timestamp at time zone 'America/Argentina/Buenos_Aires');

alter table comercial.proyectos
  alter column fecha_fin_estimada type timestamptz
  using (fecha_fin_estimada::timestamp at time zone 'America/Argentina/Buenos_Aires');

create view comercial.proyectos_con_operaciones as
select
  p.*,
  count(o.id)                                      as operaciones,
  count(o.id) filter (where o.estado = 'en_curso') as operaciones_en_curso,
  min(o.fecha_inicio)                              as arranco,
  max(o.fecha_fin)                                 as termino,
  coalesce(sum(o.valor) filter (where o.estado <> 'cancelada'), 0) as valor_ejecutado
from comercial.proyectos p
left join comercial.operaciones o on o.proyecto_id = p.id
group by p.id;

-- El grant se va con el drop, asi que se vuelve a dar.
grant select on comercial.proyectos_con_operaciones to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'comercial'
  and table_name = 'proyectos'
  and column_name in ('fecha_inicio_estimada', 'fecha_fin_estimada')
order by column_name;
