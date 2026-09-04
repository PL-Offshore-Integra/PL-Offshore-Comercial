# Cargas de datos

No son migraciones: no cambian la forma de la base, meten filas. Van aparte
para que `supabase/migrations` siga siendo la historia del esquema.

Todas son idempotentes —cada `insert` va con un `not exists`—, asi que correrlas
dos veces no duplica nada.

## 2026_remolcadores.sql

Los viajes 2026 de `REMOLCADORES - RESUMEN 2026.xlsx` (hojas GOLONDRINA y
ATLANTIC DAMA): 3 proyectos, 18 salidas y 16 facturas con su cobranza.

No se tipeo: lo genero el parser de esta misma carpeta, y la lectura se valido
contra los cuatro totales de control de la propia planilla, que dan al centavo:

| Control | Planilla | Cargado |
|---|---|---|
| Pendiente de facturar, Golondrina | 688.374,24 | 688.374,24 |
| Pendiente de facturar, Atlantic Dama | 247.140,00 | 247.140,00 |
| Pendiente de facturar, consolidado | 935.514,24 | 935.514,24 |
| Neto total facturado | 3.496.003,41 | 3.496.003,41 |

Para regenerarla desde la planilla:

```bash
node leer-planilla.mjs <carpeta del xlsx descomprimido> hojas.json
node estructurar-planilla.mjs hojas.json viajes.json
node generar-carga.mjs viajes.json 2026_remolcadores.sql
```

### Decisiones que se tomaron al cargar

- **Cada salida entra como Voyage Charter con un lump sum igual al importe de
  la planilla.** De un viaje historico se sabe el total cerrado, no de que
  tarifas salio. Asi, guardar la salida en pantalla vuelve a dar exactamente
  ese numero en vez de recalcularlo contra tarifas que no tenemos.
- **El viaje 17 del Golondrina no se carga**: ya estaba como OP-1-2026, con las
  horas reales del STS (20/08 07:00 a 21/08 12:30) en vez del rango de
  facturacion de la planilla (18 al 22/08).
- **Los dias**: la planilla cuenta dias inclusive (5 para un 11 al 15); el
  modulo mide tiempo transcurrido, porque de las horas sale el precio de un
  STS. El conteo de la planilla quedo escrito en el comentario de cada salida.
- **Las facturas de Atlantic Dama** estan marcadas cobradas sin decir cuando.
  Se uso el fin del mes facturado y quedo dicho en las notas de cada una: el
  promedio de dias al cobro de esas filas no significa nada hasta que alguien
  ponga las fechas reales.
- **IVA**: las salidas de Service Management van exentas, como su proyecto. Las
  de UABL, Fugro y HOC quedaron en 21% porque la planilla no lo dice; hay que
  confirmarlo.
- **DIQUE SECO** (enero a abril de la Dama) no se cargo: es el buque parado, no
  un trabajo.

## track_record_historico.sql

Las 98 filas de `Company - Track Record_v1.xlsx`, hojas CHARTERING (84),
CHARTER-IN (4) y MANAGEMENT (10). La cuarta hoja —Company Track Record: los
campamentos, alquileres y viveres en plataformas de Mexico— quedo afuera por
decision de Silvestre: es trabajo de otras empresas de Integra.

```bash
node leer-planilla.mjs <carpeta del xlsx descomprimido> tr.json
node generar-track-record.mjs tr.json track_record_historico.sql
```

La identidad de cada fila es **su lugar en el xlsx** (`xlsx CHARTERING fila 12`,
que queda en `notas`), y no su contenido. La primera version usaba el contenido
y se comio 7 filas: hay trabajos repetidos identicos —tres remolques iguales de
Servimagnus en 2022, mismo cliente, mismo alcance, mismo valor— que son
trabajos distintos.

El valor se guarda dos veces: el numero para poder sumar y el texto tal como lo
dice el documento ("~0.5 million", "On going"). Ese redondeo es a proposito: es
lo que se le muestra a un cliente.
