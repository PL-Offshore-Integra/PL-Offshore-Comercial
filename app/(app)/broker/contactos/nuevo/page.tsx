import ContactoForm from "@/components/ContactoForm";
import { crearContacto } from "@/app/(app)/broker/contactos/actions";

export default function NuevoContactoPage() {
  return <ContactoForm action={crearContacto} />;
}
