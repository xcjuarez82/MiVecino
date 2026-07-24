import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SUGERIDOS = [
  { nombre: 'Emergencias (911)', telefono: '911' },
  { nombre: 'Bomberos', telefono: '' },
  { nombre: 'Cruz Roja', telefono: '' },
  { nombre: 'Policía / Seguridad', telefono: '' },
  { nombre: 'Caseta de vigilancia', telefono: '' },
]

const telLimpio = (t) => String(t || '').replace(/[^\d+]/g, '')

export default function Emergencia() {
  const { privada, isAdmin } = useAuth()
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null) // {} nuevo | fila existente

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const { data } = await supabase
      .from('numeros_emergencia')
      .select('*')
      .eq('privada_id', privada.id)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
    setLista(data || [])
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este número?')) return
    const { error } = await supabase.from('numeros_emergencia').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Números de emergencia</h1>
        <p className="text-sm text-slate-500">
          Toca un número para llamar directamente.
        </p>
      </div>

      {isAdmin && (
        <button
          onClick={() => setForm({})}
          className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5"
        >
          + Agregar número
        </button>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-slate-500 text-sm">
          Todavía no hay números de emergencia.
          {isAdmin && ' Agrega el primero con el botón de arriba.'}
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((n) => (
            <div key={n.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{n.nombre}</p>
                  {n.nota && <p className="text-xs text-slate-500 truncate">{n.nota}</p>}
                </div>
                <a
                  href={`tel:${telLimpio(n.telefono)}`}
                  className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 flex items-center gap-1.5"
                >
                  📞 {n.telefono}
                </a>
              </div>
              {isAdmin && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setForm(n)}
                    className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => borrar(n.id)}
                    className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-1.5"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <FormNumero
          privada={privada}
          fila={form}
          onCerrar={() => setForm(null)}
          onGuardado={() => {
            setForm(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function FormNumero({ privada, fila, onCerrar, onGuardado }) {
  const esNuevo = !fila.id
  const [nombre, setNombre] = useState(fila.nombre || '')
  const [telefono, setTelefono] = useState(fila.telefono || '')
  const [nota, setNota] = useState(fila.nota || '')
  const [orden, setOrden] = useState(fila.orden ?? 0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre (ej. Bomberos).')
    if (!telefono.trim()) return setError('Escribe el número de teléfono.')
    setGuardando(true)
    const datos = {
      privada_id: privada.id,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      nota: nota.trim() || null,
      orden: Number(orden) || 0,
    }
    const { error: err } = esNuevo
      ? await supabase.from('numeros_emergencia').insert(datos)
      : await supabase.from('numeros_emergencia').update(datos).eq('id', fila.id)
    setGuardando(false)
    if (err) return setError('No se pudo: ' + err.message)
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
            {esNuevo ? 'Agregar número' : 'Editar número'}
          </h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>

        {esNuevo && (
          <div className="flex flex-wrap gap-1.5">
            {SUGERIDOS.map((s) => (
              <button
                key={s.nombre}
                type="button"
                onClick={() => {
                  setNombre(s.nombre)
                  setTelefono(s.telefono)
                }}
                className="text-[11px] rounded-full border border-slate-300 text-slate-600 px-2.5 py-1 hover:bg-slate-50"
              >
                {s.nombre}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Nombre *</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Bomberos"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono *</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. 911 o 33 1234 5678"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Nota (opcional)</label>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. Solo horario nocturno"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Orden (los más chicos aparecen primero)
          </label>
          <input
            type="number"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  )
}
