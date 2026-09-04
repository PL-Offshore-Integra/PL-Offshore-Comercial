-- Carga de los viajes 2026 de "REMOLCADORES - RESUMEN 2026.xlsx".
--
-- Generado, no tipeado: el parser leyo la planilla y sus tres totales de
-- control coinciden al centavo (688.374,24 pendiente de facturar del
-- Golondrina, 247.140 de la Dama, 2.300.070,25 facturado total).
--
-- El viaje 17 del Golondrina NO se carga: ya esta como OP-1-2026, con las
-- horas reales del STS en vez del rango de facturacion de la planilla.
--
-- Cada salida entra como Voyage Charter con un lump sum igual al importe de
-- la planilla. Es a proposito: de un viaje historico se sabe el total cerrado,
-- no de que tarifas salio, y asi guardar la salida en pantalla vuelve a dar
-- exactamente ese numero en vez de recalcular contra tarifas que no tenemos.
--
-- Todo va con "not exists": correr esto dos veces no duplica nada.

insert into comercial.cliente_empresas (nombre) select 'UABL SA'
where not exists (select 1 from comercial.cliente_empresas where lower(trim(nombre)) = lower(trim('UABL SA')));

insert into comercial.cliente_empresas (nombre) select 'Fugro Chile SA'
where not exists (select 1 from comercial.cliente_empresas where lower(trim(nombre)) = lower(trim('Fugro Chile SA')));

insert into comercial.cliente_empresas (nombre) select 'HOC Contratistas SA'
where not exists (select 1 from comercial.cliente_empresas where lower(trim(nombre)) = lower(trim('HOC Contratistas SA')));

insert into comercial.zonas (nombre, tipo, notas) values
  ('Golfo San Matias', 'area_offshore',
   'La nombra la planilla de remolcadores (survey YPF/ENI). Falta la posicion.')
on conflict do nothing;

insert into comercial.proyectos
  (nombre, compania, cliente_empresa_id, cliente_final, buque, descripcion, zona_id,
   fecha_inicio_estimada, fecha_fin_estimada, moneda, iva, estructura_tarifaria, valor, estado, notas)
select 'UABL / Traslado POSEIDON', 'UABL SA', e.id, null, 'Golondrina de Mar', 'Traslado del POSEIDON de Rosario a Montevideo con estructuras.',
       (select id from comercial.zonas where nombre = 'Rosario'),
       '2026-05-30 00:00:00-03:00', '2026-06-10 00:00:00-03:00', 'USD', '21', 'voyage_charter', 302000, 'finalizado',
       'Cargado de la planilla de remolcadores 2026.'
from comercial.cliente_empresas e
where lower(trim(e.nombre)) = lower(trim('UABL SA'))
  and not exists (select 1 from comercial.proyectos where nombre = 'UABL / Traslado POSEIDON');

insert into comercial.proyecto_tarifas (proyecto_id, concepto, unidad, monto, orden)
select p.id, 'lump_sum', 'global', 302000, 0 from comercial.proyectos p
where p.nombre = 'UABL / Traslado POSEIDON'
  and not exists (select 1 from comercial.proyecto_tarifas t where t.proyecto_id = p.id);

insert into comercial.proyectos
  (nombre, compania, cliente_empresa_id, cliente_final, buque, descripcion, zona_id,
   fecha_inicio_estimada, fecha_fin_estimada, moneda, iva, estructura_tarifaria, valor, estado, notas)
select 'Fugro / Survey Golfo San Matias', 'Fugro Chile SA', e.id, 'YPF / ENI', 'Atlantic Dama', 'Geophysical survey para YPF/ENI en el Golfo San Matias, con el Atlantic Dama.',
       (select id from comercial.zonas where nombre = 'Golfo San Matias'),
       '2026-06-12 00:00:00-03:00', '2026-07-29 00:00:00-03:00', 'USD', '21', 'voyage_charter', 1264300.25, 'finalizado',
       'Cargado de la planilla de remolcadores 2026.'
from comercial.cliente_empresas e
where lower(trim(e.nombre)) = lower(trim('Fugro Chile SA'))
  and not exists (select 1 from comercial.proyectos where nombre = 'Fugro / Survey Golfo San Matias');

