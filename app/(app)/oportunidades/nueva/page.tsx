import OportunidadForm from "@/components/OportunidadForm";
import { createOportunidad } from "@/app/(app)/oportunidades/actions";

export default function NuevaOportunidadPage() {
  return <OportunidadForm action={createOportunidad} />;
}
