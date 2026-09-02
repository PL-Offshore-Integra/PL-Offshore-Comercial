export type EmpresaPropia = "Terra Mare" | "Clean Sea" | "Parana Logistica" | "HF Offshore";

export const EMPRESAS_PROPIAS: EmpresaPropia[] = [
  "Terra Mare",
  "Clean Sea",
  "Parana Logistica",
  "HF Offshore",
];

export type Estadio =
  | "Investigando"
  | "Lead"
  | "Contacto"
  | "Pedido de Cotizacion"
  | "Qualified"
  | "Propuesta Enviada"
  | "Ganado"
  | "Perdido"
  | "Cancelado";

export const ESTADIOS: { estadio: Estadio; probabilidad: number }[] = [
  { estadio: "Investigando", probabilidad: 0 },
  { estadio: "Lead", probabilidad: 0.05 },
  { estadio: "Contacto", probabilidad: 0.1 },
  { estadio: "Pedido de Cotizacion", probabilidad: 0.05 },
  { estadio: "Qualified", probabilidad: 0.25 },
  { estadio: "Propuesta Enviada", probabilidad: 0.5 },
  { estadio: "Ganado", probabilidad: 1 },
  { estadio: "Perdido", probabilidad: 0 },
  { estadio: "Cancelado", probabilidad: 0 },
];

// Como se cotiza. No es una etiqueta: define exactamente que casilleros de
// monto aparecen en el formulario. Elegir "Daily Hire + Mobilization +
// Demobilization" hace aparecer esos tres y ningun otro.
export type EstructuraTarifaria =
  | "diaria"
  | "daily_hire_mob_desmob"
  | "lump_sum"
  | "otra";

export type Concepto =
  | "movilizacion"
  | "desmovilizacion"
  | "dia_garantizado"
  | "tarifa_diaria"
  | "tarifa_diferencial"
  | "standby"
  | "lump_sum"
  | "otro";

export type Unidad = "dia" | "hora" | "viaje" | "global";

// `concepto` y `unidad` son lo que se guarda; `label` es como se lo nombra en
// pantalla. Daily hire y tarifa diaria son el mismo concepto con dos nombres
// segun la estructura, asi que comparten el valor guardado.
export type CampoTarifa = { concepto: Concepto; label: string; unidad: Unidad };

export const ESTRUCTURAS: {
  id: EstructuraTarifaria;
  label: string;
  campos: CampoTarifa[];
}[] = [
  {
    id: "diaria",
    label: "Tarifa diaria",
    campos: [{ concepto: "tarifa_diaria", label: "Valor de la tarifa diaria", unidad: "dia" }],
  },
  {
    id: "daily_hire_mob_desmob",
    label: "Daily Hire + Mobilization + Demobilization",
    campos: [
      { concepto: "tarifa_diaria", label: "Daily hire", unidad: "dia" },
      { concepto: "movilizacion", label: "Mobilization", unidad: "global" },
      { concepto: "desmovilizacion", label: "Demobilization", unidad: "global" },
    ],
  },
  {
    id: "lump_sum",
    label: "Lump Sum",
    campos: [{ concepto: "lump_sum", label: "Lump sum", unidad: "global" }],
  },
  {
    id: "otra",
    label: "Otra",
    campos: [{ concepto: "otro", label: "Monto", unidad: "global" }],
  },
];

export function camposDe(estructura: EstructuraTarifaria): CampoTarifa[] {
  return ESTRUCTURAS.find((e) => e.id === estructura)?.campos ?? [];
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
  estadio: Estadio;
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
