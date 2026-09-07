"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Las dos mitades del modulo de Broker. Son dos porque en la carpeta son dos
// cosas distintas —el tonelaje que se ofrece y la lista a la que se le
// ofrece— y hacen falta las dos para que la linea funcione.
//
// El menu de la izquierda tiene una sola entrada, Broker PL, asi que la
// division interna se resuelve aca y no sumando dos renglones al menu.
const PESTANAS = [
  { href: "/broker/tonelaje", label: "Tonelaje" },
  { href: "/broker/contactos", label: "Mailing list" },
];

export default function TabsBroker() {
  const pathname = usePathname();

  return (
    // `fila-acciones` alinea a la derecha, que sirve para los botones de una
    // fila de tabla pero no para una barra de secciones. Va un flex simple
    // con los mismos botones: no suma lenguaje visual nuevo.
    <div className="mb16" style={{ display: "flex", gap: 6 }}>
      {PESTANAS.map((p) => {
        const activa = pathname.startsWith(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            className={`btn btn-sm ${activa ? "btn-primary" : "btn-ghost"}`}
            aria-current={activa ? "page" : undefined}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