insert into comercial.proyecto_tarifas (proyecto_id, concepto, unidad, monto, orden)
select p.id, 'lump_sum', 'global', 1264300.25, 0 from comercial.proyectos p
where p.nombre = 'Fugro / Survey Golfo San Matias'
  and not exists (select 1 from comercial.proyecto_tarifas t where t.proyecto_id = p.id);

insert into comercial.proyectos
  (nombre, compania, cliente_empresa_id, cliente_final, buque, descripcion, zona_id,
   fecha_inicio_estimada, fecha_fin_estimada, moneda, iva, estructura_tarifaria, valor, estado, notas)
select 'HOC / Flotel VMOS', 'HOC Contratistas SA', e.id, 'VMOS', 'Atlantic Dama', 'Offshore support con el Atlantic Dama como flotel para el proyecto VMOS.',
       null,
       '2026-07-30 00:00:00-03:00', null, 'USD', '21', 'voyage_charter', 1035770, 'en_curso',
       'Cargado de la planilla de remolcadores 2026.'
from comercial.cliente_empresas e
where lower(trim(e.nombre)) = lower(trim('HOC Contratistas SA'))
  and not exists (select 1 from comercial.proyectos where nombre = 'HOC / Flotel VMOS');

insert into comercial.proyecto_tarifas (proyecto_id, concepto, unidad, monto, orden)
select p.id, 'lump_sum', 'global', 1035770, 0 from comercial.proyectos p
where p.nombre = 'HOC / Flotel VMOS'
  and not exists (select 1 from comercial.proyecto_tarifas t where t.proyecto_id = p.id);

-- 2025-12-30 · STS Zona Alfa (Basset) - ALI Gas Oil Julio A (viaje 1)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Basset) - ALI Gas Oil Julio A (viaje 1)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Basset', 'Julio A', '2025-12-30 00:00:00-03:00', '2026-01-03 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 61483.55, 0, 'finalizada', 'De la planilla 2026, viaje 1. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Basset) - ALI Gas Oil Julio A (viaje 1)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 61483.55, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Basset) - ALI Gas Oil Julio A (viaje 1)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-01-03', '2026-04-03',
       61483.55, 0, 'USD',
       'ARS',
       '2026-06-02', 1442, 1450, 'De la planilla 2026.'
from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Basset) - ALI Gas Oil Julio A (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 61483.55
      and f.fecha_emision = '2026-01-03'
  );

-- 2026-01-11 · STS Zona Alfa (Weco Madelein) - ALI Gas Oil Julio A (viaje 2)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Weco Madelein) - ALI Gas Oil Julio A (viaje 2)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Weco Madelein', 'Julio A', '2026-01-11 00:00:00-03:00', '2026-01-15 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 57214.24, 0, 'finalizada', 'De la planilla 2026, viaje 2. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Weco Madelein) - ALI Gas Oil Julio A (viaje 2)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 57214.24, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Weco Madelein) - ALI Gas Oil Julio A (viaje 2)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-01-15', '2026-04-15',
       57214.24, 0, 'USD',
       'ARS',
       '2026-06-18', 1396, 1470, 'De la planilla 2026.'
from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Weco Madelein) - ALI Gas Oil Julio A (viaje 2)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 57214.24
      and f.fecha_emision = '2026-01-15'
  );

-- 2026-01-25 · STS Zona Alfa (Orfeas) - TOP Fuel Oil Palena Star (viaje 3)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Orfeas) - TOP Fuel Oil Palena Star (viaje 3)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Orfeas', 'Palena Star', '2026-01-25 00:00:00-03:00', '2026-01-29 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 61590.28, 0, 'finalizada', 'De la planilla 2026, viaje 3. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Orfeas) - TOP Fuel Oil Palena Star (viaje 3)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 61590.28, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Orfeas) - TOP Fuel Oil Palena Star (viaje 3)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-01-29', '2026-04-29',
       61590.28, 0, 'USD',
       'ARS',
       '2026-07-03', 1396, 1510, 'De la planilla 2026.'
from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Orfeas) - TOP Fuel Oil Palena Star (viaje 3)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 61590.28
      and f.fecha_emision = '2026-01-29'
  );

