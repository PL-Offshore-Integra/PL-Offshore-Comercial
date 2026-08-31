import { EMPRESAS_PROPIAS, ESTADIOS, type Oportunidad } from "@/lib/types";

export default function OportunidadForm({
  action,
  oportunidad,
}: {
  action: (formData: FormData) => void;
  oportunidad?: Oportunidad;
}) {
  return (
    <form action={action} className="card" style={{ maxWidth: 760 }}>
      <div className="form-grid">
        <div className="fg">
          <label>Compania</label>
          <input name="compania" defaultValue={oportunidad?.compania} required />
        </div>
        <div className="fg">
          <label>Nombre Proyecto</label>
          <input name="nombre_proyecto" defaultValue={oportunidad?.nombre_proyecto} required />
        </div>
        <div className="fg">
          <label>Alcance Oportunidad</label>
          <input name="alcance_oportunidad" defaultValue={oportunidad?.alcance_oportunidad ?? ""} />
        </div>
        <div className="fg">
          <label>Descripcion Alcance</label>
          <input name="descripcion_alcance" defaultValue={oportunidad?.descripcion_alcance ?? ""} />
        </div>
        <div className="fg">
          <label>Nro Oportunidad</label>
          <input name="nro_oportunidad" defaultValue={oportunidad?.nro_oportunidad ?? ""} />
        </div>
        <div className="fg">
          <label>Contacto</label>
          <input name="contacto" defaultValue={oportunidad?.contacto ?? ""} />
        </div>
        <div className="fg">
          <label>Estadio</label>
          <select name="estadio" defaultValue={oportunidad?.estadio ?? "Investigando"}>
            {ESTADIOS.map((e) => (
              <option key={e.estadio} value={e.estadio}>
                {e.estadio} ({Math.round(e.probabilidad * 100)}%)
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Empresa</label>
          <select name="empresa" defaultValue={oportunidad?.empresa ?? "Terra Mare"}>
            {EMPRESAS_PROPIAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Valor</label>
          <input type="number" step="0.01" name="valor" defaultValue={oportunidad?.valor ?? 0} />
        </div>
        <div className="fg">
          <label>Costo</label>
          <input type="number" step="0.01" name="costo" defaultValue={oportunidad?.costo ?? 0} />
        </div>
        <div className="fg">
          <label>Fecha Creacion</label>
          <input
            type="date"
            name="fecha_creacion"
            defaultValue={oportunidad?.fecha_creacion ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="fg">
          <label>Fecha Esperada de Cierre</label>
          <input
            type="date"
            name="fecha_esperada_cierre"
            defaultValue={oportunidad?.fecha_esperada_cierre ?? ""}
          />
        </div>
        <div className="fg">
          <label>Last interacted on</label>
          <input type="date" name="last_interacted_on" defaultValue={oportunidad?.last_interacted_on ?? ""} />
        </div>
      </div>

      <div className="form-section">Seguimiento</div>
      <div className="fg mb16">
        <label>Proximos Pasos</label>
        <input name="proximos_pasos" defaultValue={oportunidad?.proximos_pasos ?? ""} />
      </div>
      <div className="fg mb16">
        <label>Notas</label>
        <textarea name="notas" defaultValue={oportunidad?.notas ?? ""} rows={4} />
      </div>
      <div className="fg">
        <label>Referencias</label>
        <input name="referencias" defaultValue={oportunidad?.referencias ?? ""} />
      </div>

      <div className="flex-between mt16" style={{ justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </div>
    </form>
  );
}
