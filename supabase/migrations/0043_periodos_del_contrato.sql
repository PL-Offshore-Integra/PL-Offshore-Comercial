-- ---------------------------------------------------------------------------
-- Los periodos de un contrato: el original y sus adendas
-- ---------------------------------------------------------------------------
--
-- EL PROBLEMA
--
--   Un proyecto tiene hoy dos fechas sueltas —fecha_inicio_estimada y
--   fecha_fin_estimada— y un valor escrito a mano. Eso alcanza para un trabajo
--   que se firma una vez y se hace, pero no para un contrato que se extiende.
--
--   El caso que lo rompe es PRY-4, el Atlantic Dama como flotel para HOC: se
--   firmo un contrato con fecha de inicio y de fin, y despues se fue
--   extendiendo por adendas. Para reflejar la extension con el modelo de hoy
--   hay que SOBRESCRIBIR la fecha de fin y el valor, y lo que decia el
--   contrato original se pierde. Justamente eso —desde cuando rige cada cosa,
--   y a que tarifa— es lo que despues se discute con el cliente cuando
--   aparece una diferencia.
--
-- LOS TRES NIVELES
--
--   PROYECTO   el contrato. Es uno y no se parte: PRY-4 sigue siendo PRY-4
--              aunque tenga cuatro adendas.
--   PERIODOS   esta tabla. El contrato original, y una fila por adenda.
--   SALIDAS    las operaciones, que para un time charter son los hire
--              statements. Cortan por su cuenta —por mes o por quincena— y
--              NO coinciden con los periodos: un statement puede caer a
--              caballo de dos adendas. Ya existen y no se tocan aca.
--
-- LA TARIFA VIVE EN EL PERIODO
--
--   Una adenda puede cambiar la tarifa, y es lo que obliga a que el periodo
--   sea una fila y no una fecha. Un statement que cae entre dos periodos con
--   tarifas distintas se liquida con dos renglones, uno por tarifa. Es el
--   mismo mecanismo que el HIRE / EXTENSION HIRE que ya traen los statements
--   de Arendal.
--
--   Es UNA tarifa por periodo y no una tabla de tarifas como las otras cuatro
--   del modulo. Decidido asi por Silvestre: la que se mueve en una adenda es
--   la diaria. Si alguna adenda tocara el accommodation o agregara un
--   standby, va en las notas del periodo.
--
-- QUE NO CAMBIA
--
--   Un proyecto SIN periodos cargados funciona exactamente como hoy: fechas
--   estimadas y valor a mano. Los periodos mandan solo donde los haya. Por eso
--   esta migracion no toca ninguna fila existente ni ninguna vista: los cinco
--   proyectos cargados siguen viendose igual hasta que alguien cargue el
--   primer periodo.
--
-- Corrida en produccion el 26/11/2026 por la Management API: la verificacion
-- devolvio la tabla vacia, la columna periodo_id en proyecto_adjuntos, una
-- politica, tres indices y los cinco proyectos intactos.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------
-- 1) La tabla
-- ------------------------------------------------------------
create table if not exists comercial.proyecto_periodos (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references comercial.proyectos(id) on delete cascade,

  -- 1 es el contrato original; de ahi en adelante, las adendas en orden.
  orden         integer not null default 1,
  tipo          text    not null default 'adenda'
                check (tipo in ('contrato', 'adenda')),

  -- Lo que dice el papel: "Addendum No. 1", el numero de CP, lo que sea.
  referencia    text,

  -- Con hora, por lo mismo que las operaciones: de la hora sale la fraccion
  -- de dia que se cobra. `hasta` vacio = el periodo sigue abierto, que es el
  -- estado normal de la ultima adenda de un contrato en curso.
  desde         timestamptz not null,
  hasta         timestamptz,

  -- La tarifa diaria que rige en este periodo. Vacia cuando el periodo no se
  -- cobra por dia (un lump sum, por ejemplo): el periodo sigue sirviendo para
  -- decir desde cuando y hasta cuando.
  tarifa_diaria numeric(14,2),

  -- Cuando se firmo. Vacia a proposito cuando se acordo por mail o cuando
  -- simplemente se siguio facturando: eso se cuenta en las notas.
  firmado_el    date,

  notas         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Un periodo que termina antes de empezar es un error de carga.
  constraint ck_periodo_ventana check (hasta is null or hasta > desde)
);

comment on table comercial.proyecto_periodos is
  'El contrato original y sus adendas. El proyecto no se parte: se le agregan periodos.';
comment on column comercial.proyecto_periodos.tarifa_diaria is
  'La tarifa que rige en este periodo. Una adenda puede cambiarla, y por eso vive aca y no en el proyecto.';

-- Un solo periodo original por proyecto: dos filas tipo 'contrato' serian dos
-- contratos, y eso es otro proyecto.
create unique index if not exists ux_com_periodo_contrato
  on comercial.proyecto_periodos (proyecto_id)
  where tipo = 'contrato';

create index if not exists ix_com_periodos_proyecto
  on comercial.proyecto_periodos (proyecto_id, orden);

-- ------------------------------------------------------------
-- 2) El PDF de la adenda cuelga de su adenda
-- ------------------------------------------------------------
--
-- Sin esto, el papel de la adenda 2 queda suelto en "otra documentacion" del
-- proyecto, al lado del contrato y de las demas, y hay que abrirlos para
-- saber cual es cual. La columna es opcional: los adjuntos que ya estan
-- —y los que no son de un periodo— siguen colgando del proyecto a secas.
alter table comercial.proyecto_adjuntos
  add column if not exists periodo_id uuid
    references comercial.proyecto_periodos(id) on delete set null;

create index if not exists ix_com_proy_adjuntos_periodo
  on comercial.proyecto_adjuntos (periodo_id);

-- ------------------------------------------------------------
-- 3) updated_at, con el disparador que ya usa el resto del esquema
-- ------------------------------------------------------------
drop trigger if exists tg_periodos_updated on comercial.proyecto_periodos;
create trigger tg_periodos_updated
  before update on comercial.proyecto_periodos
  for each row execute function comercial.set_updated_at();

-- ------------------------------------------------------------
-- 4) RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.proyecto_periodos enable row level security;

drop policy if exists "authenticated_all_proy_periodos" on comercial.proyecto_periodos;
create policy "authenticated_all_proy_periodos" on comercial.proyecto_periodos
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete
  on comercial.proyecto_periodos
  to authenticated, service_role;

-- ------------------------------------------------------------
-- 5) Ver como quedo
-- ------------------------------------------------------------
-- La tabla vacia, la columna nueva en los adjuntos y ningun proyecto tocado.
select
  (select count(*) from comercial.proyecto_periodos)  as periodos_cargados,
  (select count(*) from information_schema.columns
    where table_schema = 'comercial'
      and table_name = 'proyecto_adjuntos'
      and column_name = 'periodo_id')                 as columna_periodo_id,
  (select count(*) from comercial.proyectos)          as proyectos;
