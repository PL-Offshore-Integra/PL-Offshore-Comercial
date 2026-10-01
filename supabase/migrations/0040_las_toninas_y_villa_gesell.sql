-- ---------------------------------------------------------------------------
-- Dos lugares mas en el maestro de zonas: Las Toninas y Villa Gesell
-- ---------------------------------------------------------------------------
--
-- El maestro nacio en 0025 con los puertos que se usaban hasta entonces, y
-- la lista se quedo corta: faltaban estos dos de la costa bonaerense. No es
-- un olvido puntual sino la forma del problema —el maestro nunca va a tener
-- el 100% de los lugares—, asi que junto con esta migracion el desplegable
-- pasa a dejar cargar uno nuevo sin salir del formulario.
--
-- Van con la posicion de la localidad, que es aproximada, y asi queda dicho
-- en las notas: alcanza para ubicarlas en el mapa y para no confundirlas con
-- una coordenada tomada de una carta nautica.
--
-- `on conflict do nothing` sobre el nombre: si alguien ya las cargo a mano
-- desde la pantalla de Zonas, esta migracion no hace nada.
-- ---------------------------------------------------------------------------

insert into comercial.zonas (nombre, tipo, lat, lon, notas) values
  ('Las Toninas', 'puerto', -36.716667, -56.700000,
   'Partido de la Costa, Buenos Aires. Posicion aproximada: la de la localidad.'),
  ('Villa Gesell', 'puerto', -37.266667, -56.966667,
   'Buenos Aires. Posicion aproximada: la de la localidad.')
on conflict do nothing;

-- Verificacion: los dos nuevos y cuantos puertos quedan.
select
  (select count(*) from comercial.zonas where tipo = 'puerto') as puertos,
  (select count(*) from comercial.zonas where nombre in ('Las Toninas', 'Villa Gesell')) as los_dos;
