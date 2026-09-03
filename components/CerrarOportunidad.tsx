"use client";

import { useRef } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import { ESTADOS_OPORTUNIDAD } from "@/lib/types";

// El control de estado de cada fila de la lista. Tres estados (0016), y cada
// uno se comporta distinto porque significan cosas distintas:
//
//   En curso     se cambia de una. No hay nada que explicar.
//   Adjudicado   se cambia de una y abre el alta del proyecto. No pide
//                comentario: el detalle del trabajo va en el proyecto.
//   Cancelado    abre un cuadro y pide el motivo. Un final sin motivo no le
//                sirve a nadie, y ese texto es el que despues se lee en la
//                columna Comentarios del listado.
export default function EstadoOportunidadControl({
  estado,
  cambiarEstado,
  etiqueta,
  comentarios,
}: {
  estado: string;
  cambiarEstado: (formData: FormData) => void;
  etiqueta: string;
  comentarios: string | null;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  // El <dialog> no se cierra solo cuando el submit va a una accion de
  // servidor: la fila se actualiza detras y el cuadro queda tapando la
  // pantalla. Se envuelve la accion para cerrarlo cuando termina.
  const cerrarDespues = async (formData: FormData) => {
    await cambiarEstado(formData);
    dialogo.current?.close();
  };

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
            if (e.target.value === "cancelado") {
              // Vuelve al valor anterior: lo confirma el cuadro, no el
              // desplegable.
              e.target.value = estado;
              dialogo.current?.showModal();
            } else {
              e.target.form?.requestSubmit();
            }
          }}
        >
          {ESTADOS_OPORTUNIDAD.map((e) => (
            <option key={e.id} value={e.id}>
              {e.id === "cancelado" ? `${e.label}...` : e.label}
            </option>
          ))}
        </select>
      </form>

      <dialog ref={dialogo} className="modal">
        <form action={cerrarDespues}>
          <input type="hidden" name="estado" value="cancelado" />
          <div className="modal-titulo">Cancelar {etiqueta}</div>

          <div className="fg mb16">
            <label>Por que se cancela</label>
            <textarea
              name="comentarios"
              rows={3}
              defaultValue={comentarios ?? ""}
              required
              placeholder="Se la dieron a otro, se cayo la licitacion, el cliente suspendio el trabajo..."
            />
            <span className="hint">
              Obligatorio. Es lo que se ve en el listado, y lo unico que queda
              para saber que paso.
            </span>
          </div>

          <div className="modal-pie">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dialogo.current?.close()}
            >
              Volver
            </button>
            <BotonGuardar className="btn btn-danger" enviando="Cancelando...">
              Cancelar la oportunidad
            </BotonGuardar>
          </div>
        </form>
      </dialog>
    </>
  );
}
