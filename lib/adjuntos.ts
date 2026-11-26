// La documentacion adjunta, en un solo lugar.
//
// Oportunidades, proyectos y salidas guardan archivos con la misma mecanica
// —bucket privado, ruta con uuid, nombre original en la fila— y hasta ahora
// tenian tres copias del mismo codigo, con tres topes que podian separarse.
// Aca vive lo que comparten; las tres pantallas usan el mismo componente y
// las mismas acciones.
//
// POR QUE EL ARCHIVO NO PASA MAS POR EL SERVIDOR
//
//   Subir por una accion de servidor tiene dos techos que no dependen de
//   nosotros. Next corta el cuerpo de una accion en 1 MB por defecto —esta
//   escrito en la version instalada, `defaultActionBodySizeLimit = '1 MB'`—
//   asi que un PDF de 2 MB ya fallaba mientras la pantalla prometia 25 MB. Y
//   en produccion, Vercel corta el cuerpo de cualquier request en 4,5 MB, que
//   no se configura. Por ese camino los 20 MB no se alcanzan nunca.
//
//   Asi que el archivo va del navegador derecho a Supabase Storage, con un
//   permiso firmado que emite el servidor para una ruta que elige el
//   servidor. Por la accion solo viajan el nombre, el tipo y el tamano. De
//   paso se pueden subir varios a la vez y en paralelo.

export type EntidadAdjunto = "oportunidad" | "proyecto" | "operacion";

// El cupo es POR ENTIDAD, no por archivo: lo que no puede pasarse de 20 MB es
// todo lo que cuelga de una misma oportunidad (o proyecto, o salida), sumado.
// Decidido asi para que el tamano de la base y del bucket sea previsible: un
// tope por archivo no limita cuantos archivos entran.
export const CUPO_ADJUNTOS_BYTES = 20 * 1024 * 1024;

// Todo lo que cambia entre las tres entidades. Agregar una cuarta es agregar
// una entrada aca.
export const ADJUNTOS: Record<
  EntidadAdjunto,
  {
    tabla: string;
    fk: string;
    // La carpeta dentro del bucket. La ruta final es
    // `<carpeta>/<id>/<uuid><extension>`.
    carpeta: string;
    // Los valores validos de `clase`. Null cuando la tabla no tiene esa
    // columna, que es el caso de las oportunidades.
    clases: string[] | null;
    // Como se nombra en los mensajes de error, en singular.
    comoSeLlama: string;
  }
> = {
  oportunidad: {
    tabla: "oportunidad_adjuntos",
    fk: "oportunidad_id",
    carpeta: "oportunidades",
    clases: null,
    comoSeLlama: "esta oportunidad",
  },
  proyecto: {
    tabla: "proyecto_adjuntos",
    fk: "proyecto_id",
    carpeta: "proyectos",
    clases: ["contrato", "otro"],
    comoSeLlama: "este proyecto",
  },
  operacion: {
    tabla: "operacion_adjuntos",
    fk: "operacion_id",
    carpeta: "operaciones",
    clases: ["calculo", "sof", "otro"],
    comoSeLlama: "esta salida",
  },
};

// El unico bucket del modulo. Es privado: nunca se expone un link publico, se
// firma una URL cuando alguien la pide.
export const BUCKET = "comercial";

// Storage acepta un juego de caracteres acotado en las rutas. En vez de
// pelear con acentos y espacios, la ruta se arma con un uuid y el nombre
// original se guarda en la fila, que es lo que despues ve la persona.
export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  if (punto <= 0 || punto === nombre.length - 1) return "";
  const ext = nombre.slice(punto + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
}

// El peso como lo lee una persona. Estaba repetido en tres pantallas.
export function pesoLegible(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
