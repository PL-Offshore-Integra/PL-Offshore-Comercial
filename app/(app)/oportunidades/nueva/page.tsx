import OportunidadForm from "@/components/OportunidadForm";
import { createOportunidad } from "@/app/(app)/oportunidades/actions";
import { listarCentrosCosto } from "@/lib/centros";

export default async function NuevaOportunidadPage() {
  const centros = await listarCentrosCosto();
  return <OportunidadForm action={createOportunidad} centros={centros} />;
}
