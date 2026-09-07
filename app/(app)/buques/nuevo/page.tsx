import BuqueForm from "@/components/BuqueForm";
import { crearBuque } from "@/app/(app)/buques/actions";

export default function NuevoBuquePage() {
  return <BuqueForm action={crearBuque} />;
}
