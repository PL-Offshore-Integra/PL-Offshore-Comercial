// Leer un numero que escribio una persona.
//
// Existe porque me equivoque: la primera version borraba todos los puntos
// tomandolos por separadores de miles, y "59135.43" —lo que manda un
// <input type="number">— se guardo como 5.913.543. Cien veces la plata, visto
// en pantalla. Un numero mal leido no da error: da otro numero.
//
// Las dos formas que llegan de verdad:
//
//   "59135.43"    punto decimal, del input numerico o de un copiar y pegar
//   "59.135,43"   como se escribe aca, con punto de miles y coma decimal
//
// La regla, en este orden:
//
//   1) Si hay coma, la coma es el decimal y los puntos son miles.
//   2) Si no hay coma y el punto deja una parte decimal de uno o dos digitos,
//      es un punto decimal: "59135.43", "1442.5".
//   3) En cualquier otro caso los puntos son de miles: "1.288.933".
//
// El caso ambiguo real es "59.135" sin coma: por (3) se lee 59135, que es lo
// que quiso decir alguien que escribe en es-AR. Para decir 59 con 135
// milesimas en un importe no hay motivo.
export function aNumero(bruto: string): number {
  const limpio = bruto.replace(/\s/g, "").replace(/^\+/, "");
  if (limpio === "" || limpio === "-") return NaN;

  if (limpio.includes(",")) {
    return Number(limpio.replace(/\./g, "").replace(",", "."));
  }
  if (/^-?\d+\.\d{1,2}$/.test(limpio)) {
    return Number(limpio);
  }
  return Number(limpio.replace(/\./g, ""));
}

// Lo mismo, pero devolviendo null cuando no hay nada que leer o cuando lo que
// hay no es un numero. Sirve para un campo que puede quedar vacio.
export function numeroONulo(bruto: string | null | undefined): number | null {
  if (bruto === null || bruto === undefined || bruto.trim() === "") return null;
  const n = aNumero(bruto);
  return Number.isFinite(n) ? n : null;
}
