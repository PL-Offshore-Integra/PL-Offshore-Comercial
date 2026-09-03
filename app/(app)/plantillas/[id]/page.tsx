import { notFound } from "next/navigation";
import PlantillaForm from "@/components/PlantillaForm";
import { actualizarPlantilla, borrarPlantilla } from "@/app/(app)/plantillas/actions";
import { leerMaestroClientes } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import type { Plantilla, PlantillaTarifa } from "@/lib/types";

export default async function PlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("plantillas").select("*").eq("id", id).single();
  if (!data) notFound();
  const plantilla = data as Plantilla;

  const { data: filas } = await supabase
    .from("plantilla_tarifas")
    .select("*")
    .eq("plantilla_id", id)
    .order("orden", { ascending: true });
  const tarifas = (filas ?? []) as PlantillaTarifa[];

  const { empresas, contactos } = await leerMaestroClientes();

  const guardar = actualizarPlantilla.bind(null, plantilla.id);
  const eliminar = borrarPlantilla.bind(null, plantilla.id);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">{plantilla.nombre}</span>
        <form action={eliminar}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      <PlantillaForm
        action={guardar}
        plantilla={plantilla}
        tarifas={tarifas}
        empresas={empresas}
        contactos={contactos}
      />
    </div>
  );
}
