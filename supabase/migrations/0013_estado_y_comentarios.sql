-- ============================================================
-- 0013 · Estado, comentarios, duracion y tipo de contratacion
--
-- Cambia bastante de la oportunidad, todo pedido junto:
--
--   1. `estadio` (9 valores) pasa a `estado` de tres: abierto, en
--      curso y cerrado. Cerrado lleva `resultado`: ganado o perdido.
--   2. notas + referencias + proximos_pasos se unifican en
--      `comentarios`. Es lo que se ve en la lista, y es donde va el
--      motivo cuando se pierde.
--   3. `duracion_estimada_dias`: la persona pone los dias y el fin
--      estimado se calcula.
--   4. `estructura_tarifaria` pasa a ser el tipo de contratacion:
--      Time Charter o Voyage Charter.
--   5. `demurrage` se suma a los conceptos tarifarios.
--
-- Las columnas viejas (estadio, notas, referencias, proximos_pasos,
-- motivo_perdida) NO se borran: quedan con lo que tenian y la app deja
-- de escribirlas. Borrar datos de cinco filas cargadas a mano no vale
-- lo que se ahorra.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0012.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Estado y resultado
-- ------------------------------------------------------------
alter table comercial.oportunidades
  add column if not exists estado text,
  add column if not exists resultado text,
  add column if not exists comentarios text,
  add column if not exists duracion_estimada_dias int;

-- Mapeo de los nueve estadios a los tres estados. Los cuatro primeros
-- son "todavia no hay nada firme" y los dos siguientes ya son un
-- proceso en marcha.
update comercial.oportunidades set estado =
  case estadio
    when 'Investigando'          then 'abierto'
    when 'Lead'                  then 'abierto'
    when 'Contacto'              then 'abierto'
    when 'Pedido de Cotizacion'  then 'abierto'
    when 'Qualified'             then 'en_curso'
    when 'Propuesta Enviada'     then 'en_curso'
    else 'cerrado'
  end
where estado is null;

update comercial.oportunidades set resultado =
  case estadio
    when 'Ganado'  then 'ganado'
    when 'Perdido' then 'perdido'
    else null
  end
where resultado is null;

alter table comercial.oportunidades
  alter column estado set default 'abierto';

update comercial.oportunidades set estado = 'abierto' where estado is null;

alter table comercial.oportunidades
  alter column estado set not null;

alter table comercial.oportunidades
  drop constraint if exists opp_estado_check;
alter table comercial.oportunidades
  add constraint opp_estado_check
  check (estado in ('abierto','en_curso','cerrado'));

alter table comercial.oportunidades
  drop constraint if exists opp_resultado_check;
alter table comercial.oportunidades
  add constraint opp_resultado_check
  check (resultado is null or resultado in ('ganado','perdido'));

-- Un resultado solo tiene sentido en una cerrada. Al revés no se
-- exige: un `cerrado` sin resultado es un Cancelado del modelo viejo.
alter table comercial.oportunidades
  drop constraint if exists opp_resultado_solo_si_cerrada;
alter table comercial.oportunidades
  add constraint opp_resultado_solo_si_cerrada
  check (resultado is null or estado = 'cerrado') not valid;

-- El motivo de la perdida ahora vive en `comentarios`, que es lo que se
-- muestra en la lista. Reemplaza al check de 0002, que miraba `estadio`.
alter table comercial.oportunidades
  drop constraint if exists opp_perdido_con_motivo;
alter table comercial.oportunidades
  drop constraint if exists opp_perdida_con_comentario;
alter table comercial.oportunidades
  add constraint opp_perdida_con_comentario
  check (resultado <> 'perdido'
         or (comentarios is not null and length(trim(comentarios)) > 0))
  not valid;

-- `estadio` deja de escribirse desde la app, asi que no puede seguir
-- siendo obligatoria.
alter table comercial.oportunidades
  alter column estadio drop not null;

-- ------------------------------------------------------------
-- 2) Comentarios: se juntan los tres campos que habia
--
-- Se concatena lo que exista, con una etiqueta adelante para no perder
-- de donde venia cada parte.
-- ------------------------------------------------------------
update comercial.oportunidades
set comentarios = nullif(trim(concat_ws(
  E'\n',
  nullif(trim(coalesce(proximos_pasos, '')), ''),
  case when nullif(trim(coalesce(notas, '')), '') is not null
       then 'Notas: ' || trim(notas) end,
  case when nullif(trim(coalesce(referencias, '')), '') is not null
       then 'Referencias: ' || trim(referencias) end,
  case when nullif(trim(coalesce(motivo_perdida, '')), '') is not null
       then 'Motivo de la perdida: ' || trim(motivo_perdida) end
)), '')
where comentarios is null;

-- ------------------------------------------------------------
-- 3) Tipo de contratacion
--
-- Time Charter: se alquila el buque por tiempo, asi que el valor total
-- sale del daily hire por los dias mas mov y desmov.
-- Voyage Charter: se cierra un precio por el viaje, asi que el total es
-- la suma de los conceptos.
-- ------------------------------------------------------------
-- El check se dropea ANTES de mover las filas: si no, el viejo rechaza
-- los valores nuevos y la migracion entera se cae.
alter table comercial.oportunidades
  drop constraint if exists oportunidades_estructura_check;

