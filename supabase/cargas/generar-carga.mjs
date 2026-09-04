import { readFileSync, writeFileSync } from "node:fs";
const { viajes, dama } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === "" ? "null" : Number(v));
const ts = (d) => (d ? `'${d} 00:00:00-03:00'` : "null");
const finDeMes = (m) => new Date(Date.UTC(2026, Number(m), 0)).toISOString().slice(0, 10);

const L = [];
L.push(`-- Carga de los viajes 2026 de "REMOLCADORES - RESUMEN 2026.xlsx".
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
-- Todo va con "not exists": correr esto dos veces no duplica nada.`);

for (const nombre of ["UABL SA", "Fugro Chile SA", "HOC Contratistas SA"]) {
  L.push(`insert into comercial.cliente_empresas (nombre) select ${q(nombre)}
where not exists (select 1 from comercial.cliente_empresas where lower(trim(nombre)) = lower(trim(${q(nombre)})));`);
}

L.push(`insert into comercial.zonas (nombre, tipo, notas) values
  ('Golfo San Matias', 'area_offshore',
   'La nombra la planilla de remolcadores (survey YPF/ENI). Falta la posicion.')
on conflict do nothing;`);

const proyectos = [
  { nombre: "UABL / Traslado POSEIDON", cliente: "UABL SA", buque: "Golondrina de Mar",
    descripcion: "Traslado del POSEIDON de Rosario a Montevideo con estructuras.",
    final: null, zona: "Rosario", valor: 302000, estado: "finalizado",
    desde: "2026-05-30", hasta: "2026-06-10" },
  { nombre: "Fugro / Survey Golfo San Matias", cliente: "Fugro Chile SA", buque: "Atlantic Dama",
    descripcion: "Geophysical survey para YPF/ENI en el Golfo San Matias, con el Atlantic Dama.",
    final: "YPF / ENI", zona: "Golfo San Matias", valor: 1264300.25, estado: "finalizado",
    desde: "2026-06-12", hasta: "2026-07-29" },
  { nombre: "HOC / Flotel VMOS", cliente: "HOC Contratistas SA", buque: "Atlantic Dama",
    descripcion: "Offshore support con el Atlantic Dama como flotel para el proyecto VMOS.",
    final: "VMOS", zona: null, valor: 1035770, estado: "en_curso",
    desde: "2026-07-30", hasta: null },
];

for (const p of proyectos) {
  L.push(`insert into comercial.proyectos
  (nombre, compania, cliente_empresa_id, cliente_final, buque, descripcion, zona_id,
   fecha_inicio_estimada, fecha_fin_estimada, moneda, iva, estructura_tarifaria, valor, estado, notas)
select ${q(p.nombre)}, ${q(p.cliente)}, e.id, ${q(p.final)}, ${q(p.buque)}, ${q(p.descripcion)},
       ${p.zona ? `(select id from comercial.zonas where nombre = ${q(p.zona)})` : "null"},
       ${ts(p.desde)}, ${ts(p.hasta)}, 'USD', '21', 'voyage_charter', ${p.valor}, ${q(p.estado)},
       'Cargado de la planilla de remolcadores 2026.'
from comercial.cliente_empresas e
where lower(trim(e.nombre)) = lower(trim(${q(p.cliente)}))
  and not exists (select 1 from comercial.proyectos where nombre = ${q(p.nombre)});`);

  L.push(`insert into comercial.proyecto_tarifas (proyecto_id, concepto, unidad, monto, orden)
select p.id, 'lump_sum', 'global', ${p.valor}, 0 from comercial.proyectos p
where p.nombre = ${q(p.nombre)}
  and not exists (select 1 from comercial.proyecto_tarifas t where t.proyecto_id = p.id);`);
}

