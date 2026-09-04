import { readFileSync, writeFileSync } from "node:fs";
const { salida } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const f = (s) => (s ? new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000).toISOString().slice(0, 10) : null);
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === "" ? "null" : Number(v));
const ts = (d) => (d ? `'${d} 00:00:00-03:00'` : "null");

// El buque madre es lo que va entre parentesis; el alijador, el barco que
// queda despues del producto. Se parsea solo lo que el texto dice sin
// ambiguedad.
function partesSTS(h) {
  const madre = (h.match(/\(([^)]+)\)/) || [])[1] ?? null;
  const ali = (h.match(/(?:ALI|TOP)\s+(?:Gas oil|Gas Oil|Fuel Oil)\s+(.+?)(?:\s+CANCEL)?$/i) || [])[1] ?? null;
  return { madre, ali };
}

const viajes = [];
for (const r of salida["GOLONDRINA"]) {
  if (r.r < 3 || r.r > 19 || !r.C) continue;
  const h = r.H ?? "";
  const { madre, ali } = partesSTS(h);
  viajes.push({
    buque: "Golondrina de Mar",
    viaje: Number(r.B),
    desde: f(r.C), hasta: f(r.D), dias: Number(r.E),
    charteador: r.G, descripcion: h,
    importe: Number(r.J), comision: r.K ? Number(r.K) : 0,
    facturado: r.N === "Sí", cobrado: r.O === "Sí",
    cobroFecha: f(r.P), vencimiento: f(r.R),
    tcPagado: r.T ? Number(r.T) : null, tcDia: r.U ? Number(r.U) : null,
    madre, ali,
  });
}

// Atlantic Dama: la fila con viaje y fechas abre la salida; las de abajo son
// facturas de esa misma salida, y la letra del mes dice de que mes es cada
// una. DIQUE SECO no es un trabajo: es el buque parado.
const dama = [];
let actual = null;
let mes = null;
const MESES = { ENE:"01", FEB:"02", MAR:"03", ABR:"04", MAY:"05", JUN:"06", JUL:"07", AGO:"08", SEP:"09", OCT:"10", NOV:"11", DIC:"12" };
for (const r of salida["ATLANTIC DAMA"]) {
  if (r.r < 3 || r.r > 19) continue;
  if (r.A && MESES[r.A]) mes = MESES[r.A];
  if (r.H === "DIQUE SECO") continue;
  if (r.B && r.C) {
    actual = {
      buque: "Atlantic Dama", viaje: Number(r.B), desde: f(r.C), hasta: f(r.D),
      dias: r.E ? Number(r.E) : null, charteador: r.G, descripcion: r.H, facturas: [],
    };
    dama.push(actual);
  }
  if (r.J && actual) {
    actual.facturas.push({
      mes, importe: Number(r.J), comision: r.K && Number(r.K) !== Number(r.J) ? Number(r.K) : 0,
      facturado: r.N === "Sí", cobrado: r.O === "Sí", concepto: r.H ?? actual.descripcion,
    });
  }
}

// El ultimo dia del mes, que es como se fecha una factura mensual cuando la
// planilla no dice el dia.
const finDeMes = (anio, m) => new Date(Date.UTC(Number(anio), Number(m), 0)).toISOString().slice(0, 10);

writeFileSync(process.argv[3], JSON.stringify({ viajes, dama }, null, 1));

console.log("GOLONDRINA:", viajes.length, "viajes");
for (const v of viajes) {
  console.log(` #${v.viaje} ${v.desde}→${v.hasta} ${v.dias}d ${v.charteador} $${v.importe}${v.comision?` (com ${v.comision})`:""} fact=${v.facturado?"si":"no"} cob=${v.cobrado?"si":"no"} vto=${v.vencimiento ?? "-"} madre=${v.madre ?? "-"} ali=${v.ali ?? "-"}`);
}
console.log("\nATLANTIC DAMA:", dama.length, "salidas");
for (const d of dama) {
  const tot = d.facturas.reduce((a, x) => a + x.importe, 0);
  const fact = d.facturas.filter((x) => x.facturado).reduce((a, x) => a + x.importe, 0);
  console.log(` #${d.viaje} ${d.desde}→${d.hasta ?? "abierta"} ${d.charteador} total=${tot} facturado=${fact} pendiente=${(tot-fact).toFixed(2)}`);
  for (const x of d.facturas) console.log(`    ${x.mes} ${x.importe} fact=${x.facturado?"si":"no"} cob=${x.cobrado?"si":"no"} :: ${x.concepto}  -> ${finDeMes(2026, x.mes)}`);
}
