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

export const SECCIONES_TR: { id: SeccionTR; label: string; sub: string }[] = [
  {
    id: "chartering",
    label: "Chartering",
    sub: "Trabajos con buques propios",
  },
  {
    id: "charter_in",
    label: "Charter-in",
    sub: "Buques tomados de terceros",
  },
  {
    id: "management",
    label: "Management",
    sub: "Crew management y procurement",
  },
];

export interface FilaTrackRecord {
  id: string;
  seccion: SeccionTR;
  buque: string | null;
  tipo_de_buque: string | null;
  armador: string | null;
  cliente: string | null;
  region: string | null;
  periodo: string | null;
  alcance: string | null;
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
// leen igual que las historicas.
export function valorComoElDocumento(valor: number | null): string | null {
  if (valor === null || !Number.isFinite(valor) || valor <= 0) return null;
  const millones = valor / 1e6;
  const decimales = millones < 0.1 ? 2 : 1;
  return `~${millones.toFixed(decimales).replace(".", ",")} million`;
}

// El periodo con las palabras del documento: dias hasta 60, y despues meses.
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
    alcance: p.descripcion ?? p.nombre,
    anio_desde: anioDe(desde),
    anio_hasta: anioDe(hasta),
    valor_usd: valor,
    valor_texto: valorComoElDocumento(valor),
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
