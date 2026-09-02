"use client";

import { useRef } from "react";

// Los dos botones de cierre que van en cada fila de la lista.
//
// Ganado marca y listo. Perdido abre un cuadro de dialogo y pide la razon,
// que es el dato que antes se perdia: sin el, "Perdido" no le sirve a nadie.
//
// Es <dialog> nativo con showModal(): trae el foco atrapado adentro, el cierre
// con Escape y el fondo bloqueado sin una linea de JS extra. Adentro va un
// formulario comun apuntado a la server action, asi que si el navegador no
// llega a hidratar la pagina el envio igual funciona.
export default function CerrarOportunidad({
  ganar,
  perder,
  etiqueta,
}: {
  ganar: () => void;
  perder: (formData: FormData) => void;
  // Que oportunidad se esta cerrando, para que el cuadro de dialogo lo diga.
  etiqueta: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  return (
    <>
      <form action={ganar} style={{ display: "inline" }}>
        <button type="submit" className="btn btn-success btn-sm">
          Ganado
        </button>
      </form>

      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => dialogo.current?.showModal()}
      >
        Perdido
      </button>

      <dialog ref={dialogo} className="modal">
        <form action={perder}>
          <div className="modal-titulo">Perdimos {etiqueta}</div>

          <div className="fg mb16">
            <label>Por que se perdio</label>
            <textarea
              name="motivo_perdida"
              rows={3}
              required
              placeholder="Precio, disponibilidad de buque, plazo de entrega..."
            />
            <span className="hint">Obligatorio</span>
          </div>

          <div className="fg mb16">
            <label>Competidor</label>
            <input name="competidor" placeholder="Opcional: quien se lo llevo" />
          </div>

          <div className="modal-pie">
            {/* type="button" y no submit: cancelar no tiene que pasar por la
                validacion del motivo. */}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dialogo.current?.close()}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-danger">
              Marcar Perdido
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
