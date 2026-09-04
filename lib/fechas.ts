// Las horas de una operacion, sin que se corran tres horas en el camino.
//
// El problema que esto resuelve: el <input type="datetime-local"> entrega
// "2026-08-20T07:00" sin zona. Si eso se guarda tal cual en un timestamptz,
// Postgres lo interpreta en la zona de la base —UTC— y despues el navegador lo
// vuelve a convertir a hora local, asi que 07:00 se mostraba como 04:00.
// Medido, no supuesto: la primera carga de RAIZEN AGO2026 entro a las 07:00 y
// el listado mostraba 04:00.
//
// Tres horas de corrimiento no son un detalle cosmetico: de la hora sale la
// fraccion de dia que se cobra, y una salida que arranca a las 04:00 en vez de
// las 07:00 tiene otra duracion y otro precio.
//
// La solucion es fijar la zona en un solo lugar. Las operaciones son en el
// Atlantico Sur y se registran en hora argentina, que no tiene horario de
// verano: el offset es -03:00 siempre. Guardar y mostrar pasan siempre por
// aca, asi que la hora que se escribe es la que se lee, en cualquier maquina.

export const ZONA = "America/Argentina/Buenos_Aires";
const OFFSET = "-03:00";

// De lo que manda el formulario ("2026-08-20T07:00") a lo que se guarda
// ("2026-08-20T07:00:00-03:00"). Sin el offset, Postgres asumiria UTC.
export function aTimestamp(local: string | null): string | null {
  if (!local) return null;
  const conSegundos = local.length === 16 ? `${local}:00` : local;
  // Si ya trae zona —una +, o una - despues de la T— se respeta.
  if (/[+-]\d{2}:\d{2}$/.test(conSegundos) || conSegundos.endsWith("Z")) {
    return conSegundos;
  }
  return `${conSegundos}${OFFSET}`;
}

// Una fecha sola —"2026-08-20", como las estimadas del proyecto, que son
// `date` y no `timestamptz`— no es un instante y no hay que convertirla. Si se
// la pasa por una zona, `new Date("2026-08-20")` da medianoche UTC y en hora
// argentina eso es el 19 a las 21:00: un dia menos. Se detecta y se lee tal
// cual.
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

// Las partes de un instante, leidas en hora argentina y no en la del que mira.
function partes(iso: string): Record<string, string> | null {
  const sola = SOLO_FECHA.exec(iso);
  if (sola) {
    return {
      year: sola[1],
      month: sola[2],
      day: sola[3],
      hour: "00",
      minute: "00",
    };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  // A las 24:00 las devuelve algun motor en vez de 00:00.
  if (out.hour === "24") out.hour = "00";
  return out;
}

// De lo guardado al valor que quiere el <input type="datetime-local">.
export function aInputLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = partes(iso);
  if (!p) return "";
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Para mostrar: dd/mm/aaaa hh:mm, en hora argentina.
export function fechaHoraLegible(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = partes(iso);
  if (!p) return "—";
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

// Para mostrar solo el dia.
export function fechaLegible(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = partes(iso);
  if (!p) return "—";
  return `${p.day}/${p.month}/${p.year}`;
}

// Los dias de una salida, con los decimales justos y sin ceros de relleno:
// 1,2292, no 1,229167 ni 1,23. Es el numero que se controla renglon por
// renglon contra la planilla, asi que redondearlo a dos decimales lo vuelve
// incontrolable: 1,23 dias por 15.369,50 no da lo que dice la planilla.
//
// Con coma decimal, como el resto de los numeros de la pantalla.
export function diasLegibles(dias: number): string {
  return dias.toFixed(4).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

// Una fecha con su hora si la tiene, y solo la fecha si es un `date` pelado.
//
// Sirve para las columnas donde el dato puede venir de dos lados: en el
// listado de proyectos, Inicio y Fin salen de la primera y la ultima salida
// —que son timestamptz y llevan hora, y la hora es la que define el precio— o
// de las fechas estimadas del proyecto, que son `date` y no tienen hora que
// mostrar.
export function fechaConHoraSiTiene(iso: string | null | undefined): string {
  if (!iso) return "—";
  return SOLO_FECHA.test(iso) ? fechaLegible(iso) : fechaHoraLegible(iso);
}

// El dia de hoy en hora argentina, como "aaaa-mm-dd".
//
// Hace falta para decidir si una factura esta vencida. `new Date()` del lado
// del servidor puede estar en UTC, y a las 22:00 de aca ya es el dia siguiente
// alla: una factura que vence hoy apareceria vencida tres horas antes de
// tiempo. Se compara texto contra texto, que en formato ISO ordena igual que
// la fecha.
export function hoyEnArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // en-CA da "2026-09-04", justo el formato que se necesita.
  return partes;
}

// Los dias entre dos fechas sueltas ("aaaa-mm-dd"), sin horas en el medio.
// Positivo si la segunda es posterior.
export function diasEntre(desde: string | null, hasta: string | null): number | null {
  if (!desde || !hasta) return null;
  const a = Date.parse(`${desde.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${hasta.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// Suma dias a una fecha suelta y devuelve "aaaa-mm-dd". Se usa para proponer
// el vencimiento: fecha + los dias de pago del cliente.
export function sumarDias(fecha: string | null, dias: number | null): string {
  if (!fecha || dias === null || !Number.isFinite(dias)) return "";
  const base = Date.parse(`${fecha.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(base)) return "";
  return new Date(base + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// La fecha con hora, salvo que la hora sea medianoche.
//
// Las salidas cargadas de la planilla de 2026 no tienen hora —la planilla
// tiene fechas sueltas— y quedaron en 00:00. En un documento que se le manda
// al cliente, "14/03/2026 00:00" dice una precision que no existe. Las que si
// tienen hora, como el STS de agosto (07:00 a 12:30), la muestran: de la hora
// sale el precio.
export function fechaHoraSiLaTiene(iso: string | null | undefined): string {
  if (!iso) return "—";
  const conHora = fechaHoraLegible(iso);
  return conHora.endsWith(" 00:00") ? conHora.slice(0, -6) : conHora;
}
