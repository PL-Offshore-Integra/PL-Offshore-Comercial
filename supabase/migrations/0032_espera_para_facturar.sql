-- ============================================================
-- 0032 · Los 90 dias de Service Management no son un vencimiento
--
-- Yo lo habia modelado mal. En 0028 puse `dias_de_pago = 90` para
-- Service Management y con eso el vencimiento de la factura salia
-- "fin del trabajo + 90 dias", copiando la formula de la planilla.
--
-- Como funciona de verdad, segun Silvestre:
--
--   1. La salida termina. NO se factura.
--   2. Se esperan 90 dias desde la fecha de finalizacion.
--   3. Ahi se le pregunta al cliente si se puede facturar —para eso se
--      le manda el estado de cuenta con lo que esta en condiciones—.
--   4. Si autoriza, se factura y se cobra en esa misma semana.
--
-- O sea que los 90 dias corren ANTES de la factura, no despues, y son
-- una espera para poder pedir, no un plazo de pago. El plazo de pago
-- real es de una semana desde que autorizan.
--
-- Son dos cosas distintas y ahora son dos columnas:
--
--   dias_para_facturar   del fin del trabajo a poder consultar al
--                        cliente. 90 en Service Management.
--   dias_de_pago         de la factura emitida a su vencimiento.
--                        7 en Service Management.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0031.
-- ============================================================

alter table comercial.cliente_empresas
  add column if not exists dias_para_facturar int;

comment on column comercial.cliente_empresas.dias_para_facturar is
  'Dias que hay que esperar desde que termina el trabajo para poder consultarle al cliente si se factura. En Service Management, 90.';

comment on column comercial.cliente_empresas.dias_de_pago is
  'Dias desde que se emite la factura hasta que vence. Distinto de dias_para_facturar, que corre antes de emitirla.';

update comercial.cliente_empresas
set dias_para_facturar = 90,
    -- Se cobra en la semana en que autorizan a facturar.
    dias_de_pago = 7
where lower(trim(nombre)) = 'service management';

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select nombre, dias_para_facturar, dias_de_pago
from comercial.cliente_empresas
where dias_para_facturar is not null or dias_de_pago is not null
order by nombre;
