import Link from "next/link";
import ClientesTabla from "@/components/ClientesTabla";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("compania", { ascending: true });

  const filas = (data ?? []) as Cliente[];

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo leer la base de clientes: {error.message}. Si dice que la
          relación no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0003_oportunidades_pl.sql</span>.
        </div>
      )}

      <div className="info-box accent mb16">
        Esta pantalla no se carga a mano: sale de las oportunidades. La compañía,
        el nombre del contacto, el mail y el teléfono se toman de cada
        oportunidad que das de alta. Para corregir un dato, se corrige en la
        oportunidad.
      </div>

      {!error && filas.length === 0 ? (
        <div className="empty-state">
          Todavía no hay clientes. Cargá una oportunidad y aparecen acá.
        </div>
      ) : (
        // La tabla y los filtros van del lado del cliente; la consulta, de este.
        <ClientesTabla filas={filas} />
      )}

      {filas.length > 0 && (
        <div className="mt16">
          <Link href="/oportunidades" className="btn btn-ghost btn-sm">
            Ver las oportunidades
          </Link>
        </div>
      )}
    </div>
  );
}
