import { diasEntre } from "@/lib/fechas";
import type { ProyectoConOperaciones } from "@/lib/types";

// El track record: lo que la empresa hizo, para mandarlo con una propuesta.
//
// Sale de dos lugares y se lee como uno:
//
//   la tabla       las 98 filas historicas del xlsx, de 2017 en adelante
//   los proyectos  los que se terminan en el modulo, que aparecen solos
//
// Una fila de la tabla con `proyecto_id` reemplaza a la derivada de ese
// proyecto: es la puerta para retocar como se cuenta un trabajo antes de
// mostrarlo afuera —traducirlo al ingles, redondear el valor— sin tocar el
// proyecto.

export type SeccionTR = "chartering" | "charter_in" | "management";

// El documento sale en los dos idiomas: en ingles para afuera, en castellano
// para adentro.
export type Idioma = "es" | "en";

// Las tres secciones se llaman igual en las dos: son los titulos del propio
// documento. Lo que cambia es la linea que las explica.
export const SECCIONES_TR: {
  id: SeccionTR;
  label: string;
  sub: Record<Idioma, string>;
}[] = [
  {
    id: "chartering",
    label: "Chartering",
    sub: { es: "Trabajos con buques propios", en: "Work with own vessels" },
  },
  {
    id: "charter_in",
    label: "Charter-in",
    sub: { es: "Buques tomados de terceros", en: "Third-party vessels chartered in" },
  },
  {
    id: "management",
    label: "Management",
    sub: { es: "Crew management y procurement", en: "Crew management and procurement" },
  },
];

// Los encabezados de la tabla y los titulares, en los dos idiomas. Lo que se
// imprime se traduce; los filtros y los botones no, que son la herramienta y
// no el documento.
export const TEXTOS: Record<Idioma, Record<string, string>> = {
  es: {
    vessel: "Buque",
    type: "Tipo",
    owner: "Armador",
    client: "Cliente",
    region: "Region",
    period: "Periodo",
    scope: "Alcance del trabajo",
    years: "Años",
    value: "Valor",
    trabajos: "Trabajos",
    periodo: "Periodo",
    valorDeclarado: "Valor declarado",
    buques: "buques",
    clientes: "clientes",
    delModulo: "del modulo",
    sinTraducir: "sin traducir",
    conValor: "trabajos tienen valor cargado",
    de: "de",
    completo: "Del track record completo",
    vacio: "No hay trabajos con estos filtros.",
  },
  en: {
    vessel: "Vessel",
    type: "Type",
    owner: "Owner",
    client: "Client",
    region: "Region",
    period: "Period",
    scope: "Scope of work",
    years: "Years",
    value: "Value",
    trabajos: "Jobs",
    periodo: "Period",
    valorDeclarado: "Declared value",
    buques: "vessels",
    clientes: "clients",
    delModulo: "from the system",
    sinTraducir: "not translated",
    conValor: "jobs have a value on record",
    de: "of",
    completo: "Across the full track record",
    vacio: "No jobs match these filters.",
  },
};

