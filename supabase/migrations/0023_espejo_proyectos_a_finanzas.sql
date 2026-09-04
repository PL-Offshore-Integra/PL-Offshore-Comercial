-- ============================================================
-- 0023 · Los proyectos de Comercial aparecen en Finanzas
--
-- Cuando Comercial crea un proyecto, aparece solo en el maestro de
-- Integra (public.proyectos), sin que nadie lo copie a mano. De ahi lo
-- ven Finanzas, Compras, Viveres, Reparaciones y HSQE.
--
-- QUE NO ES ESTO
--
--   No es la vuelta del puente que saco 0008. Aquel creaba el proyecto
--   al marcar una oportunidad como Ganada, o sea que el maestro de
--   Integra se llenaba de intenciones. Este viaja un escalon mas
--   adelante: el proyecto ya existe en comercial.proyectos, con
--   contrato, moneda y tarifas acordadas, y lo que cruza es eso.
--   La oportunidad sigue sin tocar public.proyectos.
--
-- DIRECCION Y PROPIEDAD DE LOS CAMPOS
--
--   comercial.proyectos  --->  public.proyectos    siempre
--   comercial.proyectos  <---  public.proyectos    nunca
--
--   De Comercial (el espejo los pisa en cada edicion):
--     codigo, nombre, cliente, moneda, fecha_inicio, fecha_fin,
--     descripcion, estado_financiero.
--
--   De Finanzas (el espejo NO los toca al actualizar):
--     presupuesto_total, centro_costo, visible_modulos.
--
--   Dos que a proposito NO se copian:
--
--     valor -> presupuesto_total.  No son lo mismo. `valor` es el
--       precio de venta acordado; `presupuesto_total` es cuanto se
--       espera gastar. Copiar uno en el otro mete plata equivocada en
--       el Consolidado. Lo carga Finanzas.
--
--     buque -> centro_costo.  `buque` es texto libre que se tipea en
--       Comercial; `centro_costo` es un espejo de Xubio. Se propone
--       una sola vez al crear, y solo si el texto coincide exacto con
--       un centro activo (ver punto 3). Si no coincide queda vacio y
--       lo asigna Finanzas.
--
-- LEER ANTES DE CORRER
--
--   Escribe en public.proyectos, la tabla que leen los modulos de
--   Fede. No borra ni modifica ninguna fila existente: agrega una
--   columna nueva y da de alta filas propias, marcadas con
--   origen='comercial' y visible_modulos=false. Hasta que Finanzas las
--   publique, ningun otro modulo las ve en su desplegable.
--
--   Borrar un proyecto en Comercial NO borra su fila en Finanzas: el
--   maestro puede tener requisiciones, pedidos de viveres o SSRR
--   colgando. La fila queda con comercial_proyecto_id apuntando a algo
--   que ya no existe, y se decide a mano que hacer con ella.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0022.
-- ============================================================

-- ------------------------------------------------------------
-- 1) La columna que ata las dos filas
--
-- Sin esto no hay forma de saber si un proyecto de Comercial ya tiene
-- su espejo: `codigo` no sirve porque Finanzas lo puede editar.
--
-- El indice unico es comun, no parcial: en Postgres dos NULL no chocan
-- entre si, asi que las filas nacidas en Finanzas conviven sin
-- problema.
-- ------------------------------------------------------------
alter table public.proyectos
  add column if not exists comercial_proyecto_id uuid;

comment on column public.proyectos.comercial_proyecto_id is
  'Si la fila nacio en Comercial, el id de comercial.proyectos que la origino. NULL para los proyectos creados en Finanzas.';

create unique index if not exists ux_proyectos_comercial_id
  on public.proyectos (comercial_proyecto_id);