-- 2026-02-23 · STS Zona Alfa (Hafnia Tanzanite) - ALI Gas Oil Julio A (viaje 4)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Hafnia Tanzanite) - ALI Gas Oil Julio A (viaje 4)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Hafnia Tanzanite', 'Julio A', '2026-02-23 00:00:00-03:00', '2026-02-27 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 62123.94, 0, 'finalizada', 'De la planilla 2026, viaje 4. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Hafnia Tanzanite) - ALI Gas Oil Julio A (viaje 4)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 62123.94, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Hafnia Tanzanite) - ALI Gas Oil Julio A (viaje 4)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-02-27', '2026-05-28',
       62123.94, 0, 'USD',
       'ARS',
       '2026-07-20', 1391.5, 1450, 'De la planilla 2026.'
from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Hafnia Tanzanite) - ALI Gas Oil Julio A (viaje 4)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 62123.94
      and f.fecha_emision = '2026-02-27'
  );

-- 2026-03-09 · STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 5)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 5)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Selecao', 'Palena Star', '2026-03-09 00:00:00-03:00', '2026-03-13 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 56146.91, 0, 'finalizada', 'De la planilla 2026, viaje 5. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 5)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 56146.91, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 5)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-03-13', '2026-06-11',
       56146.91, 0, 'USD',
       null,
       null, 1387.5, null, 'De la planilla 2026.'
from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 5)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 56146.91
      and f.fecha_emision = '2026-03-13'
  );

-- 2026-03-14 · STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 6)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 6)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Selecao', 'Palena Star', '2026-03-14 00:00:00-03:00', '2026-03-17 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 57481.07, 0, 'finalizada', 'De la planilla 2026, viaje 6. La planilla cuenta 4 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 6)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 57481.07, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Selecao) - TOP Fuel Oil Palena Star (viaje 6)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-03-25 · STS Zona Alfa (Seaways Samar) - TOP Fuel Oil Palena Star (viaje 7)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Seaways Samar) - TOP Fuel Oil Palena Star (viaje 7)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Seaways Samar', 'Palena Star', '2026-03-25 00:00:00-03:00', '2026-03-30 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 70982.75, 0, 'finalizada', 'De la planilla 2026, viaje 7. La planilla cuenta 6 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Seaways Samar) - TOP Fuel Oil Palena Star (viaje 7)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 70982.75, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Seaways Samar) - TOP Fuel Oil Palena Star (viaje 7)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-04-03 · STS Zona Alfa (Solar Susie) - ALI Gas Oil Julio A (viaje 8)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Solar Susie) - ALI Gas Oil Julio A (viaje 8)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Solar Susie', 'Julio A', '2026-04-03 00:00:00-03:00', '2026-04-07 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 55773.35, 0, 'finalizada', 'De la planilla 2026, viaje 8. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Solar Susie) - ALI Gas Oil Julio A (viaje 8)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 55773.35, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Solar Susie) - ALI Gas Oil Julio A (viaje 8)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-05-11 · STS Zona Alfa (Ariane) - TOP Fuel Oil Palena Star (viaje 9)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Ariane) - TOP Fuel Oil Palena Star (viaje 9)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Ariane', 'Palena Star', '2026-05-11 00:00:00-03:00', '2026-05-15 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 75038.59, 0, 'finalizada', 'De la planilla 2026, viaje 9. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Ariane) - TOP Fuel Oil Palena Star (viaje 9)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 75038.59, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Ariane) - TOP Fuel Oil Palena Star (viaje 9)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-05-16 · STS Zona Alfa (Ariane) - TOP Fuel Oil Makenita H (viaje 10)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Ariane) - TOP Fuel Oil Makenita H (viaje 10)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Ariane', 'Makenita H', '2026-05-16 00:00:00-03:00', '2026-05-18 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 30651.9, 0, 'finalizada', 'De la planilla 2026, viaje 10. La planilla cuenta 3 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Ariane) - TOP Fuel Oil Makenita H (viaje 10)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 30651.9, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Ariane) - TOP Fuel Oil Makenita H (viaje 10)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-05-30 · Traslado POSEIDON Ros-Mvd con estructuras (viaje 11)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'Traslado POSEIDON Ros-Mvd con estructuras (viaje 11)', 'Golondrina de Mar', null,
       null,
       null, null, '2026-05-30 00:00:00-03:00', '2026-06-10 00:00:00-03:00',
       'USD', '21', 'voyage_charter', 302000, 0, 'finalizada', 'De la planilla 2026, viaje 11. La planilla cuenta 12 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'UABL / Traslado POSEIDON'
  and not exists (select 1 from comercial.operaciones where nombre = 'Traslado POSEIDON Ros-Mvd con estructuras (viaje 11)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 302000, 0 from comercial.operaciones o
where o.nombre = 'Traslado POSEIDON Ros-Mvd con estructuras (viaje 11)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-06-10', null,
       302000, 93000, 'USD',
       'ARS',
       '2026-06-03', 1427, null, 'De la planilla 2026.'
from comercial.operaciones o
where o.nombre = 'Traslado POSEIDON Ros-Mvd con estructuras (viaje 11)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 302000
      and f.fecha_emision = '2026-06-10'
  );

