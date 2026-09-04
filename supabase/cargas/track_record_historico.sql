-- Track record historico de "Company - Track Record_v1.xlsx".
--
-- Tres hojas: CHARTERING, CHARTER-IN y MANAGEMENT. La cuarta —Company
-- Track Record, los campamentos y viveres en plataformas de Mexico— quedo
-- afuera por decision de Silvestre: es trabajo de otras empresas de Integra.
--
-- Generado por un parser, no tipeado. El valor se guarda dos veces: el numero
-- para poder sumar y el texto tal como lo dice el documento ("~0.5 million",
-- "On going"), porque ese redondeo es a proposito.
--
-- Idempotente: cada fila se identifica por seccion + buque + cliente + alcance
-- + anio, asi que correrlo dos veces no duplica.

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Louis Dreyfus TravOcean', 'Argentina', '~35 days', 'Pre lay grapnel run (Cable Laying)', 2020, 2020, 500000, '~0.5 million', 'xlsx CHARTERING fila 4'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 4');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Jan de Nul', 'Argentina/Uruguay', '~5 days', 'Pontoons transport on deck', 2021, 2021, 40000, '~0.04 million', 'xlsx CHARTERING fila 5'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 5');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Jan de Nul', 'Argentina/Uruguay', '~4 days', 'Towing of cutter dredger', 2021, 2021, 60000, '~0,06 million', 'xlsx CHARTERING fila 6'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 6');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Dynamic Marine SA', 'Argentina', '~5 days', 'Towing of scrap vessel', 2021, 2021, 100000, '~0.1 million', 'xlsx CHARTERING fila 7'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 7');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'GIE Group', 'Argentina', '~30 days', 'UW Gas Pipe survey', 2021, 2021, 300000, '~0.3 million', 'xlsx CHARTERING fila 8'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 8');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2021, 2021, 200000, '~0.2 million', 'xlsx CHARTERING fila 9'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 9');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2022, 2022, 400000, '~0.4 million', 'xlsx CHARTERING fila 10'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 10');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Servimagnus', 'Argentina', '~5 days', 'Towing of sheerleg crane', 2022, 2022, 100000, '~0.1 million', 'xlsx CHARTERING fila 11'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 11');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Servimagnus', 'Argentina', '~5 days', 'Towing of sheerleg crane', 2022, 2022, 100000, '~0.1 million', 'xlsx CHARTERING fila 12'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 12');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Servimagnus', 'Argentina', '~5 days', 'Towing of sheerleg crane', 2022, 2022, 200000, '~0.2 million', 'xlsx CHARTERING fila 13'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 13');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Taiwan Lines / Gard H&M', 'Argentina', '~45 days', 'Accommodation/DSV during repairs', 2022, 2022, 600000, '~0.6 million', 'xlsx CHARTERING fila 14'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 14');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Servimagnus', 'Argentina', '~5 days', 'Towing of sheerleg crane', 2022, 2022, 200000, '~0.2 million', 'xlsx CHARTERING fila 15'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 15');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Servimagnus', 'Argentina', '~5 days', 'Towing of sheerleg crane', 2023, 2023, 200000, '~0.2 million', 'xlsx CHARTERING fila 16'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 16');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2023, 2023, 400000, '~0.4 million', 'xlsx CHARTERING fila 17'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 17');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Gaeaquatic LTD', 'Argentina', '~60 days', 'Pre lay grapnel run / PLSE (Cable Laying)', 2023, 2023, 900000, '~0.9 million', 'xlsx CHARTERING fila 18'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 18');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Servimagnus', 'Argentina', '~7 days', 'Towing of sheerleg crane', 2023, 2023, 200000, '~0.2 million', 'xlsx CHARTERING fila 19'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 19');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2024, 2024, 100000, '~0.1 million', 'xlsx CHARTERING fila 20'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 20');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'PXGEO', 'Argentina', '~60 days', 'Seismic Support Services', 2024, 2024, 900000, '~0.9 million', 'xlsx CHARTERING fila 21'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 21');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Clean Sea / Equinor', 'Argentina', '~45 days', 'Oil Spill Response Vessel', 2024, 2024, 800000, '~0.8 million', 'xlsx CHARTERING fila 22'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 22');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'TGS', 'Argentina', '~210 days', 'Seismic Support Services', 2024, 2025, 4500000, '~4.5 million', 'xlsx CHARTERING fila 23'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 23');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Atlantic Dama', 'AHTS', null, 'Jan de Nul', 'Uruguay-Brazil', '~45 days', 'Towing unmanned dredger', 2025, 2025, 800000, '~0.8 million', 'xlsx CHARTERING fila 24'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 24');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Aegean Bulk - T&T Salvage', 'Argentina', '~1 month', 'Salvage/Stand By', 2017, 2017, 300000, '~0.3 million', 'xlsx CHARTERING fila 25'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 25');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Technomar', 'Argentina', '~5 days', 'Salvage/Escort', 2017, 2017, 100000, '~0.1 million', 'xlsx CHARTERING fila 26'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 26');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'InterBarge-Imperial-HBSA', 'Argentina', 'Spot', 'Fleeting', 2017, 2020, 200000, '~0.2 million', 'xlsx CHARTERING fila 27'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 27');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Vale', 'Argentina', '~2 year', 'Iron Ore Barges Fleeting', 2017, 2018, 1600000, '~1.6 million', 'xlsx CHARTERING fila 28'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 28');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Independencia Shipping', 'Argentina', '~5 days', 'Salvage/Towing', 2018, 2018, 50000, '~0.05 million', 'xlsx CHARTERING fila 29'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 29');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Transporte Fluvial Paraguayo', 'Argentina/Paraguay', '~30 days', 'Salvage/Towing', 2019, 2019, 300000, '~0.3 million', 'xlsx CHARTERING fila 30'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 30');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'T&T Salvage', 'Argentina', '~7 days', 'Salvage/Stand By', 2020, 2020, 60000, '~0.06 million', 'xlsx CHARTERING fila 31'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 31');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'T&T Salvage', 'Argentina', '~6 days', 'Salvage/Lightering', 2020, 2020, 100000, '~0.1 million', 'xlsx CHARTERING fila 32'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 32');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Naviship', 'Argentina', '~7 days', 'Salvage', 2020, 2020, 100000, '~0.1 million', 'xlsx CHARTERING fila 33'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 33');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Impregilo', 'Argentina', '~3 months', 'Sewer Risers Installation', 2021, 2021, 700000, '~0.7 million', 'xlsx CHARTERING fila 34'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 34');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Independencia Shipping', 'Argentina', '~2 days', 'Salvage/Refloating', 2021, 2021, 100000, '~0.1 million', 'xlsx CHARTERING fila 35'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 35');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Vale', 'Argentina', '~14 months', 'Iron Ore Barges Fleeting', 2021, 2022, 1300000, '~1.3 million', 'xlsx CHARTERING fila 36'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 36');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Servimagnus', 'Argentina', '~12 days', 'Towing', 2022, 2022, 100000, '~0.1 million', 'xlsx CHARTERING fila 37'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 37');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Vale', 'Argentina', '~6 months', 'Iron Ore Barges Fleeting', 2023, 2023, 300000, '~0.3 million', 'xlsx CHARTERING fila 38'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 38');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Boluda Lines', 'Argentina', '~5 days', 'Salvage/Refloating', 2023, 2023, 100000, '~0.1 million', 'xlsx CHARTERING fila 39'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 39');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Cruz del Sur', 'UV - Pusher', null, 'Excelerate Energy', 'Argentina', '~10 days', 'High Pressure Vaporizers swap FSRU', 2023, 2023, 300000, '~0.3 million', 'xlsx CHARTERING fila 40'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 40');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Agencia Maritima Dulce', 'Argentina', '~3 days', 'Salvage/Escort', 2017, 2017, 70000, '~0.07 million', 'xlsx CHARTERING fila 41'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 41');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'T&T Salvage', 'Argentina', '~4 days', 'Salvage/Refloating', 2017, 2017, 300000, '~0,3 million', 'xlsx CHARTERING fila 42'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 42');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2017, 2017, 1100000, '~1.1 million', 'xlsx CHARTERING fila 43'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 43');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'CCC - Servimagnus', 'Argentina', '~7 days', 'Towing Fishing Vessel', 2017, 2017, 100000, '~0.1 million', 'xlsx CHARTERING fila 44'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 44');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Maritech', 'Uruguay', '~10 days', 'Pre lay grapnel run (Cable Laying)', 2017, 2017, 200000, '~0.2 million', 'xlsx CHARTERING fila 45'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 45');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2018, 2018, 1500000, '~1.5 million', 'xlsx CHARTERING fila 46'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 46');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'T&T Salvage', 'Argentina', '~3 days', 'Salvage/Refloating', 2018, 2018, 200000, '~0.2 million', 'xlsx CHARTERING fila 47'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 47');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Independent Ship Agents', 'Argentina', '~1 days', 'Salvage/Escort', 2019, 2019, 50000, '~0.05 million', 'xlsx CHARTERING fila 48'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 48');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2019, 2019, 1500000, '~1.5 million', 'xlsx CHARTERING fila 49'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 49');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Various clientes', 'Argentina', 'On demand', 'Fresh Water Delivery', 2019, 2019, 100000, '~0.1 million', 'xlsx CHARTERING fila 50'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 50');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2020, 2020, 1400000, '~1.4 million', 'xlsx CHARTERING fila 51'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 51');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2021, 2021, 800000, '~0.8 million', 'xlsx CHARTERING fila 52'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 52');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Transporte Fluvial Paraguayo', 'Argentina', '~15 days', 'Towing of Container Vessel', 2021, 2021, 200000, '~0.2 million', 'xlsx CHARTERING fila 53'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 53');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Jan de Nul', 'Argentina', '~2 days', 'Towing of cutter dredger', 2021, 2021, 30000, '~0,03 million', 'xlsx CHARTERING fila 54'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 54');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2022, 2022, 2000000, '~2 million', 'xlsx CHARTERING fila 55'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 55');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'CMA CGM', 'Argentina/Paraguay', '~30 days', 'Towing of Container Vessel', 2022, 2022, 300000, '~0.3 million', 'xlsx CHARTERING fila 56'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 56');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'T&T Salvage', 'Argentina', '~3 days', 'Salvage/Refloating', 2023, 2023, 50000, '~0.05 million', 'xlsx CHARTERING fila 57'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 57');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2023, 2023, 1300000, '~1.3 million', 'xlsx CHARTERING fila 58'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 58');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Boluda Lines', 'Argentina', '~5 days', 'Salvage/Refloating', 2023, 2023, 100000, '~0.1 million', 'xlsx CHARTERING fila 59'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 59');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Carras Hellas', 'Argentina', '~35 days', 'Salvage/Stand By', 2023, 2023, 800000, '~0.8 million', 'xlsx CHARTERING fila 60'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 60');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2024, 2024, 2000000, '~2 million', 'xlsx CHARTERING fila 61'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 61');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2025, 2025, 1400000, '~1.4 million', 'xlsx CHARTERING fila 62'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 62');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'Golondrina de Mar', 'AHT', null, 'Service Management', 'Argentina', 'Spot', 'Lightering Support Vessel', 2026, 2026, null, null, 'xlsx CHARTERING fila 63'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 63');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Gaeaquatic LTD', 'Argentina', '~60 days', 'Pre lay shore end (Cable Laying)', 2024, 2024, 300000, '~0.3 million', 'xlsx CHARTERING fila 64'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 64');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Agencia Maritima NABSA', 'Uruguay', '~1 days', 'Fresh Water Delivery to Vessel', 2024, 2024, null, null, 'xlsx CHARTERING fila 65'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 65');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'LHG Mining (TBN)', 'Uruguay', '~6 days', 'Anchor Handling to Transfer Station "Potiguar"', 2024, 2024, null, null, 'xlsx CHARTERING fila 66'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 66');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~1 days', 'Crew Change', 2024, 2024, null, null, 'xlsx CHARTERING fila 67'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 67');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~1 days', 'Supplies Delivery to Vessel', 2024, 2024, null, null, 'xlsx CHARTERING fila 68'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 68');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~1 days', 'Supplies Delivery to Vessel', 2024, 2024, null, null, 'xlsx CHARTERING fila 69'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 69');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~1 days', 'Supplies Delivery to Vessel', 2024, 2024, null, null, 'xlsx CHARTERING fila 70'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 70');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~1 days', 'Crew Change', 2024, 2024, null, null, 'xlsx CHARTERING fila 71'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 71');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Ondamares', 'Uruguay', '~3 days', 'Dive Support to F/V Marianne', 2024, 2024, null, null, 'xlsx CHARTERING fila 72'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 72');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Dangerol / Ancap', 'Uruguay', '~2 days', 'Oil Spill Response Vessel', 2024, 2024, null, null, 'xlsx CHARTERING fila 73'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 73');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Service Management', 'Uruguay', '~2 days', 'Lightering Support Vessel', 2024, 2024, null, null, 'xlsx CHARTERING fila 74'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 74');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Global Ship Management', 'Uruguay', '~1 days', 'Crew Change', 2024, 2024, null, null, 'xlsx CHARTERING fila 75'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 75');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'LHG Mining (TBN)', 'Uruguay', '~30 days', null, 2024, 2024, null, null, 'xlsx CHARTERING fila 76'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 76');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~1 days', 'Supplies Delivery to Vessel', 2025, 2025, null, null, 'xlsx CHARTERING fila 77'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 77');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Dangerol / Ancap', 'Uruguay', '~2 days', 'Oil Spill Response Vessel', 2025, 2025, null, null, 'xlsx CHARTERING fila 78'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 78');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Rabit SA', 'Uruguay', '~1 days', 'Assistance to Mv Indianapolis', 2025, 2025, null, null, 'xlsx CHARTERING fila 79'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 79');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Dangerol / Ancap', 'Uruguay', '~3 days', 'Oil Spill Response Vessel', 2025, 2025, null, null, 'xlsx CHARTERING fila 80'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 80');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Buquebus', 'Uruguay', '~2 days', 'Dive Support / Salvage sunken pontoon', 2025, 2025, null, null, 'xlsx CHARTERING fila 81'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 81');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Argelan', 'Uruguay', '~2 days', 'Crew Change', 2025, 2025, null, null, 'xlsx CHARTERING fila 82'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 82');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Agencia Maritima NABSA', 'Uruguay', '~1 days', 'Supplies Delivery to Vessel', 2025, 2025, null, null, 'xlsx CHARTERING fila 83'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 83');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Fender Care', 'Uruguay', 'Spot', 'Lightering Support Vessel', 2025, 2025, null, null, 'xlsx CHARTERING fila 84'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 84');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Subsea Environmental', 'Argentina', '~15 days', 'Subsea Fiber Optic Recovery', 2025, 2025, 300000, '~0.3 million', 'xlsx CHARTERING fila 85'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 85');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'ANCAP', 'Uruguay', '~30 days', 'Diving Support/Flotel', 2025, 2025, 600000, '~0.6 million', 'xlsx CHARTERING fila 86'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 86');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'chartering', 'WP Halle', 'OSV', null, 'Viridien', 'Uruguay', '~ 60 days', 'Seismic Support Services', 2026, 2026, null, null, 'xlsx CHARTERING fila 87'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTERING fila 87');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'charter_in', 'Pilots One', 'Pusher', 'SIPSA', 'ADM', 'Argentina', '~14 months', 'Fleeting Barges', 2022, 2023, 1400000, '~1.4 million', 'xlsx CHARTER-IN fila 4'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTER-IN fila 4');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'charter_in', 'Pilots One', 'Pusher', 'SIPSA', 'RN Salvamento', 'Argentina', '~20 days', 'Salvage/Lightering', 2023, 2023, 100000, '~0.1 million', 'xlsx CHARTER-IN fila 5'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTER-IN fila 5');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'charter_in', 'Emma B', 'Tug', 'La Plata Remolques', 'Fairmyl Shipping', 'Argentina', '~15 days', 'Escort/Stand by', 2024, 2024, 500000, '~0.5 million', 'xlsx CHARTER-IN fila 6'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTER-IN fila 6');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'charter_in', 'Argentino I', 'Tug', 'SIPSA', 'Stolt Tankers', 'Argentina', '~3 days', 'Stand by', 2024, 2024, 90000, '~0.09 million', 'xlsx CHARTER-IN fila 7'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx CHARTER-IN fila 7');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Hai Yang Shi You 721', 'Seismic', 'COSL', 'TGS', 'Argentina', '~6 months', 'Crew Management', 2024, 2025, null, null, 'xlsx MANAGEMENT fila 4'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 4');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Victory G', 'Supply', 'Rederij Groen', 'TGS', 'Argentina', '~6 months', 'Crew Management', 2024, 2025, null, null, 'xlsx MANAGEMENT fila 5'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 5');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Sunrise G', 'Supply', 'Rederij Groen', 'PXGEO', 'Argentina', null, null, null, null, null, null, 'xlsx MANAGEMENT fila 6'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 6');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Sunrise G', 'Supply', 'Rederij Groen', 'TGS', 'Argentina', '~30 days', 'Crew Management', 2024, 2025, null, null, 'xlsx MANAGEMENT fila 7'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 7');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Expedient', 'LNG', 'Excelerate Energy', 'Excelerate Energy', 'Argentina', '~12 months', 'Procurement', 2023, 2023, 300000, '~0.3 million', 'xlsx MANAGEMENT fila 8'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 8');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Expedient', 'LNG', 'Excelerate Energy', 'Excelerate Energy', 'Argentina', '~12 months', 'Procurement', 2024, 2024, 800000, '~0.8 million', 'xlsx MANAGEMENT fila 9'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 9');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', 'Expedient', 'LNG', 'Excelerate Energy', 'Excelerate Energy', 'Argentina', '~12 months', 'Procurement', 2025, 2025, null, 'On going', 'xlsx MANAGEMENT fila 10'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 10');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', null, null, null, 'Gaeaquatic LTD', 'Argentina', '~12 days', 'Procurement/Equipment', 2023, 2023, 300000, '~0.3 million', 'xlsx MANAGEMENT fila 11'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 11');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', null, null, null, 'Louis Dreyfus TravOcean', 'Argentina', '~35 days', 'Procurement/Equipment', 2020, 2020, null, null, 'xlsx MANAGEMENT fila 12'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 12');

insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select 'management', null, null, null, 'Subsea Env. Services', 'Argentina', null, 'VISAS/Procurement', 2025, 2025, null, null, 'xlsx MANAGEMENT fila 13'
where not exists (select 1 from comercial.track_record t where t.notas = 'xlsx MANAGEMENT fila 13');

select seccion, count(*) as filas,
       min(anio_desde) as desde, max(coalesce(anio_hasta, anio_desde)) as hasta,
       sum(valor_usd) as valor_declarado
from comercial.track_record
group by seccion order by seccion;
