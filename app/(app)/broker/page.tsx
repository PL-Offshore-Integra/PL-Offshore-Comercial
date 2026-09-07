import { redirect } from "next/navigation";

// El modulo entra por el tonelaje, que es la mitad que se usa para contestar
// una consulta. El mailing list esta a un clic, en la pestana de al lado.
export default function BrokerPage() {
  redirect("/broker/tonelaje");
}
