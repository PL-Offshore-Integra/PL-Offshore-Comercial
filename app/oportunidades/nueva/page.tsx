import OportunidadForm from "@/components/OportunidadForm";
import { createOportunidad } from "@/app/oportunidades/actions";

export default function NuevaOportunidadPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Nueva oportunidad</h1>
      <OportunidadForm action={createOportunidad} />
    </div>
  );
}
