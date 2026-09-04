"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import { TIPOS_ZONA, type Zona } from "@/lib/types";

const AVISO_MEDIA_POSICION =
  "Hacen falta las dos coordenadas o ninguna. Una zona sin posicion sirve igual: lo unico que no puede es dibujarse en el mapa.";

export const ID_FORM_ZONA = "form-zona";

// Un lugar del maestro: como se llama, que es, y donde queda.
//
// Las coordenadas van en grados decimales y pueden quedar vacias. Se pide asi
// —y no en grados, minutos y segundos— porque es lo que copia y pega de
// Google Maps o de una carta electronica, y porque es lo que entiende el mapa.
export default function ZonaForm({
  action,
  zona,
  usos,
}: {
  action: (formData: FormData) => void;
  zona?: Zona;
  // Cuantos trabajos apuntan a esta zona. Solo para avisar.
  usos?: { oportunidades: number; proyectos: number };
}) {
  // Las coordenadas van en estado por una sola razon: avisar aca que falta una
  // de las dos.
  //
  // El servidor ya lo valida, pero ese mensaje no llega a nadie: un error de
  // server action se muestra como "A server error occurred", asi que la
  // explicacion se la come el framework. Verificado en el navegador.
  const [lat, setLat] = useState(zona?.lat !== null && zona?.lat !== undefined ? String(zona.lat) : "");
  const [lon, setLon] = useState(zona?.lon !== null && zona?.lon !== undefined ? String(zona.lon) : "");

  const refLat = useRef<HTMLInputElement>(null);
  const refLon = useRef<HTMLInputElement>(null);

  const mediaPosicion = (lat.trim() === "") !== (lon.trim() === "");

  // Se le cuelga al campo como validez propia: asi lo frena el checkValidity()
  // que ya hace BotonGuardar antes de enviar, y el navegador muestra el globo
  // con el motivo. Sin esto el boton quedaria en "Guardando..." para siempre.
  useEffect(() => {
    const mensaje = mediaPosicion ? AVISO_MEDIA_POSICION : "";
    refLat.current?.setCustomValidity(mensaje);
    refLon.current?.setCustomValidity(mensaje);
  }, [mediaPosicion]);

  return (
    <form action={action} className="card" id={ID_FORM_ZONA}>
      <div className="form-section">El lugar</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nombre</label>
          <input
            name="nombre"
            defaultValue={zona?.nombre ?? ""}
            placeholder="Ingeniero White"
            required
            autoFocus={!zona}
          />
          <span className="hint">
            Con las palabras de la operacion: si en la planilla dice "Alfa", la
            zona se llama Alfa.
          </span>
        </div>
        <div className="fg">
          <label>Tipo</label>
          <select name="tipo" defaultValue={zona?.tipo ?? "puerto"}>
            {TIPOS_ZONA.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Se ofrece al cargar un trabajo</label>
          <label className="fila-check">
            <input type="checkbox" name="activa" defaultChecked={zona?.activa ?? true} />
            <span>Activa</span>
          </label>
          <span className="hint">
            Destildala para retirarla sin borrarla: los trabajos viejos siguen
            apuntando bien y se siguen viendo en el mapa.
          </span>
        </div>
      </div>

      <div className="form-section">Donde queda</div>
      <div className="form-grid">
        <div className="fg">
          <label>Latitud</label>
          <input
            ref={refLat}
            name="lat"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="-38.78"
            inputMode="decimal"
          />
          <span className="hint">Grados decimales. Negativa al sur.</span>
        </div>
        <div className="fg">
          <label>Longitud</label>
          <input
            ref={refLon}
            name="lon"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="-62.27"
            inputMode="decimal"
          />
          <span className="hint">Grados decimales. Negativa al oeste.</span>
        </div>
      </div>
      {mediaPosicion ? (
        <div className="info-box warn mb16">{AVISO_MEDIA_POSICION}</div>
      ) : (
        <div className="fg mb16">
          <span className="hint">
            Las dos o ninguna. Una zona sin coordenadas sirve igual para agrupar
            y filtrar; lo unico que no puede es dibujarse, y el mapa la lista
            aparte en vez de esconderla.
          </span>
        </div>
      )}

      <div className="form-section">Notas</div>
      <div className="fg">
        <textarea
          name="notas"
          defaultValue={zona?.notas ?? ""}
          rows={3}
          placeholder="Lo que convenga recordar del lugar: calado, restricciones, a que puerto pertenece"
        />
      </div>

      {usos && (usos.oportunidades > 0 || usos.proyectos > 0) && (
        <div className="info-box accent mt16">
          Apuntan a esta zona{" "}
          <strong>
            {usos.oportunidades} {usos.oportunidades === 1 ? "oportunidad" : "oportunidades"}
          </strong>{" "}
          y{" "}
          <strong>
            {usos.proyectos} {usos.proyectos === 1 ? "proyecto" : "proyectos"}
          </strong>
          . Corregirle la posicion los mueve a todos en el mapa.
        </div>
      )}

      <PieDeLaZona />
    </form>
  );
}

export function PieDeLaZona() {
  return (
    <div className="flex-between mt16">
      <Link href="/zonas" className="btn btn-ghost">
        Atras
      </Link>
      <BotonGuardar form={ID_FORM_ZONA} />
    </div>
  );
}
