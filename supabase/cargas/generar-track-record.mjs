import { readFileSync, writeFileSync } from "node:fs";
const { salida } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const q = (v) =>
  v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "NA"
    ? "null"
    : `'${String(v).trim().replace(/'/g, "''")}'`;
const num = (v) => (v === null || v === undefined || v === "" ? "null" : Number(v));

// "~0.5 million" / "~0,06 million" / "~1.4 million" -> 500000 / 60000 / 1400000
// "On going" y los vacios no son un numero: queda el texto y el valor en null.
function valorUSD(texto) {
  if (!texto) return null;
  const t = String(texto);
  const m = t.match(/([\d.,]+)\s*million/i);
  if (!m) return null;
  // El separador decimal viene de las dos formas en la misma columna.
  const n = Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 1e6 * 100) / 100 : null;
}

const hojas = [
  { hoja: "CHARTERING", seccion: "chartering",
    map: { buque: "B", tipo: "C", armador: null, cliente: "D", region: "E",
           periodo: "F", alcance: "G", desde: "H", hasta: "I", valor: "J" } },
  { hoja: "CHARTER-IN", seccion: "charter_in",
    map: { buque: "B", tipo: "D", armador: "C", cliente: "E", region: "F",
           periodo: "G", alcance: "H", desde: "I", hasta: "J", valor: "K" } },
  { hoja: "MANAGEMENT", seccion: "management",
    map: { buque: "B", tipo: "C", armador: "D", cliente: "E", region: "F",
           periodo: "G", alcance: "H", desde: "I", hasta: "J", valor: "K" } },
];

const L = [];
L.push(`-- Track record historico de "Company - Track Record_v1.xlsx".
--
-- Tres hojas: CHARTERING, CHARTER-IN y MANAGEMENT. La cuarta —Company
-- Track Record, los campamentos y viveres en plataformas de Mexico— quedo
-- afuera por decision de Silvestre: es trabajo de otras empresas de Integra.
--
-- Generado por un parser, no tipeado. El valor se guarda dos veces: el numero
-- para poder sumar y el texto tal como lo dice el documento ("~0.5 million",
-- "On going"), porque ese redondeo es a proposito.
--
-- Idempotente: cada fila se identifica por seccion + buque + cliente + alcance
-- + anio, asi que correrlo dos veces no duplica.`);

let total = 0;
for (const { hoja, seccion, map } of hojas) {
  const filas = salida[hoja].filter((r) => {
    const b = r[map.buque];
    return b && b !== "Vessel" && b !== "Vessel / Asset";
  });

  for (const r of filas) {
    const vTexto = r[map.valor] ?? null;
    const vNum = valorUSD(vTexto);
    const campos = {
      seccion: q(seccion),
      buque: q(r[map.buque]),
      tipo_de_buque: q(r[map.tipo]),
      armador: map.armador ? q(r[map.armador]) : "null",
      cliente: q(r[map.cliente]),
      region: q(r[map.region]),
      periodo: q(r[map.periodo]),
      alcance: q(r[map.alcance]),
      anio_desde: num(r[map.desde]),
      anio_hasta: num(r[map.hasta]),
      valor_usd: vNum === null ? "null" : vNum,
      valor_texto: q(vTexto),
    };

    // La identidad de una fila es su lugar en el xlsx, no su contenido: hay
    // trabajos repetidos identicos —tres remolques iguales de Servimagnus en
    // 2022— que son trabajos distintos, y una clave por contenido los
    // colapsaba en uno.
    const origen = "xlsx " + hoja + " fila " + r.r;

    L.push(`insert into comercial.track_record
  (seccion, buque, tipo_de_buque, armador, cliente, region, periodo, alcance,
   anio_desde, anio_hasta, valor_usd, valor_texto, notas)
select ${Object.values(campos).join(", ")}, ${q(origen)}
where not exists (select 1 from comercial.track_record t where t.notas = ${q(origen)});`);
    total++;
  }
}

L.push(`select seccion, count(*) as filas,
       min(anio_desde) as desde, max(coalesce(anio_hasta, anio_desde)) as hasta,
       sum(valor_usd) as valor_declarado
from comercial.track_record
group by seccion order by seccion;`);

writeFileSync(process.argv[3], L.join("\n\n") + "\n");
console.log(`${total} filas`);
