export type EmpresaPropia = "Terra Mare" | "Clean Sea" | "Parana Logistica" | "HF Offshore";

export const EMPRESAS_PROPIAS: EmpresaPropia[] = [
  "Terra Mare",
  "Clean Sea",
  "Parana Logistica",
  "HF Offshore",
];

// ── ESTADO (0013) ─────────────────────────────────────────────────────────
//
// Reemplaza a los nueve estadios por tres estados. El resultado —ganado o
// perdido— solo existe cuando la oportunidad esta cerrada.
export type EstadoOportunidad = "abierto" | "en_curso" | "cerrado" | "cancelado";
export type ResultadoOportunidad = "ganado" | "perdido";

export const ESTADOS_OPORTUNIDAD: {
  id: EstadoOportunidad;
  label: string;
  color: string;
}[] = [
  { id: "abierto", label: "Abierto", color: "b-gray" },
  { id: "en_curso", label: "En curso", color: "b-blue" },
  { id: "cerrado", label: "Cerrado", color: "b-purple" },
  // Cancelado es estado y no resultado: una oportunidad que se cae antes de
  // definirse no se gano ni se perdio. Por eso no pide resultado ni
  // comentario, y se elige directo del desplegable.
  { id: "cancelado", label: "Cancelado", color: "b-amber" },
];

export const RESULTADOS: {
  id: ResultadoOportunidad;
  label: string;
  color: string;
}[] = [
  { id: "ganado", label: "Ganado", color: "b-green" },
  { id: "perdido", label: "Perdido", color: "b-red" },
];

// Como se muestra el estado en pantalla: una cerrada se nombra por su
// resultado, que es el dato que importa. Cerrada sin resultado es un
// "Cancelado" del modelo viejo.
export function etiquetaEstado(
  estado: EstadoOportunidad,
  resultado: ResultadoOportunidad | null
): { label: string; color: string } {
  if (estado !== "cerrado") {
    return ESTADOS_OPORTUNIDAD.find((e) => e.id === estado) ?? ESTADOS_OPORTUNIDAD[0];
  }
  return (
    RESULTADOS.find((r) => r.id === resultado) ?? { label: "Cerrado", color: "b-purple" }
  );
}

// Tipo de contratacion. No es una etiqueta: define que casilleros de monto
// aparecen y como se calcula el valor total.
//
//   Time Charter   se alquila el buque por tiempo. El total sale del daily
//                  hire por los dias mas mobilization y demobilization.
//   Voyage Charter se cierra un precio por el viaje. El total es la suma de
//                  los conceptos, sin multiplicar por dias.
//
// La columna en la base sigue llamandose `estructura_tarifaria`.
export type EstructuraTarifaria = "time_charter" | "voyage_charter";

export type Concepto =
  | "movilizacion"
  | "desmovilizacion"
  | "dia_garantizado"
  | "tarifa_diaria"
  | "tarifa_diferencial"
  | "standby"
  | "accommodation"
  | "demurrage"
  | "lump_sum"
  | "otro";

export type Unidad = "dia" | "hora" | "viaje" | "global";

// Accommodation no depende del tipo de contratacion: puede ir con Time
// Charter o con Voyage Charter. Vacio = no se cotizo.
//
// Standby dejo de estar aca: en Time Charter es "Stand by hire" y forma parte
// del tipo, asi que vive en CONTRATACIONES.
export const ADICIONALES: CampoTarifa[] = [
  { concepto: "accommodation", label: "Accommodation (por persona/dia)", unidad: "dia" },
];

// `concepto` y `unidad` son lo que se guarda; `label` es como se lo nombra en
// pantalla. Daily hire y tarifa diaria son el mismo concepto con dos nombres
// segun la estructura, asi que comparten el valor guardado.
export type CampoTarifa = { concepto: Concepto; label: string; unidad: Unidad };

export const CONTRATACIONES: {
  id: EstructuraTarifaria;
  label: string;
  campos: CampoTarifa[];
}[] = [
  {
    id: "time_charter",
    label: "Time Charter",
    campos: [
      { concepto: "tarifa_diaria", label: "Daily hire (por dia)", unidad: "dia" },
      { concepto: "movilizacion", label: "Mobilization", unidad: "global" },
      { concepto: "desmovilizacion", label: "Demobilization", unidad: "global" },
      { concepto: "standby", label: "Stand by hire (por dia)", unidad: "dia" },
    ],
  },
  {
    id: "voyage_charter",
    label: "Voyage Charter",
    campos: [
      { concepto: "lump_sum", label: "Lump sum", unidad: "global" },
      { concepto: "movilizacion", label: "Mobilization", unidad: "global" },
      { concepto: "desmovilizacion", label: "Demobilization", unidad: "global" },
      { concepto: "demurrage", label: "Demurrage (por dia)", unidad: "dia" },
    ],
  },
];