const salidas = [];
for (const v of viajes) {
  if (v.viaje === 17) continue;
  const esSM = v.charteador === "SERVICE MANAGEMENT";
  salidas.push({
    proyecto: esSM ? "Service Management / STS" : "UABL / Traslado POSEIDON",
    // Service Management es exento, lo dijo Silvestre y lo dice su proyecto.
    // Del resto no se sabe: quedan en 21 y hay que confirmarlo.
    iva: esSM ? "exento" : "21",
    nombre: `${v.descripcion} (viaje ${v.viaje})`,
    buque: v.buque,
    final: esSM ? "Raizen" : null,
    zona: esSM ? "Alfa" : null,
    madre: v.madre,
    ali: v.ali,
    desde: v.desde,
    hasta: v.hasta,
    valor: v.importe,
    estado: "finalizada",
    comentario:
      `De la planilla 2026, viaje ${v.viaje}. La planilla cuenta ${v.dias} dias (conteo inclusivo).` +
      (v.descripcion.includes("CANCEL") ? " Viaje cancelado: se cobro mob/demob." : ""),
    facturas: v.facturado
      ? [{ importe: v.importe, comision: v.comision, emision: v.hasta,
           vencimiento: v.vencimiento, cobrado: v.cobrado, cobroFecha: v.cobroFecha,
           tc: v.tcPagado, tcDia: v.tcDia, concepto: null }]
      : [],
  });
}
for (const d of dama) {
  const proyecto = d.charteador === "FUGRO CHILE SA" ? "Fugro / Survey Golfo San Matias" : "HOC / Flotel VMOS";
  const total = d.facturas.reduce((a, x) => a + x.importe, 0);
  salidas.push({
    proyecto,
    nombre: `${d.descripcion} (viaje ${d.viaje})`,
    buque: d.buque,
    final: d.charteador === "FUGRO CHILE SA" ? "YPF / ENI" : "VMOS",
    zona: d.charteador === "FUGRO CHILE SA" ? "Golfo San Matias" : null,
    iva: "21",
    madre: null,
    ali: null,
    desde: d.desde,
    hasta: d.hasta,
    valor: total,
    estado: d.hasta ? "finalizada" : "en_curso",
    comentario: `De la planilla 2026, viaje ${d.viaje}. Se factura por mes: ${d.facturas.length} renglones por ${total.toFixed(2)} USD en total.`,
    facturas: d.facturas
      .filter((x) => x.facturado)
      .map((x) => ({
        importe: x.importe, comision: x.comision, emision: finDeMes(x.mes),
        vencimiento: null, cobrado: x.cobrado,
        cobroFecha: x.cobrado ? finDeMes(x.mes) : null,
        tc: null, tcDia: null, concepto: x.concepto,
      })),
  });
}
salidas.sort((a, b) => a.desde.localeCompare(b.desde));

for (const s of salidas) {
  L.push(`-- ${s.desde} · ${s.nombre}
insert into comercial.operaciones
  (proyecto_id, nombre, buque, cliente_final, zona_id, buque_madre, alijador,
   fecha_inicio, fecha_fin, moneda, iva, estructura_tarifaria, valor, comision_total, estado, comentarios)
select p.id, ${q(s.nombre)}, ${q(s.buque)}, ${q(s.final)},
       ${s.zona ? `(select id from comercial.zonas where nombre = ${q(s.zona)})` : "null"},
       ${q(s.madre)}, ${q(s.ali)}, ${ts(s.desde)}, ${ts(s.hasta)},
       'USD', ${q(s.iva)}, 'voyage_charter', ${s.valor}, 0, ${q(s.estado)}, ${q(s.comentario)}
from comercial.proyectos p
where p.nombre = ${q(s.proyecto)}
  and not exists (select 1 from comercial.operaciones where nombre = ${q(s.nombre)});`);

  L.push(`insert into comercial.operacion_tarifas (operacion_id, concepto, unidad, monto, orden)
select o.id, 'lump_sum', 'global', ${s.valor}, 0 from comercial.operaciones o
where o.nombre = ${q(s.nombre)}
  and not exists (select 1 from comercial.operacion_tarifas t where t.operacion_id = o.id);`);

  for (const fa of s.facturas) {
    const nota = [
      fa.concepto,
      "De la planilla 2026.",
      fa.cobrado && !fa.tc ? "La planilla la marca cobrada sin decir cuando: se uso el fin del mes facturado." : null,
    ].filter(Boolean).join(" · ");

    L.push(`insert into comercial.facturas
  (proyecto_id, operacion_id, empresa_facturadora, fecha_emision, vencimiento,
   importe, comision, moneda, cobro_moneda, cobro_fecha, tc_pagado, tc_dia_cobro, notas)
select o.proyecto_id, o.id, 'Parana Logistica', ${q(fa.emision)}, ${q(fa.vencimiento)},
       ${fa.importe}, ${fa.comision}, 'USD',
       ${fa.cobrado ? (fa.tc ? "'ARS'" : "'USD'") : "null"},
       ${q(fa.cobrado ? fa.cobroFecha : null)}, ${n(fa.tc)}, ${n(fa.tcDia)}, ${q(nota)}
from comercial.operaciones o
where o.nombre = ${q(s.nombre)}
  and not exists (
    select 1 from comercial.facturas f
    where f.operacion_id = o.id
      and f.importe = ${fa.importe}
      and f.fecha_emision = ${q(fa.emision)}
  );`);
  }
}

L.push(`select (select count(*) from comercial.proyectos)  as proyectos,
       (select count(*) from comercial.operaciones) as salidas,
       (select count(*) from comercial.facturas)    as facturas,
       (select sum(importe) from comercial.facturas) as facturado,
       (select sum(importe) from comercial.facturas where cobro_moneda is not null) as cobrado;`);

writeFileSync(process.argv[3], L.join("\n\n") + "\n");
const nf = salidas.reduce((a, s) => a + s.facturas.length, 0);
console.log(`${salidas.length} salidas, ${nf} facturas`);
