import ZonaForm from "@/components/ZonaForm";
import { crearZona } from "@/app/(app)/zonas/actions";

export default function NuevaZonaPage() {
  return <ZonaForm action={crearZona} />;
}