// Se deja el nombre viejo como alias: lo usan el formulario del proyecto y
// cualquier otro lugar que todavia hable de "estructura".
export const ESTRUCTURAS = CONTRATACIONES;

export function camposDe(estructura: EstructuraTarifaria): CampoTarifa[] {
  return CONTRATACIONES.find((e) => e.id === estructura)?.campos ?? [];
}

// El valor total de la propuesta se calcula, no se escribe. Vive aca para que
// el formulario y el servidor usen exactamente la misma cuenta: el formulario
// lo muestra en vivo y el servidor lo recalcula al guardar, que es el que
// manda.
//
//   Time Charter    daily hire × dias + mobilization + demobilization
//   Voyage Charter  lump sum + mobilization + demobilization
//
// Lo que queda AFUERA de las dos cuentas es lo contingente: stand by hire,
// demurrage y accommodation son montos por dia que solo se cobran si pasan.
// Sumarlos a un total seria mezclar unidades.
export function calcularValor(
  tipo: EstructuraTarifaria,
  montos: Partial<Record<Concepto, number>>,
  dias: number | null
): number {
  const m = (c: Concepto) => Number(montos[c] ?? 0) || 0;

  if (tipo === "time_charter") {
    const d = dias && dias > 0 ? dias : 0;
    return m("tarifa_diaria") * d + m("movilizacion") + m("desmovilizacion");
  }
  return m("lump_sum") + m("movilizacion") + m("desmovilizacion");
}

// Suma los dias a una fecha y devuelve el ultimo dia trabajado: arrancar el 1
// y durar 10 dias termina el 10, no el 11.
export function finEstimado(inicio: string, dias: number): string {
  const d = new Date(`${inicio}T00:00:00`);
  if (Number.isNaN(d.getTime()) || !dias || dias < 1) return "";
  d.setDate(d.getDate() + dias - 1);
  return d.toISOString().slice(0, 10);
}

export interface Oportunidad {
  id: string;
  compania: string;
  // Deja de pedirse en el formulario (0004). Las filas del tracker original
  // lo conservan.
  nombre_proyecto: string | null;
  alcance_oportunidad: string | null;
  descripcion_alcance: string | null;
  nro_oportunidad: string | null;
  contacto: string | null;

  // --- 0013 ---
  // `estadio` (los nueve viejos) queda en la base con lo que tenia y la app ya
  // no lo escribe. Manda `estado`, y `resultado` solo cuando esta cerrada.
  estado: EstadoOportunidad;
  resultado: ResultadoOportunidad | null;
  // Un solo campo de texto: reemplaza a notas, referencias y proximos_pasos,
  // que quedaron en la base con su contenido. Es lo que se ve en la lista, y
  // es donde va el motivo cuando se pierde.
  comentarios: string | null;
  // La persona pone los dias y el fin estimado se calcula.
  duracion_estimada_dias: number | null;

  // --- 0015 ---
  // En que moneda se cotiza. El proyecto la hereda al convertirse.
  moneda: Moneda;

  valor: number;
  costo: number;
  fecha_creacion: string;
  fecha_esperada_cierre: string | null;
  empresa: EmpresaPropia;
  last_interacted_on: string | null;
  proximos_pasos: string | null;
  notas: string | null;
  referencias: string | null;
  created_at: string;
  updated_at: string;

  // --- 0002 · el puente con el resto de Integra ---
  // Para quien es el trabajo, cuando no es el mismo que firma.
  cliente_final: string | null;
  buque: string | null;
  estructura_tarifaria: EstructuraTarifaria;
  motivo_perdida: string | null;
  competidor: string | null;
  // Se llena al ganar. Apunta a public.proyectos, el maestro que leen
  // Compras, Viveres, Reparaciones y Finanzas.
  proyecto_id: string | null;

  // --- 0003 · como la carga PL Offshore ---
  // `contacto` es el nombre de la persona; el mail y el telefono tienen
  // columna propia (en el tracker original venian mezclados en `contacto`).
  contacto_email: string | null;
  contacto_telefono: string | null;
  contacto_linkedin: string | null;

  // --- 0009 · el maestro de clientes ---
  // Manda el FK. Las columnas de texto de arriba (compania, contacto, mail,
  // telefono, linkedin) son la foto del momento en que se cargo: si la empresa
  // se renombra, la oportunidad vieja conserva el nombre con el que se firmo.
  cliente_empresa_id: string | null;
  cliente_contacto_id: string | null;