-- ------------------------------------------------------------
-- 2) Abrir el porton de origen
--
-- Finanzas instalo un trigger (sql/proyectos_solo_finanzas.sql en ese
-- repo) que rechaza cualquier INSERT cuyo origen no sea exactamente
-- 'finanzas'. Con eso puesto, el espejo revienta con check_violation.
-- Aca se agrega 'comercial' a la lista de altas legitimas.
--
-- Si ese script nunca se corrio, este bloque deja una funcion que
-- ningun trigger llama: no molesta, y hace que 0023 funcione igual en
-- las dos bases posibles.
--
-- OJO, defecto conocido del script original: el paso 1 de aquel
-- archivo pone el default de `origen` en 'finanzas', y los defaults se
-- aplican ANTES de que corra un trigger BEFORE. O sea que un INSERT sin
-- origen (projects-app, control-documentario-epp) llega al chequeo ya
-- con 'finanzas' puesto y pasa. El porton no bloquea lo que dice
-- bloquear. No se arregla aca porque cambia el comportamiento de
-- modulos de Fede: se decide aparte.
-- ------------------------------------------------------------
create or replace function public.proyectos_solo_alta_finanzas()
returns trigger
language plpgsql
as $porton$
begin
  if coalesce(new.origen, '') not in ('finanzas', 'comercial') then
    raise exception
      'Los proyectos se crean unicamente en Finanzas o en Comercial. Alta rechazada (origen=%).',
      coalesce(new.origen, 'sin origen')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$porton$;

-- ------------------------------------------------------------
-- 3) El espejo
--
-- Una sola funcion hace el trabajo y la llaman dos triggers: el de
-- proyectos (punto 4) y el de operaciones (punto 5). Recibe el id del
-- proyecto de Comercial y deja su fila en el maestro al dia.
--
-- SECURITY DEFINER porque escribe en otro esquema, y asi el espejo no
-- depende de que politica de RLS tenga puesta public.proyectos el dia
-- que alguien la cambie. search_path vacio y todo calificado con su
-- esquema, que es como se escribe una funcion definer sin dejar la
-- puerta abierta.
-- ------------------------------------------------------------
create or replace function comercial.espejar_proyecto(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $espejo$
declare
  p     comercial.proyectos%rowtype;
  v_ini timestamptz;
  v_fin timestamptz;
  v_cc  text;
begin
  select * into p from comercial.proyectos where id = p_id;

  -- El proyecto se borro (o la operacion que disparo esto era de un
  -- proyecto que se esta borrando). No hay nada que espejar.
  if not found then
    return;
  end if;

  -- Fechas reales. Desde 0018 el proyecto ya no las tiene: la primera
  -- salida es cuando arranco y la ultima cuando termino. Mientras no
  -- haya operaciones cargadas valen las estimadas, que es lo que se
  -- prometio al cotizar.
  select min(o.fecha_inicio), max(o.fecha_fin)
    into v_ini, v_fin
    from comercial.operaciones o
   where o.proyecto_id = p.id
     and o.estado <> 'cancelada';

  -- Centro de costo por coincidencia exacta de nombre. En Finanzas la
  -- columna guarda el NOMBRE del centro, no un id ni un codigo, y el
  -- buque de Comercial se tipea a mano: si esta bien escrito
  -- ("Golondrina de Mar") engancha, y si no, queda sin asignar y lo
  -- resuelve Finanzas. Nunca inventa un centro que no exista.
  select c.nombre into v_cc
    from public.centros_costo c
   where c.activo
     and c.empresa = 'Parana Logistica'
     and lower(trim(c.nombre)) = lower(trim(coalesce(p.buque, '')))
   limit 1;

  insert into public.proyectos (
    comercial_proyecto_id,
    origen,
    empresa,
    codigo,
    nombre,
    cliente,
    centro_costo,
    moneda,
    fecha_inicio,
    fecha_fin,
    descripcion,
    estado_financiero,
    visible_modulos
  )
  values (
    p.id,
    'comercial',
    -- Valor exacto con el que Finanzas filtra su lista (constante
    -- EMPRESA en su App.jsx). Si no coincide, el proyecto entra a la
    -- tabla y no se ve en la pantalla. El dia del rename a
    -- 'PL Offshore' se cambia en los dos lados.
    'Parana Logistica',
    p.nro_proyecto,
    p.nombre,
    nullif(trim(coalesce(p.compania, '')), ''),
    v_cc,
    p.moneda,
    -- timestamptz -> date con el huso de casa: sin el `at time zone`,
    -- una salida de las 22 h cae al dia siguiente en UTC.
    (coalesce(v_ini, p.fecha_inicio_estimada)
       at time zone 'America/Argentina/Buenos_Aires')::date,
    (coalesce(v_fin, p.fecha_fin_estimada)
       at time zone 'America/Argentina/Buenos_Aires')::date,
    coalesce(nullif(trim(p.descripcion), ''), nullif(trim(p.alcance), '')),
    -- Finanzas tiene tres estados y Comercial cuatro. `cancelado` cae
    -- en 'cerrado': para Finanzas los dos son lo mismo, un proyecto
    -- que ya no va a mover plata.
    case p.estado
      when 'por_arrancar' then 'abierto'
      when 'en_curso'     then 'en_curso'
      else                     'cerrado'
    end,
    false
  )
  on conflict (comercial_proyecto_id) do update set
    codigo            = excluded.codigo,
    nombre            = excluded.nombre,
    cliente           = excluded.cliente,
    moneda            = excluded.moneda,
    fecha_inicio      = excluded.fecha_inicio,
    fecha_fin         = excluded.fecha_fin,
    descripcion       = excluded.descripcion,
    estado_financiero = excluded.estado_financiero;
    -- centro_costo, presupuesto_total y visible_modulos quedan afuera
    -- del update a proposito: son de Finanzas y una edicion en
    -- Comercial no las puede pisar.
end;
$espejo$;

-- ------------------------------------------------------------
-- 4) El trigger del proyecto
--
-- AFTER, no BEFORE: recien cuando la fila esta escrita existe el
-- numero PRY-<n>-<anio>, que lo pone proyectos_set_nro y ese si es
-- BEFORE.
-- ------------------------------------------------------------
create or replace function comercial.tg_espejar_proyecto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $tg$
begin
  perform comercial.espejar_proyecto(new.id);
  return null;
