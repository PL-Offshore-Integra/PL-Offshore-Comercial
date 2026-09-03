export type EmpresaPropia = "Terra Mare" | "Clean Sea" | "Parana Logistica" | "HF Offshore";

export const EMPRESAS_PROPIAS: EmpresaPropia[] = [
  "Terra Mare",
  "Clean Sea",
  "Parana Logistica",
  "HF Offshore",
];

// ── ESTADO (0016) ─────────────────────────────────────────────────────────
//
// Un solo campo con tres valores. Antes eran dos —estado mas resultado— para
// decir una sola cosa.
//
//   en_curso     esta viva
//   adjudicado   nos la dieron. Dispara la creacion del proyecto.
//   cancelado    no va. Pide comentario, y ese comentario es el que se lee
//                en el listado.
//
// Adjudicado y cancelado son finales. Cancelado absorbio a lo que antes era
// "perdido": la diferencia entre que se la den a otro y que el trabajo no se
// haga queda escrita en el comentario, no en una columna.
export type EstadoOportunidad = "en_curso" | "adjudicado" | "cancelado";

// El resultado del modelo viejo. La columna sigue en la base con lo que
// tenia, pero la app no la escribe ni la lee mas.
export type ResultadoOportunidad = "ganado" | "perdido";

export const ESTADOS_OPORTUNIDAD: {
  id: EstadoOportunidad;
  label: string;
  color: string;
}[] = [
  { id: "en_curso", label: "En curso", color: "b-blue" },
  { id: "adjudicado", label: "Adjudicado", color: "b-green" },
  { id: "cancelado", label: "Cancelado", color: "b-red" },
];

// El estado alcanza para nombrarse solo. Se conserva la funcion porque la
// usan las tres pantallas, y porque devolver algo razonable ante un valor
// viejo en la base es mejor que no pintar nada.
export function etiquetaEstado(estado: string): { label: string; color: string } {
  return (
    ESTADOS_OPORTUNIDAD.find((e) => e.id === estado) ?? {
      label: estado.replace(/_/g, " "),
      color: "b-gray",
    }
  );
}

// Tipo de contratacion. No es una etiqueta: define que casilleros de monto
// aparecen y como se calcula el valor total.
//
//   Time Charter     se alquila el buque por tiempo. El total sale del daily
//                    hire por los dias mas mobilization y demobilization.
//   Voyage Charter   se cierra un precio por el viaje. El total es la suma de
//                    los conceptos, sin multiplicar por dias.
//   Dia garantizado  las primeras 24 h se cobran a una tarifa y lo que pasa
//                    de ahi a otra, pro rata. Es como se cobra el Golondrina
//                    con Service Management (0019).
//
// La columna en la base sigue llamandose `estructura_tarifaria`.
export type EstructuraTarifaria = "time_charter" | "voyage_charter" | "dia_garantizado";

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
  {
    id: "dia_garantizado",
    label: "Dia garantizado",
    campos: [
      {
        concepto: "dia_garantizado",
        label: "Dia garantizado (las primeras 24 h)",
        unidad: "dia",
      },
      {
        concepto: "tarifa_diferencial",
        label: "Tarifa diferencial (por dia, pasadas las 24 h)",
        unidad: "dia",
      },
      { concepto: "movilizacion", label: "Mobilization", unidad: "global" },
      { concepto: "desmovilizacion", label: "Demobilization", unidad: "global" },
    ],
  },
];

// Se deja el nombre viejo como alias: lo usan el formulario del proyecto y
// cualquier otro lugar que todavia hable de "estructura".
export const ESTRUCTURAS = CONTRATACIONES;

export function camposDe(estructura: EstructuraTarifaria): CampoTarifa[] {
  return CONTRATACIONES.find((e) => e.id === estructura)?.campos ?? [];
}

// Normaliza lo que llega de un formulario a un tipo valido.
//
// Vive aca porque lo necesitan las tres acciones —oportunidad, proyecto y
// operacion— y antes cada una hacia algo distinto: una dejaba pasar cualquier
// texto, otra convertia todo lo que no fuera voyage_charter en time_charter
// (que con `dia_garantizado` daba un precio equivocado, no un error) y la
// tercera defaulteaba a 'diaria', un valor del modelo viejo que 0019 dejo de
// aceptar. Una sola funcion y las tres coinciden.
export function estructuraValida(valor: string | null): EstructuraTarifaria {
  return CONTRATACIONES.some((c) => c.id === valor)
    ? (valor as EstructuraTarifaria)
    : "time_charter";
}

