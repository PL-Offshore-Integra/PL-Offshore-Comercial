import { EMPRESAS_PROPIAS, ESTADIOS, type Oportunidad } from "@/lib/types";

export default function OportunidadForm({
  action,
  oportunidad,
}: {
  action: (formData: FormData) => void;
  oportunidad?: Oportunidad;
}) {
  const field = "block text-sm font-medium text-gray-700";
  const input =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

  return (
    <form action={action} className="grid max-w-3xl grid-cols-2 gap-4">
      <div>
        <label className={field}>Compania</label>
        <input name="compania" defaultValue={oportunidad?.compania} required className={input} />
      </div>
      <div>
        <label className={field}>Nombre Proyecto</label>
        <input
          name="nombre_proyecto"
          defaultValue={oportunidad?.nombre_proyecto}
          required
          className={input}
        />
      </div>
      <div>
        <label className={field}>Alcance Oportunidad</label>
        <input
          name="alcance_oportunidad"
          defaultValue={oportunidad?.alcance_oportunidad ?? ""}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Descripcion Alcance</label>
        <input
          name="descripcion_alcance"
          defaultValue={oportunidad?.descripcion_alcance ?? ""}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Nro Oportunidad</label>
        <input
          name="nro_oportunidad"
          defaultValue={oportunidad?.nro_oportunidad ?? ""}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Contacto</label>
        <input name="contacto" defaultValue={oportunidad?.contacto ?? ""} className={input} />
      </div>
      <div>
        <label className={field}>Estadio</label>
        <select name="estadio" defaultValue={oportunidad?.estadio ?? "Investigando"} className={input}>
          {ESTADIOS.map((e) => (
            <option key={e.estadio} value={e.estadio}>
              {e.estadio} ({Math.round(e.probabilidad * 100)}%)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={field}>Empresa</label>
        <select name="empresa" defaultValue={oportunidad?.empresa ?? "Terra Mare"} className={input}>
          {EMPRESAS_PROPIAS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={field}>Valor</label>
        <input
          type="number"
          step="0.01"
          name="valor"
          defaultValue={oportunidad?.valor ?? 0}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Costo</label>
        <input
          type="number"
          step="0.01"
          name="costo"
          defaultValue={oportunidad?.costo ?? 0}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Fecha Creacion</label>
        <input
          type="date"
          name="fecha_creacion"
          defaultValue={oportunidad?.fecha_creacion ?? new Date().toISOString().slice(0, 10)}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Fecha Esperada de Cierre</label>
        <input
          type="date"
          name="fecha_esperada_cierre"
          defaultValue={oportunidad?.fecha_esperada_cierre ?? ""}
          className={input}
        />
      </div>
      <div>
        <label className={field}>Last interacted on</label>
        <input
          type="date"
          name="last_interacted_on"
          defaultValue={oportunidad?.last_interacted_on ?? ""}
          className={input}
        />
      </div>
      <div className="col-span-2">
        <label className={field}>Proximos Pasos</label>
        <input
          name="proximos_pasos"
          defaultValue={oportunidad?.proximos_pasos ?? ""}
          className={input}
        />
      </div>
      <div className="col-span-2">
        <label className={field}>Notas</label>
        <textarea name="notas" defaultValue={oportunidad?.notas ?? ""} rows={4} className={input} />
      </div>
      <div className="col-span-2">
        <label className={field}>Referencias</label>
        <input name="referencias" defaultValue={oportunidad?.referencias ?? ""} className={input} />
      </div>
      <div className="col-span-2 flex justify-end gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