end;
$tg$;

drop trigger if exists proyectos_espejo_integra on comercial.proyectos;

create trigger proyectos_espejo_integra
  after insert or update on comercial.proyectos
  for each row
  execute function comercial.tg_espejar_proyecto();

-- ------------------------------------------------------------
-- 5) El trigger de las operaciones
--
-- Las fechas reales del proyecto salen de sus salidas, asi que cargar
-- una operacion cambia el proyecto sin tocar la fila del proyecto. Sin
-- este segundo trigger, Finanzas se quedaria para siempre con las
-- fechas estimadas.
-- ------------------------------------------------------------
create or replace function comercial.tg_espejar_proyecto_de_operacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $tgop$
begin
  perform comercial.espejar_proyecto(coalesce(new.proyecto_id, old.proyecto_id));
  return null;
end;
$tgop$;

drop trigger if exists operaciones_espejo_integra on comercial.operaciones;

create trigger operaciones_espejo_integra
  after insert or update or delete on comercial.operaciones
  for each row
  execute function comercial.tg_espejar_proyecto_de_operacion();

-- ------------------------------------------------------------
-- 6) Los que ya estaban
--
-- Un update que no cambia nada, solo para que el trigger del punto 4
-- corra una vez por fila. Reusa la misma logica que va a correr de aca
-- en adelante, asi que el backfill no puede quedar distinto del
-- espejo.
-- ------------------------------------------------------------
update comercial.proyectos set nombre = nombre;

-- ------------------------------------------------------------
-- 7) Ver como quedo
-- ------------------------------------------------------------
select m.codigo,
       m.nombre,
       coalesce(m.cliente, '(sin cliente)')      as cliente,
       coalesce(m.centro_costo, '(sin asignar)') as centro_costo,
       m.estado_financiero,
       m.fecha_inicio,
       m.fecha_fin,
       m.origen,
       m.visible_modulos
from public.proyectos m
where m.comercial_proyecto_id is not null
order by m.codigo;

-- ------------------------------------------------------------
-- Para dar marcha atras (pegar y correr):
--
--   drop trigger if exists operaciones_espejo_integra on comercial.operaciones;
--   drop trigger if exists proyectos_espejo_integra on comercial.proyectos;
--   drop function if exists comercial.tg_espejar_proyecto_de_operacion();
--   drop function if exists comercial.tg_espejar_proyecto();
--   drop function if exists comercial.espejar_proyecto(uuid);
--
--   -- Y si ademas se quieren sacar las filas espejadas:
--   delete from public.proyectos where comercial_proyecto_id is not null;
--   drop index if exists public.ux_proyectos_comercial_id;
--   alter table public.proyectos drop column if exists comercial_proyecto_id;
--
--   -- El porton vuelve a admitir solo 'finanzas': copiar la version
--   -- original de Finanzas, sql/proyectos_solo_finanzas.sql.
-- ------------------------------------------------------------
