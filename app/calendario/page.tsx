import { createClient } from "@/lib/supabase/server";
import type { Evento } from "@/lib/types";
import { createEvento } from "./actions";

function diasRestantes(fecha: string): string {
  const dias = Math.ceil(
    (new Date(fecha).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );
  if (dias < 0) return "ya paso";
  if (dias <= 30) return `${dias} dias`;
  if (dias <= 60) return "a menos de 60 dias";
  return "mas de 60 dias";
}

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("eventos").select("*").order("fecha");
  const eventos = (data ?? []) as Evento[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Calendario de Ferias</h1>

      {error && (
        <p className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar Supabase todavia: {error.message}.
        </p>
      )}

      <div className="mb-8 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Evento</th>
              <th className="px-4 py-2">Lugar</th>
              <th className="px-4 py-2">Cuanto falta</th>
              <th className="px-4 py-2">Terra Mare</th>
              <th className="px-4 py-2">Clean Sea</th>
              <th className="px-4 py-2">Parana Logistica</th>
              <th className="px-4 py-2">Referencias</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {eventos.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{e.fecha}</td>
                <td className="px-4 py-2 font-medium">{e.evento}</td>
                <td className="px-4 py-2">{e.lugar ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500">{diasRestantes(e.fecha)}</td>
                <td className="px-4 py-2">{e.participa_terra_mare ? "Si" : "-"}</td>
                <td className="px-4 py-2">{e.participa_clean_sea ? "Si" : "-"}</td>
                <td className="px-4 py-2">{e.participa_parana_logistica ? "Si" : "-"}</td>
                <td className="px-4 py-2">
                  {e.referencias ? (
                    <a
                      href={e.referencias}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      link
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="max-w-2xl">
        <h2 className="mb-3 text-lg font-semibold">Nuevo evento</h2>
        <form action={createEvento} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              name="fecha"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Evento</label>
            <input
              name="evento"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Lugar</label>
            <input
              name="lugar"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Referencias (URL)</label>
            <input
              name="referencias"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2 flex gap-6 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="participa_terra_mare" /> Terra Mare
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="participa_clean_sea" /> Clean Sea
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="participa_parana_logistica" /> Parana Logistica
            </label>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Agregar evento
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
