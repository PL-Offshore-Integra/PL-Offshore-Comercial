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