update comercial.oportunidades
set estructura_tarifaria = case estructura_tarifaria
  when 'diaria'                then 'time_charter'
  when 'daily_hire_mob_desmob' then 'time_charter'
  when 'lump_sum'              then 'voyage_charter'
  else 'voyage_charter'
end
where estructura_tarifaria in ('diaria','daily_hire_mob_desmob','lump_sum','otra');

alter table comercial.oportunidades
  add constraint oportunidades_estructura_check
  check (estructura_tarifaria in ('time_charter','voyage_charter'));

alter table comercial.oportunidades
  alter column estructura_tarifaria set default 'time_charter';

-- Lo mismo en proyectos, que copia el tipo de la oportunidad. Mismo
-- orden: primero afuera el check, despues las filas.
alter table comercial.proyectos
  drop constraint if exists proyectos_estructura_tarifaria_check;

update comercial.proyectos
set estructura_tarifaria = case estructura_tarifaria
  when 'diaria'                then 'time_charter'
  when 'daily_hire_mob_desmob' then 'time_charter'
  when 'lump_sum'              then 'voyage_charter'
  else 'voyage_charter'
end
where estructura_tarifaria in ('diaria','daily_hire_mob_desmob','lump_sum','otra');

alter table comercial.proyectos
  add constraint proyectos_estructura_tarifaria_check
  check (estructura_tarifaria in ('time_charter','voyage_charter'));

alter table comercial.proyectos
  alter column estructura_tarifaria set default 'time_charter';

alter table comercial.proyectos
  add column if not exists duracion_estimada_dias int;

-- ------------------------------------------------------------
-- 4) Demurrage como concepto
-- ------------------------------------------------------------
alter table comercial.oportunidad_tarifas
  drop constraint if exists oportunidad_tarifas_concepto_check;
alter table comercial.oportunidad_tarifas
  add constraint oportunidad_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','demurrage','lump_sum','otro'));

alter table comercial.proyecto_tarifas
  drop constraint if exists proyecto_tarifas_concepto_check;
alter table comercial.proyecto_tarifas
  add constraint proyecto_tarifas_concepto_check
  check (concepto in ('movilizacion','desmovilizacion','dia_garantizado',
                      'tarifa_diaria','tarifa_diferencial','standby',
                      'accommodation','demurrage','lump_sum','otro'));

-- ------------------------------------------------------------
-- 5) La vista de clientes pasa a contar por estado/resultado
-- ------------------------------------------------------------
drop view if exists comercial.clientes;

create view comercial.clientes as
select
  e.id                                              as empresa_id,
  e.nombre                                          as compania,
  c.id                                              as contacto_id,
  c.nombre                                          as contacto,
  c.email                                           as contacto_email,
  c.telefono                                        as contacto_telefono,
  c.linkedin                                        as contacto_linkedin,
  c.cargo                                           as contacto_cargo,
  count(o.id)                                       as oportunidades,
  count(o.id) filter (where o.resultado = 'ganado')  as ganadas,
  count(o.id) filter (where o.resultado = 'perdido') as perdidas,
  count(o.id) filter (where o.estado <> 'cerrado')   as abiertas,
  coalesce(sum(o.valor), 0)                         as valor_total,
  max(o.last_interacted_on)                         as ultimo_contacto,
  max(o.fecha_creacion)                             as ultima_oportunidad
from comercial.cliente_empresas e
join comercial.cliente_contactos c on c.empresa_id = e.id
left join comercial.oportunidades o on o.cliente_contacto_id = c.id
group by e.id, e.nombre, c.id, c.nombre, c.email, c.telefono, c.linkedin, c.cargo

union all

select
  e.id, e.nombre, null::uuid, null::text, null::text, null::text, null::text, null::text,
  count(o.id),
  count(o.id) filter (where o.resultado = 'ganado'),
  count(o.id) filter (where o.resultado = 'perdido'),
  count(o.id) filter (where o.estado <> 'cerrado'),
  coalesce(sum(o.valor), 0),
  max(o.last_interacted_on),
  max(o.fecha_creacion)
from comercial.cliente_empresas e
left join comercial.oportunidades o
  on o.cliente_empresa_id = e.id
 and o.cliente_contacto_id is null
where
  not exists (select 1 from comercial.cliente_contactos c where c.empresa_id = e.id)
  or exists (
    select 1 from comercial.oportunidades o2
    where o2.cliente_empresa_id = e.id and o2.cliente_contacto_id is null
  )
group by e.id, e.nombre;

-- ------------------------------------------------------------
-- 6) Ver como quedo
-- ------------------------------------------------------------
select estado, coalesce(resultado,'(sin resultado)') as resultado,
       estructura_tarifaria, count(*) as filas
from comercial.oportunidades
group by 1,2,3 order by 1,2;