// El valor total de la propuesta se calcula, no se escribe. Vive aca para que
// el formulario y el servidor usen exactamente la misma cuenta: el formulario
// lo muestra en vivo y el servidor lo recalcula al guardar, que es el que
// manda.
//
//   Time Charter     daily hire × dias + mobilization + demobilization
//   Voyage Charter   lump sum + mobilization + demobilization
//   Dia garantizado  dia garantizado + (dias − 1) × tarifa diferencial
//                    + mobilization + demobilization
//
// La tercera es la del Golondrina, y la fraccion importa: una salida de 29 h
// son 1,21 dias, y esas 0,21 jornadas de mas se cobran pro rata. Verificada
// contra el calculo de RAIZEN AGO2026, da 59.135,43 al centavo.
//
// Lo que queda AFUERA de las tres cuentas es lo contingente: stand by hire,
// demurrage y accommodation son montos por dia que solo se cobran si pasan.
// Sumarlos a un total seria mezclar unidades.
export function calcularValor(
  tipo: EstructuraTarifaria,
  montos: Partial<Record<Concepto, number>>,
  dias: number | null
): number {
  const m = (c: Concepto) => Number(montos[c] ?? 0) || 0;
  const d = dias && dias > 0 ? dias : 0;
  const mobDesmob = m("movilizacion") + m("desmovilizacion");

  if (tipo === "time_charter") {
    return m("tarifa_diaria") * d + mobDesmob;
  }
  if (tipo === "dia_garantizado") {
    // El dia garantizado se cobra entero aunque la salida dure menos: es lo
    // que garantiza. Lo que pasa de las 24 h va a la tarifa diferencial.
    return m("dia_garantizado") + Math.max(d - 1, 0) * m("tarifa_diferencial") + mobDesmob;
  }
  return m("lump_sum") + mobDesmob;
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

  // --- 0013 / 0016 ---
  // Manda `estado`, con sus tres valores. Las dos columnas que lo precedieron
  // quedan en la base con lo que tenian y la app no las escribe: `estadio`
  // (los nueve viejos, 0013) y `resultado` (ganado / perdido, 0016).
  estado: EstadoOportunidad;
  resultado: ResultadoOportunidad | null;
  // Un solo campo de texto: reemplaza a notas, referencias y proximos_pasos,
  // que quedaron en la base con su contenido. Es lo que se ve en la lista, y
  // es donde va el motivo cuando se cancela.
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
  // Los tres contadores de la vista, uno por estado (0016).
  en_curso: number;
  adjudicadas: number;
  canceladas: number;
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

  // Dos clientes distintos: `compania` es quien contrata y paga, y
  // `cliente_final` para quien es el trabajo. Service Management contrata el
  // buque, pero el trabajo es para Raizen (0017).
  cliente_empresa_id: string | null;
  cliente_contacto_id: string | null;
  compania: string | null;
  contacto: string | null;
  cliente_final: string | null;

  buque: string | null;
  descripcion: string | null;
  alcance: string | null;

  // Las estimadas vienen de la oportunidad; las reales se cargan cuando pasan.
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
  // Las fechas reales no viven aca desde 0018: son la primera y la ultima
  // operacion. Service Management no arranca ni termina; cada una de sus
  // salidas si.

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

// ── OPERACIONES (0018) ────────────────────────────────────────────────────
//
// El tercer eje del modelo de Integra: la salida concreta. El proyecto dice
// para quien se trabaja; la operacion, cuando se salio y cuanto se cobra.
//
// Service Management es un proyecto de anios; "RAIZEN AGO2026 SEAWAYS BALBOA"
// es una de sus operaciones, de dos dias.
export type EstadoOperacion = "planificada" | "en_curso" | "finalizada" | "cancelada";

export const ESTADOS_OPERACION: { id: EstadoOperacion; label: string; color: string }[] = [
  { id: "planificada", label: "Planificada", color: "b-gray" },
  { id: "en_curso", label: "En curso", color: "b-blue" },
  { id: "finalizada", label: "Finalizada", color: "b-green" },
  { id: "cancelada", label: "Cancelada", color: "b-red" },
];

export interface Operacion {
  id: string;
  nro_operacion: string | null;
  nombre: string;
  proyecto_id: string;

  // Que buque salio de verdad, y para quien fue este trabajo. Los dos pueden
  // cambiar entre una salida y otra del mismo proyecto.
  buque: string | null;
  cliente_final: string | null;
  zona: string | null;
  buque_madre: string | null;

  // timestamptz, no date: el calculo es por dia fraccionado y las horas
  // deciden cuanto se cobra.
  fecha_inicio: string | null;
  fecha_fin: string | null;

  moneda: Moneda;
  iva: Iva;
  estructura_tarifaria: EstructuraTarifaria;
  valor: number;

  estado: EstadoOperacion;
  comentarios: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperacionTarifa {
  id: string;
  operacion_id: string;
  concepto: Concepto;
  detalle: string | null;
  unidad: Unidad;
  monto: number;
  cantidad: number | null;
  aplica_desde_horas: number | null;
  orden: number;
  created_at: string;
}

export interface OperacionAdjunto {
  id: string;
  operacion_id: string;
  // Los dos documentos que se arman por salida y se le mandan al cliente para
  // que de el OK: el calculo de la tarifa y el statement of facts.
  clase: "calculo" | "sof" | "otro";
  nombre: string;
  path: string;
  tipo: string | null;
  tamano_bytes: number | null;
  created_at: string;
}

// Un proyecto con lo que dicen sus operaciones (vista de 0018).
export interface ProyectoConOperaciones extends Proyecto {
  operaciones: number;
  operaciones_en_curso: number;
  arranco: string | null;
  termino: string | null;
  // Lo ejecutado: la suma de las salidas que no se cancelaron. Distinto de
  // `valor`, que es lo acordado.
  valor_ejecutado: number;
}

// Los dias que duro una salida, con decimales: de 20/08 07:00 a 21/08 12:30
// son 1.23 dias, y esa fraccion es la que se cobra pro rata.
export function diasDeOperacion(inicio: string | null, fin: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = new Date(inicio).getTime();
  const b = new Date(fin).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return (b - a) / (1000 * 60 * 60 * 24);
}
