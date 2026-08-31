import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("oportunidades").select("*");
  const oportunidades = (data ?? []) as Oportunidad[];

  const porEmpresa = new Map<string, number>();
  const porProyecto = new Map<string, number>();
  let total = 0;

  for (const o of oportunidades) {
    const ganancia = o.valor - o.costo;
    total += ganancia;
    porEmpresa.set(o.empresa, (porEmpresa.get(o.empresa) ?? 0) + ganancia);
    porProyecto.set(o.nombre_proyecto, (porProyecto.get(o.nombre_proyecto) ?? 0) + ganancia);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      {error && (
        <p className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar Supabase todavia: {error.message}.
        </p>
      )}

      <div className="mb-8 rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Ganancia total (suma de valor - costo)</p>
        <p className="text-3xl font-semibold">{currency.format(total)}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Por empresa propia
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {[...porEmpresa.entries()].map(([empresa, ganancia]) => (
                <tr key={empresa}>
                  <td className="py-2">{empresa}</td>
                  <td className="py-2 text-right">{currency.format(ganancia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Por proyecto
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {[...porProyecto.entries()].map(([proyecto, ganancia]) => (
                <tr key={proyecto}>
                  <td className="py-2">{proyecto}</td>
                  <td className="py-2 text-right">{currency.format(ganancia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
