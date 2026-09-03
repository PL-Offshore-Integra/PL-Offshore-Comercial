-- ============================================================
-- 0021 · El alijador
--
-- En un STS hay tres buques y el modulo solo tenia lugar para dos:
--
--   supply       el nuestro, el que factura        -> operaciones.buque
--   buque madre  el que descarga                  -> operaciones.buque_madre
--   alijador     el que recibe                    -> faltaba
--
-- En la operacion de agosto el alijador era el Palena Star, y no tenia
-- donde ir mas que en el comentario. Es uno de los siete casilleros que
-- se llenan por salida, asi que va como columna.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0020.
-- ============================================================

alter table comercial.operaciones
  add column if not exists alijador text;

-- La operacion ya cargada lo tenia escrito en el comentario.
update comercial.operaciones
set alijador = 'Palena Star',
    comentarios = 'Viaje VOY17-26. Capitan del Golondrina: Jorge Rios. Entrega y retiro de defensas neumaticas y mangueras.'
where nro_operacion = 'OP-1-2026'
  and alijador is null
  and comentarios like '%Palena Star%';

select nro_operacion, buque, buque_madre, alijador, cliente_final
from comercial.operaciones;
