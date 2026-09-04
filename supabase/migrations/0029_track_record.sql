-- ============================================================
-- 0029 · Track record
--
-- Lo que la empresa hizo, para mandarlo con una propuesta. Se venia
-- manteniendo en "Company - Track Record_v1.xlsx", con una hoja por
-- linea de negocio.
--
-- POR QUE NO ES UNA VISTA DE LOS PROYECTOS
--
--   Porque casi todo es de antes del modulo: 84 filas de chartering
--   desde 2017, con buques que ya no estan (Cruz del Sur, WP Halle) y
--   clientes que no pasaron por ninguna oportunidad cargada. Eso no se
--   deriva de nada: se importa.
--
--   Y porque es un documento que sale para afuera. En el xlsx los
--   valores estan redondeados a proposito —"~0.5 million"— y todo esta
--   en ingles. Son decisiones de que se muestra, no datos de gestion.
--
-- COMO SE ALIMENTA DE ACA EN ADELANTE
--
--   Los proyectos que se terminan en el modulo aparecen solos: la
--   pantalla une esta tabla con los proyectos en estado finalizado. Asi
--   nadie tiene que acordarse de cargar el track record.
--
--   Y si alguna vez hay que retocar como se cuenta un trabajo antes de
--   mostrarlo —traducirlo, redondear el valor, cambiarle el alcance—
--   alcanza con crear la fila aca con su `proyecto_id`: esa fila
--   reemplaza a la derivada. No hace falta hoy; la puerta queda
--   abierta.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0028.
-- ============================================================

create table if not exists comercial.track_record (
  id         uuid primary key default gen_random_uuid(),

  -- La linea de negocio, que en el xlsx es una hoja.
  seccion    text not null
    check (seccion in ('chartering', 'charter_in', 'management')),

  -- Los campos del documento, con sus nombres traducidos. El contenido
  -- va en ingles porque el documento se manda en ingles.
  buque          text,
  tipo_de_buque  text,
  -- El armador, cuando el buque no es propio: charter-in y management.
  armador        text,
  cliente        text,
  region         text,
  -- Texto libre a proposito: "~35 days", "Spot", "~14 months". El
  -- documento no dice fechas exactas y no conviene inventarlas.
  periodo        text,
  alcance        text,

  anio_desde     int check (anio_desde is null or anio_desde between 1980 and 2100),
  anio_hasta     int check (anio_hasta is null or anio_hasta between 1980 and 2100),

  -- El valor en dos formas: el numero para poder sumar, y el texto tal
  -- como lo dice el documento ("~0.5 million", "On going").
  valor_usd      numeric(14,2),
  valor_texto    text,

  -- Si esta fila reemplaza a un proyecto del modulo.
  proyecto_id    uuid references comercial.proyectos(id) on delete set null,

  notas          text,
  -- Retirar una fila del documento sin borrarla.
  activa         boolean not null default true,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ix_com_tr_seccion on comercial.track_record (seccion);
create index if not exists ix_com_tr_anio    on comercial.track_record (anio_desde);
-- Un proyecto no puede tener dos filas que lo reemplacen.
create unique index if not exists ux_com_tr_proyecto
  on comercial.track_record (proyecto_id)
  where proyecto_id is not null;

alter table comercial.track_record enable row level security;

drop policy if exists "authenticated_all_track_record" on comercial.track_record;
create policy "authenticated_all_track_record" on comercial.track_record
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on comercial.track_record
  to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'comercial' and table_name = 'track_record'
order by ordinal_position;
