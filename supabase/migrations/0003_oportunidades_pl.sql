-- ============================================================
-- 0003 · La oportunidad como la carga PL Offshore
--
--   · numero de oportunidad automatico
--   · contacto completo: nombre, mail y telefono
--   · buque tomado del maestro de centros de costo
--   · en que consiste la tarea
--   · ventana de trabajo estimada (inicio y fin)
--   · documentacion adjunta
--   · base de datos de clientes, derivada de todo lo anterior
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0002.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Contacto y ventana de trabajo
--
-- `contacto` ya existia y guardaba a veces el nombre y a veces el
-- mail (en el seed hay 'pablor@ciati.com.ar' metido ahi). Queda
-- como nombre, y el mail pasa a tener su propia columna.
--
-- Las fechas nuevas NO reemplazan a fecha_esperada_cierre: esa es
-- cuando se define la venta, estas son cuando se haria el trabajo.
-- Son dos cosas distintas y las dos importan.
-- ------------------------------------------------------------
alter table comercial.oportunidades
  add column if not exists contacto_email text,
  add column if not exists contacto_telefono text,
  add column if not exists fecha_inicio_estimada date,
  add column if not exists fecha_fin_estimada date;

-- La empresa propia deja de elegirse en el formulario: todo lo que
-- entre de acá en adelante es PL Offshore. Las 16 filas que hoy son
-- de Terra Mare, Clean Sea y HF Offshore conservan su valor.
alter table comercial.oportunidades
  alter column empresa set default 'Parana Logistica';

-- ------------------------------------------------------------
-- 2) Numero de oportunidad automatico
--
-- Solo se genera cuando viene vacio, asi los numeros que ya estan
-- cargados a mano (TM-2, TM-3, TM-8...) quedan intactos.
-- ------------------------------------------------------------
create sequence if not exists comercial.oportunidad_nro_seq;

create or replace function comercial.set_nro_oportunidad()
returns trigger language plpgsql as $fn$
begin
  if new.nro_oportunidad is null or trim(new.nro_oportunidad) = '' then
    new.nro_oportunidad :=
      'PLO-' || lpad(nextval('comercial.oportunidad_nro_seq')::text, 4, '0');
  end if;
  return new;
end;
$fn$;

drop trigger if exists oportunidades_set_nro on comercial.oportunidades;
create trigger oportunidades_set_nro
  before insert on comercial.oportunidades
  for each row execute function comercial.set_nro_oportunidad();

-- Que no entren dos con el mismo numero. Si el indice no se puede
-- crear es porque ya hay repetidos: el script avisa y sigue, en
-- lugar de cortarse por la mitad.
do $bloque$
begin
  create unique index if not exists ux_com_opp_nro
    on comercial.oportunidades (lower(nro_oportunidad))
    where nro_oportunidad is not null;
exception when others then
  raise warning 'No se pudo crear ux_com_opp_nro (%). Revisar nro_oportunidad repetidos.', sqlerrm;
end $bloque$;

-- ------------------------------------------------------------
-- 3) Documentacion adjunta
--
-- El archivo vive en Storage; la fila guarda a que oportunidad
-- pertenece, quien lo subio y donde esta.
-- ------------------------------------------------------------
create table if not exists comercial.oportunidad_adjuntos (
  id              uuid primary key default gen_random_uuid(),
  oportunidad_id  uuid not null
    references comercial.oportunidades(id) on delete cascade,
  nombre          text not null,
  path            text not null unique,
  tipo            text,
  tamano_bytes    bigint,
  subido_por      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists ix_com_adjuntos_opp
  on comercial.oportunidad_adjuntos (oportunidad_id, created_at desc);

alter table comercial.oportunidad_adjuntos enable row level security;

drop policy if exists "authenticated_all_adjuntos" on comercial.oportunidad_adjuntos;
create policy "authenticated_all_adjuntos" on comercial.oportunidad_adjuntos
  for all to authenticated using (true) with check (true);

-- Bucket privado. Los archivos se sirven con URL firmada, no por
-- link publico: son propuestas comerciales.
insert into storage.buckets (id, name, public)
values ('comercial', 'comercial', false)
on conflict (id) do nothing;

drop policy if exists "comercial_objects_all" on storage.objects;
create policy "comercial_objects_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'comercial')
  with check (bucket_id = 'comercial');

-- ------------------------------------------------------------
-- 4) Base de datos de clientes
--
-- Es una VISTA, no una tabla: sale de las oportunidades cargadas,
-- asi que no puede quedar desactualizada ni pedir doble carga. La
-- contra es que no se puede editar un cliente por separado ni
-- guardar uno que todavia no tiene oportunidad. El dia que haga
-- falta eso, se convierte en tabla y esta vista pasa a ser la
-- carga inicial.
--
-- Una fila por contacto, no por empresa: una misma compania puede
-- tener varias personas. La pantalla los agrupa.
-- ------------------------------------------------------------
create or replace view comercial.clientes as
select
  o.compania,
  o.contacto,
  o.contacto_email,
  o.contacto_telefono,
  count(*)                                          as oportunidades,
  count(*) filter (where o.estadio = 'Ganado')      as ganadas,
  count(*) filter (where o.estadio = 'Perdido')     as perdidas,
  count(*) filter (where o.estadio not in ('Ganado','Perdido','Cancelado'))
                                                    as abiertas,
  sum(o.valor)                                      as valor_total,
  max(o.last_interacted_on)                         as ultimo_contacto,
  max(o.fecha_creacion)                             as ultima_oportunidad
from comercial.oportunidades o
group by o.compania, o.contacto, o.contacto_email, o.contacto_telefono;

-- ------------------------------------------------------------
-- 5) Ver como quedo
-- ------------------------------------------------------------
select 'columnas nuevas' as que, count(*)::text as cuantas
from information_schema.columns
where table_schema = 'comercial' and table_name = 'oportunidades'
  and column_name in ('contacto_email','contacto_telefono',
                      'fecha_inicio_estimada','fecha_fin_estimada')
union all
select 'clientes en la vista', count(*)::text from comercial.clientes;
