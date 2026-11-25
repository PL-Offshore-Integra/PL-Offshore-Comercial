import OportunidadesTabla from "@/components/OportunidadesTabla";
import { createClient } from "@/lib/supabase/server";
import { type Oportunidad } from "@/lib/types";

// El pipeline: lo que se cotizo y como salio.
//
// Esta pagina solo trae los datos. El filtrado y el agrupado por estado viven
// en el componente cliente, igual que en el Dashboard y en Clientes: son pocas
// filas, se traen enteras una vez y escribir en el buscador no vuelve al
// servidor.
//
// El orden de la consulta es el que se mantiene adentro de cada grupo: alta
// descendente.
export default async function OportunidadesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oportunidades")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  const oportunidades = (data ?? []) as Oportunidad[];

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}. Configura .env.local y corre las
          migraciones en supabase/migrations.
        </div>
      )}

      {!error && oportunidades.length === 0 && (
        <div className="empty-state">Todavia no hay oportunidades cargadas.</div>
      )}

      {oportunidades.length > 0 && <OportunidadesTabla oportunidades={oportunidades} />}
    </div>
  );
}
