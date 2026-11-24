-- ---------------------------------------------------------------------------
-- Se sacan del maestro las siete ofertas de NJORD Shipbrokers
-- ---------------------------------------------------------------------------
--
-- Entraron en 0036 junto con el resto del tonelaje, pero no son tonelaje que
-- PL pueda ofrecer: son barcos en venta que un broker de afuera lista con un
-- numero de oferta en lugar de nombre —#24355, #24356, #24357, #24910,
-- #24911, #24912, #24913—, sin bandera ni armador, y ese numero cambia
-- cuando el broker rearma su cartera. En la pantalla de Broker PL ocupaban
-- la mitad de la lista sin decir de que buque se trata.
--
-- Se borran y no se marcan inactivos a proposito: "retirado" en la lista
-- quiere decir que el buque dejo de navegar, y estos siguen a flote. Si
-- alguna vuelve a hacer falta, los datos completos —tiro, potencia, casco,
-- precio pedido, proxima seca— estan en 0036, que sigue en el repo.
--
-- Queda tambien el ARK TORI, que es de terceros pero tiene nombre, armador y
-- un informe de ABS: ese si se puede ofrecer.
--
-- Corrida en produccion el 24/11/2026 por Silvestre desde el SQL Editor: la
-- verificacion devolvio 12 buques y ninguno de NJORD.
-- ---------------------------------------------------------------------------

delete from comercial.buques
where broker = 'NJORD Shipbrokers';

-- Verificacion: doce buques, ninguno de NJORD.
select
  count(*) as buques,
  count(*) filter (where relacion = 'propio') as propios,
  count(*) filter (where relacion = 'gestionado') as gestionados,
  count(*) filter (where relacion = 'terceros') as de_terceros,
  count(*) filter (where broker = 'NJORD Shipbrokers') as njord
from comercial.buques;