-- 2026-06-12 · Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)', 'Atlantic Dama', 'YPF / ENI',
       (select id from comercial.zonas where nombre = 'Golfo San Matias'),
       null, null, '2026-06-12 00:00:00-03:00', '2026-07-29 00:00:00-03:00',
       'USD', '21', 'voyage_charter', 1264300.25, 0, 'finalizada', 'De la planilla 2026, viaje 1. Se factura por mes: 8 renglones por 1264300.25 USD en total.'
from comercial.proyectos p
where p.nombre = 'Fugro / Survey Golfo San Matias'
  and not exists (select 1 from comercial.operaciones where nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 1264300.25, 0 from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-06-30', null,
       342000, 0, 'USD',
       'USD',
       '2026-06-30', null, null, 'Geophysical Survey - YPF/ENI Golfo San Matias · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 342000
      and f.fecha_emision = '2026-06-30'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-06-30', null,
       50157.19, 0, 'USD',
       'USD',
       '2026-06-30', null, null, 'Fabricacion / Movilizacion · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 50157.19
      and f.fecha_emision = '2026-06-30'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-06-30', null,
       229340, 0, 'USD',
       'USD',
       '2026-06-30', null, null, 'Geophysical Survey - YPF/ENI Golfo San Matias · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 229340
      and f.fecha_emision = '2026-06-30'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-06-30', null,
       7926.73, 0, 'USD',
       'USD',
       '2026-06-30', null, null, 'Reembolsos (Avetta, IMCA, Autopilot, Masarich, Rental) · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 7926.73
      and f.fecha_emision = '2026-06-30'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-06-30', null,
       55381, 0, 'USD',
       'USD',
       '2026-06-30', null, null, 'Reembolsos (Meina SA, Trabajos en Montevideo) · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 55381
      and f.fecha_emision = '2026-06-30'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-07-31', null,
       227630, 0, 'USD',
       'USD',
       '2026-07-31', null, null, 'Geophysical Survey - YPF/ENI Golfo San Matias · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 227630
      and f.fecha_emision = '2026-07-31'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-07-31', null,
       227000, 0, 'USD',
       'USD',
       '2026-07-31', null, null, 'Geophysical Survey - YPF/ENI Golfo San Matias · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 227000
      and f.fecha_emision = '2026-07-31'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-07-31', null,
       124865.33, 0, 'USD',
       'USD',
       '2026-07-31', null, null, 'Geophysical Survey - YPF/ENI Golfo San Matias · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Geophysical Survey - YPF/ENI Golfo San Matias (viaje 1)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 124865.33
      and f.fecha_emision = '2026-07-31'
  );

