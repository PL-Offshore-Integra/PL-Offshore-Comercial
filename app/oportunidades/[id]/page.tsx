import { notFound } from "next/navigation";
import OportunidadForm from "@/components/OportunidadForm";
import { createClient } from "@/lib/supabase/server";
import { deleteOportunidad, updateOportunidad } from "@/app/oportunidades/actions";
import type { Oportunidad } from "@/lib/types";

export default async function EditarOportunidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("oportunidades").select("*").eq("id", id).single();

  if (!data) notFound();

  const oportunidad = data as Oportunidad;
  const update = updateOportunidad.bind(null, oportunidad.id);
  const remove = deleteOportunidad.bind(null, oportunidad.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {oportunidad.compania} - {oportunidad.nombre_proyecto}
        </h1>
        <form action={remove}>
          <button type="submit" className="text-sm text-red-600 hover:underline">
            Eliminar
          </button>
        </form>
      </div>
      <OportunidadForm action={update} oportunidad={oportunidad} />
    </div>
  );
}
