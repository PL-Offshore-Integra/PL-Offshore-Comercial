import Tablero from "@/components/Tablero";
import { hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import type {
  FacturaListada,
  Operacion,
  Oportunidad,
  ProyectoConOperaciones,
} from "@/lib/types";

// El tablero: las tres cosas que pasan en Comercial —oportunidades, proyectos
// y facturacion— en el orden en que pasan.
//
// Esta pagina solo trae los datos. El filtrado vive en el componente cliente:
// son cuatro consultas de pocas filas, asi que se traen enteras una vez y
// despues cambiar de año o de buque no vuelve al servidor.
//
// `hoy` se calcula aca a proposito: de eso depende que una factura este
// vencida, y el reloj de la maquina de quien mira no deberia poder cambiarlo.
export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: opp, error }, { data: proy }, { data: fact }, { data: sal }] =
    await Promise.all([
      supabase.from("oportunidades").select("*").order("valor", { ascending: false }),
      supabase.from("proyectos_con_operaciones").select("*"),
      supabase
        .from("facturas_listado")
        .select("*")
        .order("vencimiento", { ascending: true, nullsFirst: false }),
      supabase.from("operaciones").select("*").neq("estado", "cancelada"),
    ]);

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}.
        </div>
      )}

      <Tablero
        oportunidades={(opp ?? []) as Oportunidad[]}
        proyectos={(proy ?? []) as ProyectoConOperaciones[]}
        facturas={(fact ?? []) as FacturaListada[]}
        salidas={(sal ?? []) as Operacion[]}
        hoy={hoyEnArgentina()}
      />
    </div>
  );
}
