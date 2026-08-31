import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

const ESTADIO_ORDEN = [
  "Investigando",
  "Lead",
  "Contacto",
  "Pedido de Cotizacion",
  "Qualified",
  "Propuesta Enviada",
  "Ganado",
  "Perdido",
  "Cancelado",
];

export default async function OportunidadesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oportunidades")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  const oportunidades = (data ?? []) as Oportunidad[];
  const grupos = ESTADIO_ORDEN.map((estadio) => ({
    estadio,
    items: oportunidades.filter((o) => o.estadio === estadio),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Oportunidades</h1>
        <Link
          href="/oportunidades/nueva"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Nueva oportunidad
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar Supabase todavia: {error.message}. Configura .env.local y corre las
          migraciones en supabase/migrations.
        </p>
      )}

      {!error && oportunidades.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay oportunidades cargadas.</p>
      )}

      <div className="space-y-8">
        {grupos.map((grupo) => (
          <section key={grupo.estadio}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {grupo.estadio} ({grupo.items.length})
            </h2>
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Compania</th>
                    <th className="px-4 py-2">Proyecto</th>
                    <th className="px-4 py-2">Alcance</th>
                    <th className="px-4 py-2">Empresa</th>
                    <th className="px-4 py-2">Valor</th>
                    <th className="px-4 py-2">Ganancia</th>
                    <th className="px-4 py-2">Cierre esperado</th>
                    <th className="px-4 py-2">Proximos pasos</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grupo.items.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{o.compania}</td>
                      <td className="px-4 py-2">{o.nombre_proyecto}</td>
                      <td className="px-4 py-2 text-gray-500">{o.alcance_oportunidad ?? "-"}</td>
                      <td className="px-4 py-2">{o.empresa}</td>
                      <td className="px-4 py-2">{currency.format(o.valor)}</td>
                      <td className="px-4 py-2">{currency.format(o.valor - o.costo)}</td>
                      <td className="px-4 py-2">{o.fecha_esperada_cierre ?? "-"}</td>
                      <td className="px-4 py-2 text-gray-500">{o.proximos_pasos ?? "-"}</td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/oportunidades/${o.id}`} className="text-gray-600 hover:underline">
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
