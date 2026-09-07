import BuqueForm from "@/components/BuqueForm";
import { crearBuque } from "@/app/(app)/broker/tonelaje/actions";

export default function NuevoBuquePage() {
  return <BuqueForm action={crearBuque} />;
}
