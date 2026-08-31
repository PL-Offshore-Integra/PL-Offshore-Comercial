import { notFound } from "next/navigation";
import OportunidadForm from "@/components/OportunidadForm";
import { createClient } from "@/lib/supabase/server";
import { deleteOportunidad, updateOportunidad } from "@/app/(app)/oportunidades/actions";
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
      <div className="flex-between mb16">
        <span className="tag">
          {oportunidad.compania} &middot; {oportunidad.nombre_proyecto}
        </span>
        <form action={remove}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>
      <OportunidadForm action={update} oportunidad={oportunidad} />
    </div>
  );
}
