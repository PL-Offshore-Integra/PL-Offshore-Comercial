"use client";

import { useRef, useState } from "react";

// El control de estado de cada fila de la lista.
//
// Abierto y En curso se cambian de una. Cerrado no: cerrar obliga a decir con
// que resultado, y si se perdio, por que. Por eso al elegir "Cerrado" se abre
// un cuadro de dialogo en lugar de guardar directo.
//
// El comentario de la perdida no va a un campo aparte: va a `comentarios`, que
// es el que se ve en la lista. Cuando alguien mira el listado y ve una
// perdida, lo primero que quiere saber es por que.
export default function EstadoOportunidadControl({
  estado,
  resultado,
  cambiarEstado,
  cerrar,
  reabrir,
  etiqueta,
  comentarios,
}: {
  estado: string;
  resultado: string | null;
  cambiarEstado: (formData: FormData) => void;
  cerrar: (formData: FormData) => void;
  reabrir: () => void;
  etiqueta: string;
  comentarios: string | null;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [comoCierra, setComoCierra] = useState<"ganado" | "perdido">("ganado");

  if (estado === "cerrado") {
    return (
      <form action={reabrir} style={{ display: "inline" }}>
        <button type="submit" className="btn btn-ghost btn-sm">
          Reabrir
        </button>
      </form>
    );
  }

  return (
    <>
      <form action={cambiarEstado} style={{ display: "inline" }}>
        <select
          name="estado"
          // La key fuerza a React a rehacer el nodo cuando el estado cambia:
          // sin ella reusa el <select> y el defaultValue no se vuelve a
          // aplicar, asi que la fila mostraba el estado viejo despues de
          // guardar.
          key={estado}
          defaultValue={estado}
          className="filter-select select-estado"
          onChange={(e) => {
            if (e.target.value === "cerrado") {
              // Volver al valor anterior: el cierre lo confirma el cuadro.
              e.target.value = estado;
              dialogo.current?.showModal();
            } else {
              e.target.form?.requestSubmit();
            }
          }}
        >
          <option value="abierto">Abierto</option>
          <option value="en_curso">En curso</option>
          <option value="cancelado">Cancelado</option>
          <option value="cerrado">Cerrado...</option>
        </select>
      </form>

      <dialog ref={dialogo} className="modal">
        <form action={cerrar}>
          <div className="modal-titulo">Cerrar {etiqueta}</div>

          <div className="fg mb16">
            <label>Resultado</label>
            <select
              name="resultado"
              value={comoCierra}
              onChange={(e) => setComoCierra(e.target.value as "ganado" | "perdido")}
            >
              <option value="ganado">Ganado</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          <div className="fg mb16">
            <label>{comoCierra === "perdido" ? "Por que se perdio" : "Comentarios"}</label>
            <textarea
              name="comentarios"
              rows={3}
              defaultValue={comentarios ?? ""}
              required={comoCierra === "perdido"}
              placeholder={
                comoCierra === "perdido"
                  ? "Precio, disponibilidad de buque, plazo..."
                  : "Opcional"
              }
            />
            <span className="hint">
              {comoCierra === "perdido"
                ? "Obligatorio. Es lo que se ve en el listado."
                : "Reemplaza los comentarios que tenga cargados."}
            </span>
          </div>

          <div className="modal-pie">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dialogo.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={comoCierra === "perdido" ? "btn btn-danger" : "btn btn-success"}
            >
              Cerrar como {comoCierra === "perdido" ? "perdida" : "ganada"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
