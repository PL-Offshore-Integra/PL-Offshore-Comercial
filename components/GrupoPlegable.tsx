"use client";

import { useState } from "react";

// Un grupo de filas dentro de una tabla, que se pliega.
//
// Se usa en Oportunidades para las canceladas: son cinco de once y lo que se
// cotizo y se perdio no se tira, pero tampoco tiene por que ocupar media
// pantalla todos los dias.
//
// POR QUE UN <tbody> Y NO UNA TABLA APARTE
//
//   Una tabla por estado repetiria la fila de encabezados de columna tres
//   veces. Una tabla admite varios <tbody>, asi que cada grupo es uno: los
//   encabezados se escriben una sola vez y las columnas quedan alineadas
//   entre grupos, que es lo que permite comparar una fila con otra.
//
// POR QUE NO <details>
//
//   <details> no puede envolver filas de una tabla, asi que plegar adentro de
//   la tabla pide estado. Es lo unico que hace este componente cliente: las
//   filas llegan ya dibujadas desde el servidor por `children` y no se
//   vuelven a armar aca.
//
// SIN ICONO
//
//   El design system no admite iconos, asi que el triangulito que pondria un
//   <details> tampoco iria. El estado se dice con la palabra —Ver u Ocultar—,
//   que ademas es lo que un lector de pantalla necesita escuchar.
export default function GrupoPlegable({
  titulo,
  color,
  cuenta,
  columnas,
  children,
  abiertoAlPrincipio = false,
}: {
  titulo: string;
  color: string;
  cuenta: number;
  // Las columnas que tiene la tabla, para que el encabezado del grupo ocupe
  // el ancho entero.
  columnas: number;
  children: React.ReactNode;
  abiertoAlPrincipio?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoAlPrincipio);

  return (
    <tbody>
      <tr className="grupo-fila">
        <th colSpan={columnas}>
          <button
            type="button"
            className="grupo-boton"
            onClick={() => setAbierto(!abierto)}
            aria-expanded={abierto}
          >
            <span className={`badge ${color}`}>
              {titulo} ({cuenta})
            </span>
            <span className="grupo-accion">{abierto ? "Ocultar" : "Ver"}</span>
          </button>
        </th>
      </tr>
      {abierto && children}
    </tbody>
  );
}
