import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    Number(n || 0),
  )

const PERIODICIDADES = [
  { v: 'mensual', t: 'Cada mes' },
  { v: 'bimestral', t: 'Cada 2 meses' },
  { v: 'trimestral', t: 'Cada 3 meses' },
  { v: 'anual', t: 'Cada año' },
  { v: 'unico', t: 'Pago único' },
]
const perLabel = (v) => PERIODICIDADES.find((p) => p.v === v)?.t || v

export default function Conceptos() {
  const { privada, isAdmin } = useAuth()
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null) // objeto concepto o {} para nuevo

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const { data } = await supabase
      .from('conceptos')
      .select('*')
      .order('tipo')
      .order('creado_en')
    setLista(data || [])
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-slate-500 text-sm">
        Esta sección es solo para administradores.
      </div>
    )
  }

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este concepto?')) return
    const { error } = await supabase.from('conceptos').delete().eq('id', id)
    if (error) return alert('No se pudo eliminar: ' + error.message)
    cargar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Conceptos de pago</h1>
        <button
          onClick={() => setEditando({})}
          className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-3 py-2"
        >
          + Nuevo
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Aquí defines cuánto y cada cuándo se paga (ej. Mantenimiento $50 al mes).
      </p>

      {cargando ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
          Aún no hay conceptos. Crea el primero con “+ Nuevo”.
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{c.nombre}</p>
                    {c.tipo === 'mantenimiento' && (
                      <span className="text-[10px] bg-teal-100 text-teal-800 rounded px-1.5 py-0.5 font-semibold">
                        MANTENIMIENTO
                      </span>
                    )}
                    {!c.activo && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">
                        inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {perLabel(c.periodicidad)} ·{' '}
                    {c.obligatorio ? 'Obligatorio' : 'Opcional'}
                  </p>
                </div>
                <p className="font-bold text-slate-800">{money(c.monto)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setEditando(c)}
                  className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => borrar(c.id)}
                  className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <FormConcepto
          privada={privada}
          concepto={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function FormConcepto({ privada, concepto, onCerrar, onGuardado }) {
  const esNuevo = !concepto.id
  const [nombre, setNombre] = useState(concepto.nombre || '')
  const [tipo, setTipo] = useState(concepto.tipo || 'otro')
  const [monto, setMonto] = useState(concepto.monto ?? '')
  const [periodicidad, setPeriodicidad] = useState(concepto.periodicidad || 'mensual')
  const [obligatorio, setObligatorio] = useState(concepto.obligatorio ?? true)
  const [vigenciaDesde, setVigenciaDesde] = useState(concepto.vigencia_desde || '')
  const [activo, setActivo] = useState(concepto.activo ?? true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre del concepto.')
    setGuardando(true)
    const datos = {
      privada_id: privada.id,
      nombre: nombre.trim(),
      tipo,
      monto: Number(monto || 0),
      periodicidad,
      obligatorio,
      vigencia_desde: vigenciaDesde || null,
      activo,
    }
    const resp = esNuevo
      ? await supabase.from('conceptos').insert(datos)
      : await supabase.from('conceptos').update(datos).eq('id', concepto.id)
    setGuardando(false)
    if (resp.error) return setError('No se pudo guardar: ' + resp.error.message)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <form
        onSubmit={guardar}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {esNuevo ? 'Nuevo concepto' : 'Editar concepto'}
          </h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Nombre *</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Mantenimiento mensual"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              <option value="mantenimiento">Mantenimiento</option>
              <option value="otro">Otro concepto</option>
            </select>
          </div>
          {tipo === 'mantenimiento' ? (
            <div className="flex items-end">
              <p className="text-xs text-slate-400 pb-2">Sin monto (varía por vecino)</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            ¿Cada cuándo se paga?
          </label>
          <select
            value={periodicidad}
            onChange={(e) => setPeriodicidad(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          >
            {PERIODICIDADES.map((p) => (
              <option key={p.v} value={p.v}>
                {p.t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Vigente desde (opcional)
          </label>
          <input
            type="date"
            value={vigenciaDesde}
            onChange={(e) => setVigenciaDesde(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={obligatorio}
            onChange={(e) => setObligatorio(e.target.checked)}
            className="h-4 w-4"
          />
          Es obligatorio para todos los vecinos
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4 w-4"
          />
          Activo (visible para cobrar)
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar concepto'}
        </button>
      </form>
    </div>
  )
}
