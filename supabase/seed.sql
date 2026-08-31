-- Carga inicial con los datos del tracker "Tacker Ventas-Calendario Ferias -.xlsx"
-- Ejecutar despues de 0001_init.sql

insert into comercial.oportunidades
  (compania, nombre_proyecto, alcance_oportunidad, descripcion_alcance, nro_oportunidad,
   contacto, estadio, valor, costo, fecha_creacion, fecha_esperada_cierre, empresa,
   last_interacted_on, proximos_pasos, notas)
values
  ('Total', 'Ampliacion Fenix', 'Crewing', null, 'TM-8', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Terra Mare', null, null, null),
  ('CIATI', 'Analisis Arena de Fractura', 'Supply Chain', null, 'TM-3', 'pablor@ciati.com.ar', 'Pedido de Cotizacion', 0, 0, '2025-05-15', '2025-12-31', 'Terra Mare', null, 'Esperar Cotizacion', null),
  ('Subsea', 'Cable Removal Las Toninas', 'Project Management', null, 'TM-2', 'Simon@subsea.cc', 'Qualified', 0, 0, '2025-05-15', '2025-07-31', 'Terra Mare', null, 'Llamada el Martes 27 de Mayo', null),
  ('Pacific Basin', 'Cotizacion 1 Items', 'Supply Chain', null, 'TM-7', 'opsprocurement@pacificbasin.com', 'Pedido de Cotizacion', 0, 0, '2025-05-15', '2025-12-31', 'Terra Mare', null, 'Esperando Cotizacion', null),
  ('Execlerate', 'Gasero Escobar', 'Crewing', null, 'TM-6', 'sarah.sherman@excelerateenergy.com', 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Terra Mare', null, 'Investigar', null),
  ('Excelerate', 'Gasero Escobar', 'Servicios Operacion', 'Barco de Carga', 'CS-2', 'sarah.sherman@excelerateenergy.com', 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Clean Sea', null, null, 'Fede hablar con Bruno para ofrecer un palero para suministro de repuesto, viveres, basura, etc'),
  ('Southern Energy', 'LNG/Golar', 'Servicios Operacion', 'Crewing', 'TM-5', null, 'Investigando', 0, 0, '2025-05-15', '2025-07-31', 'Terra Mare', '2025-05-30', null, 'Reunion con Raul Hurtado'),
  ('Southern Energy', 'LNG/Golar', 'Servicios Operacion', 'Embarcaciones', 'HF-2', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'HF Offshore', '2025-05-30', null, 'Reunion con Raul Hurtado'),
  ('Southern Energy', 'LNG/Golar', 'Servicios Operacion', 'OSRO', 'CS-1', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Clean Sea', '2025-05-30', null, 'Reunion con Raul Hurtado'),
  ('Arendal', 'LNG/Golar', 'Obra Gasoducto', 'Embarcaciones', 'PL-4', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('Arendal', 'LNG/Golar', 'Obra Gasoducto', 'Crewing + Supply Chain', 'TM-9', null, 'Investigando', 0, 0, '2025-05-15', '2025-07-31', 'Terra Mare', null, null, null),
  ('YPF', 'Transporte Arena', 'Project Management', null, 'TM-1', 'guillermo.farina@ypf.com', 'Investigando', 0, 0, '2025-05-15', '2025-07-31', 'Terra Mare', null, 'Investigar', null),
  ('Arendal', 'VMOS', 'Obra Oleoducto', 'Embarcaciones', 'PL-3', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('Arendal', 'VMOS', 'Obra Oleoducto', 'Crewing + Supply Chain', 'TM-11', null, 'Investigando', 0, 0, '2025-05-15', '2025-07-31', 'Terra Mare', null, null, null),
  ('Buzca', 'VMOS', 'Obra Oleoducto', 'Embarcaciones', 'PL-2', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('Buzca', 'VMOS', 'Obra Oleoducto', 'Crewing', 'TM-10', null, 'Investigando', 0, 0, '2025-05-15', '2025-07-31', 'Terra Mare', null, null, null),
  ('GAC', 'VMOS', 'Obra Oleoducto', 'Crewing', 'TM-4', 'erica.gomez@gac.com', 'Propuesta Enviada', 440363, 405957.7613623554, '2025-05-15', '2025-07-31', 'Terra Mare', null, 'Esperar Cotizacion Formal', null),
  ('IEA', 'VMOS', 'Obra Oleoducto', 'Boyas Meterologicas', 'PL-1', 'Andres Dorta', 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('YPF', 'VMOS', 'Servicios Operacion', 'Embarcaciones', 'HF-1', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'HF Offshore', '2025-05-15',
    null, 'Hubo un RFI (Bahia Grande, Svitzer, Antares, Stapem Offshore fueron invitados). Flavio Llamedo confirmo invitar a PL y HF para el RfQ. 1) 1x AHTS 120 Tons bp + 1x TUG 60 a 70 tons bp + 1x Lancha para autoridades/practico/mooring master. 2) Contrato 5 a 10 anos'),
  ('YPF', 'VMOS', 'Servicios Operacion', 'OSRO', 'CS-3', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Clean Sea', '2025-05-15', null, null);

insert into comercial.eventos
  (fecha, evento, lugar, referencias, participa_terra_mare, participa_clean_sea, participa_parana_logistica)
values
  ('2026-04-01', 'Interspill', 'Europa', null, false, true, false),
  ('2026-05-04', 'OTC', 'Houston', null, true, false, true),
  ('2026-04-14', 'Intermodal', 'Brasil', null, false, true, true),
  ('2026-06-16', 'Breakbulk Europe', 'Rotterdam', 'https://europe.breakbulk.com/home', false, false, false),
  ('2025-06-02', 'Nor-Shipping', 'Noruega', null, false, false, false),
  ('2025-07-24', 'Offshore Conf Latam', 'Buenos Aires', null, true, false, true),
  ('2025-08-25', 'IMAGE', 'Houston', 'https://www.imageevent.org/', true, false, true),
  ('2025-09-30', 'Breakbulk Americas', 'Houston', 'https://americas.breakbulk.com/home', false, false, false),
  ('2026-09-01', 'RIO O&G', 'Rio de Janeiro', 'https://www.roge.energy/en/', true, true, true),
  ('2026-09-01', 'Spillcon', 'Australia', 'https://spillcon.com/', false, true, false),
  ('2025-10-07', 'Navegistic', 'Asuncion', null, false, true, true),
  ('2025-10-01', 'Patagonia O&G', 'Neuquen', 'https://www.aogpatagonia.com.ar/', true, true, false),
  ('2025-10-28', 'OTC', 'Rio de Janeiro', null, true, false, true),
  ('2025-11-01', 'ESNAV', 'Buenos Aires', 'https://esnav-buenosaires.com/', true, true, true),
  ('2025-11-01', 'AAPG', null, 'https://energysummit.aapg.org/2024', true, false, true),
  ('2025-11-18', 'Clean Gulf', 'New Orleans', 'https://www.cleangulf.org/', false, true, false);
