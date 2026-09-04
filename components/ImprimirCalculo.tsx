"use client";

// El unico pedazo de esta pantalla que necesita javascript: abrir el dialogo
// de impresion del navegador, que es con lo que se saca el PDF.
export default function ImprimirCalculo() {
  return (
    <button type="button" className="btn btn-amarillo" onClick={() => window.print()}>
      Imprimir / PDF
    </button>
  );
}
