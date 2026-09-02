-- Carga inicial con los datos del tracker "Tacker Ventas-Calendario Ferias -.xlsx"
-- Ejecutar despues de 0001_init.sql
--
-- El tracker original traia 20 oportunidades de cuatro empresas propias:
-- Terra Mare (11), Clean Sea (3), HF Offshore (2) y Parana Logistica (4). El
-- 2 de septiembre de 2026 el modulo paso a ser solo de PL Offshore, asi que
-- las 16 que no eran de Parana Logistica se borraron de la base y se sacan de
-- aca: si quedaran, cualquiera que corriera el seed de nuevo las traeria de
-- vuelta.
--
-- Las 16 filas siguen en el historial de git, en el commit 9754bf4 (el
-- scaffold inicial), por si alguna vez hay que recuperarlas.

insert into comercial.oportunidades
  (compania, nombre_proyecto, alcance_oportunidad, descripcion_alcance, nro_oportunidad,
   contacto, estadio, valor, costo, fecha_creacion, fecha_esperada_cierre, empresa,
   last_interacted_on, proximos_pasos, notas)
values
  ('Arendal', 'LNG/Golar', 'Obra Gasoducto', 'Embarcaciones', 'PL-4', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('Arendal', 'VMOS', 'Obra Oleoducto', 'Embarcaciones', 'PL-3', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('Buzca', 'VMOS', 'Obra Oleoducto', 'Embarcaciones', 'PL-2', null, 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null),
  ('IEA', 'VMOS', 'Obra Oleoducto', 'Boyas Meterologicas', 'PL-1', 'Andres Dorta', 'Investigando', 0, 0, '2025-05-15', '2025-12-31', 'Parana Logistica', null, null, null);

-- El calendario de ferias se deja completo: las columnas de participacion son
-- de las cuatro empresas y el calendario se comparte, no es del pipeline.
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
