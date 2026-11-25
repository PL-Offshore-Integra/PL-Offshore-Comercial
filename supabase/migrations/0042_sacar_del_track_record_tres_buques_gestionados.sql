-- ---------------------------------------------------------------------------
-- Se sacan del track record los trabajos de management del Sunrise G, el
-- Hai Yang Shi You 721 y el Victory G
-- ---------------------------------------------------------------------------
--
-- Entraron en la carga historica desde la hoja MANAGEMENT del xlsx original
-- (filas 4, 5, 6 y 7). Son cuatro renglones de Crew Management sobre buques
-- de terceros —Rederij Groen y COSL— para TGS y PXGEO.
--
-- Se sacan por decision de Silvestre: el track record es lo que se le manda
-- a un cliente para decir que hizo PL Offshore, y estos tres no van.
--
-- QUE QUEDA EN LA SECCION
--
--   Management no desaparece: quedan el Expedient de Excelerate (2023, 2024 y
--   2025) y los tres trabajos sin buque —Louis Dreyfus TravOcean, Gaeaquatic
--   y Subsea Environmental Services—, que son procurement y visas.
--
-- POR QUE TAMBIEN SE TOCA LA CARGA
--
--   `supabase/cargas/track_record_historico.sql` es idempotente: no inserta
--   lo que ya esta, pero SI volveria a insertar lo que se borro. Si este
--   delete corre y la carga queda intacta, el dia que alguien levante la base
--   de cero los cuatro renglones vuelven. Por eso los cuatro bloques salen
--   tambien de ese archivo, con una nota que remite a esta migracion.
--
--   Los tres buques no aparecen en ninguna otra seccion del track record, asi
--   que despues de esto no quedan en la pantalla.
--
-- Corrida en produccion el 25/11/2026 por la Management API: la verificacion
-- devolvio management = 6, los tres buques = 0 y 94 filas en total, cuatro
-- menos que las 98 que habia. Es la primera migracion de Comercial que queda
-- anotada en el historial de migraciones de Supabase, que es compartido por
-- todo Integra; las 41 anteriores se corrieron desde el SQL Editor, que no las
-- registra. El historial del modulo siguen siendo estos archivos numerados.
-- ---------------------------------------------------------------------------

delete from comercial.track_record
where seccion = 'management'
  and buque in ('Sunrise G', 'Victory G', 'Hai Yang Shi You 721');

-- Verificacion: management queda en seis filas, ninguna de los tres buques, y
-- el track record completo pierde exactamente cuatro.
select
  count(*) filter (where seccion = 'management') as management,
  count(*) filter (
    where buque in ('Sunrise G', 'Victory G', 'Hai Yang Shi You 721')
  ) as los_tres_buques,
  count(*) as track_record_entero
from comercial.track_record;
