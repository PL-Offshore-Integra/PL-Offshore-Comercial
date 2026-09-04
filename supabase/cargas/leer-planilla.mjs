import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
const dec = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const ss = readFileSync(`${dir}/xl/sharedStrings.xml`, "utf8");
const shared = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))
);

// Excel guarda las fechas como dias desde el 30/12/1899.
const fecha = (serial) => {
  const ms = Date.UTC(1899, 11, 30) + Number(serial) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
};

const hojas = [...readFileSync(`${dir}/xl/workbook.xml`, "utf8")
  .matchAll(/<sheet[^>]*name="([^"]*)"[^>]*sheetId="(\d+)"[^>]*r:id="rId(\d+)"/g)]
  .map((m) => ({ nombre: dec(m[1]), rid: +m[3] }));

const salida = {};
for (const h of hojas) {
  const xml = readFileSync(`${dir}/xl/worksheets/sheet${h.rid}.xml`, "utf8");
  const filas = [];
  for (const row of xml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const celdas = {};
    const re = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c;
    while ((c = re.exec(row[2])) !== null) {
      const col = c[1], attrs = c[2] ?? "", cuerpo = c[3] ?? "";
      const v = (cuerpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (v === undefined || v === "") continue;
      celdas[col] = /t="s"/.test(attrs) ? shared[+v] : v;
    }
    if (Object.keys(celdas).length) filas.push({ r: +row[1], ...celdas });
  }
  salida[h.nombre] = filas;
}

writeFileSync(process.argv[3], JSON.stringify({ salida, fechaEjemplo: { 46021: fecha(46021), 46256: fecha(46256) } }, null, 1));
console.log(Object.entries(salida).map(([k, v]) => `${k}: ${v.length} filas`).join("\n"));
console.log("46021 =", fecha(46021), "· 46256 =", fecha(46256));