-- 2026-06-24 · STS Zona Alfa (M.T.MP Tanker 1) - ALI Gas oil Julio A (viaje 12)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (M.T.MP Tanker 1) - ALI Gas oil Julio A (viaje 12)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'M.T.MP Tanker 1', 'Julio A', '2026-06-24 00:00:00-03:00', '2026-06-30 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 73224.14, 0, 'finalizada', 'De la planilla 2026, viaje 12. La planilla cuenta 7 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (M.T.MP Tanker 1) - ALI Gas oil Julio A (viaje 12)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 73224.14, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (M.T.MP Tanker 1) - ALI Gas oil Julio A (viaje 12)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-07-07 · STS Zona Alfa (Cabo de Hornos) - TOP Fuel Oil Cabo Virgenes (viaje 13)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Cabo de Hornos) - TOP Fuel Oil Cabo Virgenes (viaje 13)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Cabo de Hornos', 'Cabo Virgenes', '2026-07-07 00:00:00-03:00', '2026-07-11 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 57641.17, 0, 'finalizada', 'De la planilla 2026, viaje 13. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Cabo de Hornos) - TOP Fuel Oil Cabo Virgenes (viaje 13)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 57641.17, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Cabo de Hornos) - TOP Fuel Oil Cabo Virgenes (viaje 13)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-07-16 · STS Zona Alfa (Obsidian) - ALI Gas Oil Julio A (viaje 14)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Obsidian) - ALI Gas Oil Julio A (viaje 14)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Obsidian', 'Julio A', '2026-07-16 00:00:00-03:00', '2026-07-20 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 58761.86, 0, 'finalizada', 'De la planilla 2026, viaje 14. La planilla cuenta 5 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Obsidian) - ALI Gas Oil Julio A (viaje 14)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 58761.86, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Obsidian) - ALI Gas Oil Julio A (viaje 14)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-07-30 · Offshore Support - Flotel - VMOS (viaje 2)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'Offshore Support - Flotel - VMOS (viaje 2)', 'Atlantic Dama', 'VMOS',
       null,
       null, null, '2026-07-30 00:00:00-03:00', null,
       'USD', '21', 'voyage_charter', 1035770, 0, 'en_curso', 'De la planilla 2026, viaje 2. Se factura por mes: 4 renglones por 1035770.00 USD en total.'
from comercial.proyectos p
where p.nombre = 'HOC / Flotel VMOS'
  and not exists (select 1 from comercial.operaciones where nombre = 'Offshore Support - Flotel - VMOS (viaje 2)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 1035770, 0 from comercial.operaciones o
where o.nombre = 'Offshore Support - Flotel - VMOS (viaje 2)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-08-31', null,
       452000, 0, 'USD',
       'USD',
       '2026-08-31', null, null, 'Offshore Support - Flotel - VMOS · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Offshore Support - Flotel - VMOS (viaje 2)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 452000
      and f.fecha_emision = '2026-08-31'
  );

insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', '2026-08-31', null,
       336630, 0, 'USD',
       'USD',
       '2026-08-31', null, null, 'Offshore Support - Flotel - VMOS · De la planilla 2026. · La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado.'
from comercial.operaciones o
where o.nombre = 'Offshore Support - Flotel - VMOS (viaje 2)'
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = 336630
      and f.fecha_emision = '2026-08-31'
  );

-- 2026-08-02 · STS Zona Alfa (Precious Adelaide) - ALI Gas Oil Julio A CANCEL (viaje 15)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Precious Adelaide) - ALI Gas Oil Julio A CANCEL (viaje 15)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Precious Adelaide', 'Julio A', '2026-08-02 00:00:00-03:00', '2026-08-04 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 37075.5, 0, 'finalizada', 'De la planilla 2026, viaje 15. La planilla cuenta 3 dias (conteo inclusivo). Viaje cancelado: se cobro mob/demob.'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Precious Adelaide) - ALI Gas Oil Julio A CANCEL (viaje 15)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 37075.5, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Precious Adelaide) - ALI Gas Oil Julio A CANCEL (viaje 15)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

-- 2026-08-06 · STS Zona Alfa (Precious Adelaide) - ALI Gas Oil (viaje 16)
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, 'STS Zona Alfa (Precious Adelaide) - ALI Gas Oil (viaje 16)', 'Golondrina de Mar', 'Raizen',
       (select id from comercial.zonas where nombre = 'Alfa'),
       'Precious Adelaide', null, '2026-08-06 00:00:00-03:00', '2026-08-13 00:00:00-03:00',
       'USD', 'exento', 'voyage_charter', 112608.48, 0, 'finalizada', 'De la planilla 2026, viaje 16. La planilla cuenta 8 dias (conteo inclusivo).'
from comercial.proyectos p
where p.nombre = 'Service Management / STS'
  and not exists (select 1 from comercial.operaciones where nombre = 'STS Zona Alfa (Precious Adelaide) - ALI Gas Oil (viaje 16)');

insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', 112608.48, 0 from comercial.operaciones o
where o.nombre = 'STS Zona Alfa (Precious Adelaide) - ALI Gas Oil (viaje 16)'
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);

select (select count(*) from comercial.proyectos)  as proyectos,
       (select count(*) from comercial.operaciones) as salidas,
       (select count(*) from comercial.facturas)    as facturas,
       (select sum(importe) from comercial.facturas) as facturado,
       (select sum(importe) from comercial.facturas where cobro_moneda is not null) as cobrado;
