import Link from "next/link";
import ListaBuques from "@/components/ListaBuques";
import { createClient } from "@/lib/supabase/server";
import { type Buque } from "@/lib/types";

// El maestro de buques. Sale de la carpeta 08. COMMERCIAL/Broker: el tonelaje
// en venta, los remolcadores de LATAM, y los dos buques que PL brokereo.
export default async function BuquesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buques")
    .select("*")
    .order("nombre", { ascending: true });

  const buques = (data ?? []) as Buque[];
  const sinTiro = buques.filter((b) => b.bollard_pull_t === null);

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer los buques: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">
            supabase/migrations/0036_maestro_de_buques.sql
          </span>
          .
        </div>
      )}

      <div className="info-box accent mb16">
        La lista de tonelaje. Cuando un cliente pregunta que buque hay para un
        trabajo, la respuesta esta aca y no en trece PDFs en OneDrive:{" "}
        <strong>se filtra por tipo, por tiro y por bandera</strong>. Cada ficha
        dice de que archivo salio cada numero, asi que se puede ir a verificar
        contra el papel del que vino.
      </div>

      {sinTiro.length > 0 && (
        <div className="info-box warn mb16">
          {sinTiro.length === 1 ? "No tiene" : "No tienen"} el tiro cargado{" "}
          <strong>{sinTiro.map((b) => b.nombre).join(", ")}</strong>. Sirven
          igual para saber que existen, pero no aparecen cuando se filtra por
          tiro: un buque sin tiro no puede afirmar que cumple un minimo.
        </div>
      )}

      {!error && buques.length === 0 && (
        <div className="empty-state">
          Todavia no hay buques cargados.{" "}
          <Link href="/buques/nuevo">
            <strong>Cargar el primero</strong>
          </Link>
          .
        </div>
      )}

      {buques.length > 0 && <ListaBuques buques={buques} />}

      <div className="hint">
        El buque de un trabajo todavia es texto libre: este maestro existe pero
        la oportunidad, el proyecto y la salida siguen escribiendo el nombre a
        mano. Engancharlos es el paso que sigue, igual que se hizo con las{" "}
        <Link href="/zonas">zonas</Link>.
      </div>
    </div>
  );
}
