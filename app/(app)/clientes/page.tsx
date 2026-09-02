import Link from "next/link";
import ClientesTabla from "@/components/ClientesTabla";
import { leerMaestroClientes } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("compania", { ascending: true });

  const filas = (data ?? []) as Cliente[];
  const { empresas } = await leerMaestroClientes();

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
        Este es el maestro de clientes: se carga acá o desde el formulario de una
        oportunidad, que toma la empresa y el contacto de esta misma lista. Los
        contadores de oportunidades, en cambio, salen de las oportunidades
        cargadas.
      </div>

      {/* La tabla, los filtros y los cuadros de dialogo van del lado del
          cliente; las consultas, de este. Con la base vacia se muestra igual:
          los botones para cargar la primera empresa estan ahi. */}
      {!error && <ClientesTabla filas={filas} empresas={empresas} />}

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
