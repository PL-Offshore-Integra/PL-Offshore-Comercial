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

// Cómo se cobra. Determina qué conceptos tiene sentido cargar y cómo se
// calcula después el ingreso de cada operación.
export type EstructuraTarifaria =
  | "diaria"
  | "mov_desmov_garantizado"
  | "precio_cerrado"
  | "otra";

export const ESTRUCTURAS: { id: EstructuraTarifaria; label: string }[] = [
  { id: "diaria", label: "Tarifa diaria" },
  { id: "mov_desmov_garantizado", label: "Mov + desmov + dia garantizado" },
  { id: "precio_cerrado", label: "Precio cerrado" },
  { id: "otra", label: "Otra" },
];

export type Concepto =
  | "movilizacion"
  | "desmovilizacion"
  | "dia_garantizado"
  | "tarifa_diaria"
  | "tarifa_diferencial"
  | "standby"
  | "precio_cerrado"
  | "otro";

export type Unidad = "dia" | "hora" | "viaje" | "global";

export const CONCEPTOS: { id: Concepto; label: string; unidad: Unidad }[] = [
  { id: "movilizacion", label: "Movilizacion", unidad: "global" },
  { id: "desmovilizacion", label: "Desmovilizacion", unidad: "global" },
  { id: "dia_garantizado", label: "Dia garantizado", unidad: "dia" },
  { id: "tarifa_diaria", label: "Tarifa diaria", unidad: "dia" },
  { id: "tarifa_diferencial", label: "Tarifa diferencial", unidad: "hora" },
  { id: "standby", label: "Standby", unidad: "dia" },
  { id: "precio_cerrado", label: "Precio cerrado", unidad: "global" },
  { id: "otro", label: "Otro", unidad: "global" },
];

export const UNIDADES: { id: Unidad; label: string }[] = [
  { id: "dia", label: "por dia" },
  { id: "hora", label: "por hora" },
  { id: "viaje", label: "por viaje" },
  { id: "global", label: "global" },
];

// Que conceptos precarga cada estructura. Es una sugerencia, no un limite.
export const PRESET_TARIFAS: Record<EstructuraTarifaria, Concepto[]> = {
  diaria: ["tarifa_diaria"],
  mov_desmov_garantizado: [
    "movilizacion",
    "dia_garantizado",
    "tarifa_diferencial",
    "desmovilizacion",
  ],
  precio_cerrado: ["precio_cerrado"],
  otra: [],
};

export interface Oportunidad {
  id: string;
  compania: string;
  nombre_proyecto: string;
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
  // Cuando se haria el trabajo. Distinto de fecha_esperada_cierre, que es
  // cuando se define la venta.
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
}

// Un centro de costo de public.centros_costo. Para PL Offshore los centros
// SON los buques (mas oficina y astillero), asi que el desplegable de buque
// se alimenta de ahi en lugar de tener su propia lista.
export interface CentroCosto {
  id: string;
  codigo: string | null;
  nombre: string;
  activo: boolean;
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

// Sale de la vista comercial.clientes: una fila por contacto.
export interface Cliente {
  compania: string;
  contacto: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
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
