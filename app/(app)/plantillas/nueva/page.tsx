import PlantillaForm from "@/components/PlantillaForm";
import { crearPlantilla } from "@/app/(app)/plantillas/actions";
import { leerMaestroClientes } from "@/lib/clientes";

export default async function NuevaPlantillaPage() {
  const { empresas, contactos } = await leerMaestroClientes();

  return (
    <div>
      <div className="info-box accent mb16">
        Si el trabajo ya esta cargado como proyecto, es mas rapido abrirlo y
        usar <strong>Guardar como plantilla</strong>: copia el cliente, el
        buque, el tipo de contratacion y las tarifas sin tipear nada.
      </div>
      <PlantillaForm
        action={crearPlantilla}
        empresas={empresas}
        contactos={contactos}
      />
    </div>
  );
}