export interface FilaTrackRecord {
  id: string;
  seccion: SeccionTR;
  buque: string | null;
  tipo_de_buque: string | null;
  armador: string | null;
  cliente: string | null;
  region: string | null;
  periodo: string | null;
  // El texto original del xlsx. Lo que se muestra son los dos de abajo.
  alcance: string | null;
  alcance_en: string | null;
  alcance_es: string | null;
  anio_desde: number | null;
  anio_hasta: number | null;
  valor_usd: number | null;
  valor_texto: string | null;
  proyecto_id: string | null;
  notas: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

// Una fila lista para mostrar, venga de donde venga.
export type FilaMostrable = Omit<FilaTrackRecord, "created_at" | "updated_at" | "notas"> & {
  // De donde salio, para poder decirlo en pantalla y para saber si se puede
  // editar.
  origen: "historico" | "proyecto";
  href: string | null;
};

// El valor como lo escribe el documento: "~0.5 million". El redondeo es a
// proposito —es lo que se le muestra a un cliente— y asi las filas nuevas se
// leen igual que las historicas. Verificado contra el xlsx: 500.000 da
// "~0.5 million" y 60.000 da "~0.06 million", igual que ahi.
//
// Se genera en vez de guardarse: guardar dos copias de algo calculado es
// garantizar que un dia digan cosas distintas.
export function valorComoElDocumento(
  valor: number | null,
  idioma: Idioma = "en"
): string | null {
  if (valor === null || !Number.isFinite(valor) || valor <= 0) return null;
  const millones = valor / 1e6;
  const decimales = millones < 0.1 ? 2 : 1;
  const numero = millones.toFixed(decimales);
  return idioma === "en"
    ? `~${numero} million`
    : `~${numero.replace(".", ",")} millones`;
}

// El periodo con las palabras del documento: dias hasta 60, y despues meses.
// Devuelve el ingles, que es el idioma del documento; `traducir` lo pasa a
// castellano. Asi las filas historicas y las derivadas siguen el mismo camino.
export function periodoComoElDocumento(
  desde: string | null,
  hasta: string | null
): string | null {
  const dias = diasEntre(desde?.slice(0, 10) ?? null, hasta?.slice(0, 10) ?? null);
  if (dias === null || dias < 0) return null;
  if (dias <= 60) return `~${Math.max(dias, 1)} days`;
  const meses = Math.round(dias / 30);
  return `~${meses} months`;
}

// Los textos cortos que son plantillas con un numero adentro no se guardan
// dos veces: se traducen al mostrar. Son 25 periodos distintos y todos caen en
// estas cinco palabras.
export function periodoEnIdioma(texto: string | null, idioma: Idioma): string | null {
  if (!texto || idioma === "en") return texto;
  return texto
    .replace(/\bdays?\b/gi, (m) => (m.toLowerCase() === "day" ? "dia" : "dias"))
    .replace(/\bmonths?\b/gi, (m) => (m.toLowerCase() === "month" ? "mes" : "meses"))
    .replace(/\byears?\b/gi, (m) => (m.toLowerCase() === "year" ? "año" : "años"))
    .replace(/^On demand$/i, "A demanda");
}

export function regionEnIdioma(texto: string | null, idioma: Idioma): string | null {
  if (!texto || idioma === "en") return texto;
  return texto.replace(/\bBrazil\b/g, "Brasil");
}

// El valor de una fila. Si hay numero se genera; si no, se muestra el texto
// del documento —"On going"— traducido.
export function valorEnIdioma(
  valorUSD: number | null,
  valorTexto: string | null,
  idioma: Idioma
): string | null {
  const generado = valorComoElDocumento(valorUSD, idioma);
  if (generado) return generado;
  if (!valorTexto) return null;
  if (idioma === "en") return valorTexto;
  return valorTexto.replace(/^On going$/i, "En curso").replace(/\bmillion\b/gi, "millones");
}

// El alcance en el idioma pedido, y si no esta, en el otro: en un documento
// que se manda, una linea en el otro idioma es mejor que un agujero. La
// pantalla avisa cuales cayeron al otro idioma; el PDF no.
export function alcanceEnIdioma(
  fila: { alcance_es: string | null; alcance_en: string | null },
  idioma: Idioma
): { texto: string | null; traducido: boolean } {
  const propio = idioma === "es" ? fila.alcance_es : fila.alcance_en;
  const otro = idioma === "es" ? fila.alcance_en : fila.alcance_es;
  if (propio) return { texto: propio, traducido: true };
  return { texto: otro, traducido: false };
}

const anioDe = (iso: string | null) => {
  const a = Number(iso?.slice(0, 4));
  return Number.isFinite(a) && a > 1900 ? a : null;
};

// Un proyecto terminado, contado como lo cuenta el documento.
//
// `tipoPorBuque` sale de las filas historicas: el Atlantic Dama figura como
// AHTS en 60 filas, asi que no hace falta volver a decirlo ni inventarlo.
export function filaDeProyecto(
  p: ProyectoConOperaciones,
  tipoPorBuque: Map<string, string>
): FilaMostrable {
  const desde = p.arranco ?? p.fecha_inicio_estimada;
  const hasta = p.termino ?? p.fecha_fin_estimada;
  const valor = Number(p.valor ?? 0) || null;

  return {
    id: `proyecto-${p.id}`,
    seccion: "chartering",
    buque: p.buque,
    tipo_de_buque: p.buque ? (tipoPorBuque.get(p.buque.toLowerCase()) ?? null) : null,
    armador: null,
    // El documento pone el cliente final. Si no se sabe, el que contrata.
    cliente: p.cliente_final ?? p.compania,
    // Todo el track record historico dice Argentina salvo dos filas. Es el
    // default, y se corrige con una fila propia si algun dia hace falta.
    region: "Argentina",
    periodo: periodoComoElDocumento(desde, hasta),
    alcance: p.scope_es ?? p.descripcion ?? p.nombre,
    // El scope corto es lo que va al documento; si no esta, la descripcion
    // larga, que es mejor que un agujero. El ingles puede faltar: ahi el
    // documento cae al castellano y la pantalla lo avisa (0031).
    alcance_es: p.scope_es ?? p.descripcion ?? p.nombre,
    alcance_en: p.scope_en ?? null,
    anio_desde: anioDe(desde),
    anio_hasta: anioDe(hasta),
    valor_usd: valor,
    valor_texto: null,
    proyecto_id: p.id,
    activa: true,
    origen: "proyecto",
    href: `/proyectos/${p.id}`,
  };
}

export function unirTrackRecord(
  historico: FilaTrackRecord[],
  proyectos: ProyectoConOperaciones[]
): FilaMostrable[] {
  const tipoPorBuque = new Map<string, string>();
  for (const f of historico) {
    if (f.buque && f.tipo_de_buque && !tipoPorBuque.has(f.buque.toLowerCase())) {
      tipoPorBuque.set(f.buque.toLowerCase(), f.tipo_de_buque);
    }
  }

  // Los proyectos que ya tienen una fila propia no se derivan: esa fila los
  // reemplaza.
  const conFilaPropia = new Set(
    historico.map((f) => f.proyecto_id).filter((id): id is string => id !== null)
  );

  const deLaTabla: FilaMostrable[] = historico
    .filter((f) => f.activa)
    .map((f) => ({
      ...f,
      origen: f.proyecto_id ? ("proyecto" as const) : ("historico" as const),
      href: f.proyecto_id ? `/proyectos/${f.proyecto_id}` : null,
    }));

  const deProyectos = proyectos
    .filter((p) => p.estado === "finalizado" && !conFilaPropia.has(p.id))
    .map((p) => filaDeProyecto(p, tipoPorBuque));

  // Lo mas reciente primero, que es como se lee un track record.
  return [...deLaTabla, ...deProyectos].sort(
    (a, b) =>
      (b.anio_hasta ?? b.anio_desde ?? 0) - (a.anio_hasta ?? a.anio_desde ?? 0) ||
      (b.anio_desde ?? 0) - (a.anio_desde ?? 0) ||
      (a.buque ?? "").localeCompare(b.buque ?? "", "es")
  );
}