  // Cuando se haria el trabajo. Distinto de fecha_esperada_cierre, que es
  // cuando se define la venta.
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
}

export interface Adjunto {
  id: string;
  oportunidad_id: string;
  nombre: string;
  path: string;
  tipo: string | null;
  tamano_bytes: number | null;
  created_at: string;
}

// El maestro de clientes (0009). Dos niveles: la empresa se firma, la persona
// se llama por telefono.
export interface ClienteEmpresa {
  id: string;
  nombre: string;
  notas: string | null;
  created_at: string;
}

export interface ClienteContacto {
  id: string;
  empresa_id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  linkedin: string | null;
  cargo: string | null;
  notas: string | null;
  created_at: string;
}

// Sale de la vista comercial.clientes: una fila por contacto, mas una fila por
// empresa que todavia no tiene ninguno.
export interface Cliente {
  empresa_id: string;
  compania: string;
  contacto_id: string | null;
  contacto: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  contacto_linkedin: string | null;
  contacto_cargo: string | null;
  oportunidades: number;
  ganadas: number;
  perdidas: number;
  abiertas: number;
  valor_total: number | null;
  ultimo_contacto: string | null;
  ultima_oportunidad: string | null;
}

export interface Tarifa {
  id: string;
  oportunidad_id: string;
  concepto: Concepto;
  detalle: string | null;
  unidad: Unidad;
  monto: number;
  cantidad: number | null;
  aplica_desde_horas: number | null;
  orden: number;
  created_at: string;
}

export interface Evento {
  id: string;
  fecha: string;
  evento: string;
  lugar: string | null;
  referencias: string | null;
  participa_terra_mare: boolean;
  participa_clean_sea: boolean;
  participa_parana_logistica: boolean;
  created_at: string;
}

export interface Minuta {
  id: string;
  evento_id: string | null;
  titulo: string;
  lugar: string | null;
  fecha: string;
  participantes: string | null;
  oportunidades_relacionadas: string | null;
  contenido: string | null;
  acciones: string | null;
  created_at: string;
}

// ── PROYECTOS (0012) ──────────────────────────────────────────────────────
//
// OJO: `comercial.proyectos` NO es `public.proyectos`, el maestro de Integra
// que leen Finanzas, Compras, Viveres y Reparaciones. Son dos cosas distintas
// y hoy no se tocan entre si.

export type Moneda = "USD" | "ARS";
export type Iva = "21" | "exento";
export type EstadoProyecto = "por_arrancar" | "en_curso" | "finalizado" | "cancelado";

export const MONEDAS: { id: Moneda; label: string }[] = [
  { id: "USD", label: "Dolares (USD)" },
  { id: "ARS", label: "Pesos argentinos (ARS)" },
];

export const IVAS: { id: Iva; label: string }[] = [
  { id: "21", label: "21%" },
  { id: "exento", label: "Exento" },
];

export const ESTADOS_PROYECTO: { id: EstadoProyecto; label: string; color: string }[] = [
  { id: "por_arrancar", label: "Por arrancar", color: "b-amber" },
  { id: "en_curso", label: "En curso", color: "b-blue" },
  { id: "finalizado", label: "Finalizado", color: "b-green" },
  { id: "cancelado", label: "Cancelado", color: "b-gray" },
];

export interface Proyecto {
  id: string;
  nro_proyecto: string | null;
  nombre: string;
  oportunidad_id: string | null;

  cliente_empresa_id: string | null;
  cliente_contacto_id: string | null;
  compania: string | null;
  contacto: string | null;

  buque: string | null;
  descripcion: string | null;
  alcance: string | null;

  // Las estimadas vienen de la oportunidad; las reales se cargan cuando pasan.
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;

  moneda: Moneda;
  iva: Iva;
  estructura_tarifaria: EstructuraTarifaria;
  valor: number;

  estado: EstadoProyecto;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProyectoTarifa {
  id: string;
  proyecto_id: string;
  concepto: Concepto;
  detalle: string | null;
  unidad: Unidad;
  monto: number;
  cantidad: number | null;
  aplica_desde_horas: number | null;
  orden: number;
  created_at: string;
}

export interface ProyectoAdjunto {
  id: string;
  proyecto_id: string;
  // El contrato firmado se guarda aparte del resto: es el documento que se
  // busca, no uno mas de la pila.
  clase: "contrato" | "otro";
  nombre: string;
  path: string;
  tipo: string | null;
  tamano_bytes: number | null;
  created_at: string;
}
