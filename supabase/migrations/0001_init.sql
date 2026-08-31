-- Esquema dedicado para no interferir con otras tablas del proyecto (ej. "proveedores")
create schema if not exists comercial;

create table comercial.oportunidades (
  id uuid primary key default gen_random_uuid(),
  compania text not null,
  nombre_proyecto text not null,
  alcance_oportunidad text,
  descripcion_alcance text,
  nro_oportunidad text,
  contacto text,
  estadio text not null default 'Investigando'
    check (estadio in (
      'Investigando', 'Lead', 'Contacto', 'Pedido de Cotizacion',
      'Qualified', 'Propuesta Enviada', 'Ganado', 'Perdido', 'Cancelado'
    )),
  valor numeric not null default 0,
  costo numeric not null default 0,
  fecha_creacion date not null default current_date,
  fecha_esperada_cierre date,
  empresa text not null
    check (empresa in ('Terra Mare', 'Clean Sea', 'Parana Logistica', 'HF Offshore')),
  last_interacted_on date,
  proximos_pasos text,
  notas text,
  referencias text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comercial.eventos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  evento text not null,
  lugar text,
  referencias text,
  participa_terra_mare boolean not null default false,
  participa_clean_sea boolean not null default false,
  participa_parana_logistica boolean not null default false,
  created_at timestamptz not null default now()
);

create table comercial.minutas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references comercial.eventos(id) on delete set null,
  titulo text not null,
  lugar text,
  fecha date not null,
  participantes text,
  oportunidades_relacionadas text,
  contenido text,
  acciones text,
  created_at timestamptz not null default now()
);

-- Vista para el dashboard: margen y ganancia calculados, igual que en el tracker original
create view comercial.oportunidades_resumen as
select
  o.*,
  case when o.valor = 0 then null else (o.valor - o.costo) / o.valor end as margen,
  (o.valor - o.costo) as ganancia
from comercial.oportunidades o;

alter table comercial.oportunidades enable row level security;
alter table comercial.eventos enable row level security;
alter table comercial.minutas enable row level security;

create policy "authenticated_all_oportunidades" on comercial.oportunidades
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_eventos" on comercial.eventos
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_minutas" on comercial.minutas
  for all to authenticated using (true) with check (true);

create or replace function comercial.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger oportunidades_set_updated_at
  before update on comercial.oportunidades
  for each row execute function comercial.set_updated_at();
