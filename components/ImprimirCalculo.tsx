"use client";

import { useState } from "react";

// El unico pedazo de un documento que necesita javascript: abrir el dialogo de
// impresion del navegador, que es de donde sale el PDF.
//
// La previsualizacion no la hace este boton: la hace la pantalla, que muestra
// la hoja A4 tal como va a salir. Hace falta porque el dialogo de impresion no
// esta garantizado —el navegador embebido de la app no muestra preview, y
// algunos ni abren el dialogo—, asi que lo que se ve ya tiene que ser el
// documento.
//
// Despues del primer click aparece el atajo del teclado, que es la salida
// cuando el boton no logra abrir nada.
export default function ImprimirCalculo() {
  const [apretado, setApretado] = useState(false);

  return (
    <div className="imprimir">
      <button
        type="button"
        className="btn btn-amarillo"
        onClick={() => {
          setApretado(true);
          window.print();
        }}
      >
        Imprimir / PDF
      </button>
      {apretado && (
        <span className="hint">
          En el dialogo del navegador, elegi <strong>Guardar como PDF</strong>.
          Si no se abrio, apreta <strong>Ctrl + P</strong> (o Cmd + P en Mac), o
          abri esta pagina en Chrome.
        </span>
      )}
    </div>
  );
}
