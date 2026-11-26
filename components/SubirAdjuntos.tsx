"use client";

import { useRef, useState } from "react";
import {
  descartarSubida,
  pedirSubida,
  registrarSubida,
} from "@/app/(app)/adjuntos/actions";
import { BUCKET, CUPO_ADJUNTOS_BYTES, pesoLegible, type EntidadAdjunto } from "@/lib/adjuntos";
import { createClient } from "@/lib/supabase/client";

// El cuadro para adjuntar documentacion. Lo usan las cinco pantallas que
// guardan archivos: la oportunidad, el proyecto (contrato y resto) y la
// salida (calculo, statement of facts y resto).
//
// Sube VARIOS archivos de una, y el archivo va del navegador derecho a
// Storage: el por que esta en lib/adjuntos.ts. Aca solo se orquesta.
//
// POR QUE NO ES UN <form action={accion}>
//
//   Porque entre pedir el permiso y registrar la fila hay un paso que pasa en
//   el navegador —la subida— y hay que poder cancelar y limpiar si falla en
//   el medio. Un form con accion de servidor es un solo viaje.
export default function SubirAdjuntos({
  entidad,
  id,
  clase,
  usado,
  etiqueta = "Adjuntar archivos",
}: {
  entidad: EntidadAdjunto;
  id: string;
  // Que tipo de documento es, para las tablas que lo distinguen. La
  // oportunidad no lo usa.
  clase?: string;
  // Lo que ya pesa lo cargado, para poder decir cuanto lugar queda sin
  // preguntarle al servidor. El cupo lo vuelve a revisar el servidor igual:
  // esto es para la persona, no es el control.
  usado: number;
  etiqueta?: string;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [elegidos, setElegidos] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sobra = Math.max(CUPO_ADJUNTOS_BYTES - usado, 0);
  const entrante = elegidos.reduce((suma, f) => suma + f.size, 0);
  const noEntra = entrante > sobra;

  const limpiarCampo = () => {
    setElegidos([]);
    if (campo.current) campo.current.value = "";
  };

  const subir = async () => {
    if (elegidos.length === 0 || noEntra) return;
    setSubiendo(true);
    setError(null);

    // Lo que ya entro al bucket, para poder sacarlo si algo falla despues.
    const entregados: { nombre: string; path: string; tipo: string | null }[] = [];

    try {
      const permisos = await pedirSubida(
        entidad,
        id,
        elegidos.map((f) => ({ nombre: f.name, tamano: f.size, tipo: f.type || null }))
      );

      const supabase = createClient();

      // En paralelo: son pocos archivos y el navegador sabe repartir. Si uno
      // falla, Promise.all corta y el catch limpia lo que si entro.
      await Promise.all(
        permisos.map(async (permiso, i) => {
          const archivo = elegidos[i];
          const { error: eUp } = await supabase.storage
            .from(BUCKET)
            .uploadToSignedUrl(permiso.path, permiso.token, archivo, {
              contentType: archivo.type || undefined,
            });
          if (eUp) throw new Error(`${archivo.name}: ${eUp.message}`);
          entregados.push({
            nombre: archivo.name,
            path: permiso.path,
            tipo: archivo.type || null,
          });
        })
      );

      await registrarSubida(entidad, id, entregados, clase);
      limpiarCampo();
    } catch (e) {
      // Lo que entro sin llegar a tener fila se saca: un archivo sin fila no
      // se ve en ninguna pantalla y nadie lo podria borrar despues.
      if (entregados.length > 0) {
        await descartarSubida(entregados.map((x) => x.path)).catch(() => {});
      }
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <div className="form-grid" style={{ alignItems: "end" }}>
        <div className="fg">
          <label>
            {etiqueta} (queda lugar para {pesoLegible(sobra)})
          </label>
          <input
            ref={campo}
            type="file"
            multiple
            disabled={subiendo}
            onChange={(e) => {
              setError(null);
              setElegidos(Array.from(e.target.files ?? []));
            }}
          />
        </div>
        <div className="fg">
          <label>&nbsp;</label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={subir}
            disabled={subiendo || elegidos.length === 0 || noEntra}
          >
            {subiendo ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </div>

      {/* Lo elegido, antes de subir: cuantos son y cuanto pesan. El cupo es
          por registro y no por archivo, asi que el numero que importa es la
          suma. */}
      {elegidos.length > 0 && !subiendo && (
        <div className={noEntra ? "info-box danger" : "filter-cuenta text-mono"}>
          {elegidos.length === 1
            ? `${elegidos[0].name} · ${pesoLegible(entrante)}`
            : `${elegidos.length} archivos · ${pesoLegible(entrante)}`}
          {noEntra && ` — no entra: queda lugar para ${pesoLegible(sobra)}.`}
        </div>
      )}

      {error && <div className="info-box danger">{error}</div>}
    </div>
  );
}
