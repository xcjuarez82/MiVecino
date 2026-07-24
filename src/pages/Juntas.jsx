import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TIPOS = [
  { id: 'junta', label: 'Junta' },
  { id: 'asamblea', label: 'Asamblea' },
  { id: 'faena', label: 'Faena / limpieza' },
  { id: 'evento', label: 'Evento social' },
]
const tipoLabel = (t) => TIPOS.find((x) => x.id === t)?.label || 'Reunión'

const fmtFechaHora = (f) =>
  f
    ? new Date(f).toLocaleString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Fecha por definir'

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export default function Juntas() {
  const { privada, isStaff, isAdmin } = useAuth()
  const [tab, setTab] = useState('calendario')
  const [eventos, setEventos] = useState([])
  const [minutas, setMinutas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null) // 'evento' | 'minuta'

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const [eRes, mRes] = await Promise.all([
      supabase.from('eventos').select('*').order('fecha', { ascending: true }),
      supabase.from('minutas').select('*').order('fecha', { ascending: false }),
    ])
    setEventos(eRes.data || [])
    setMinutas(mRes.data || [])
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrarEvento = async (id) => {
    if (!confirm('¿Eliminar esta reunión del calendario?')) return
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }
  const borrarMinuta = async (id) => {
    if (!confirm('¿Eliminar esta acta?')) return
    const { error } = await supabase.from('minutas').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }
  const abrirArchivo = async (path) => {
    if (!path) return
    const { data, error } = await supabase.storage.from('minutas').createSignedUrl(path, 3600)
    if (error) return alert('No se pudo abrir: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  const ahora = Date.now()
  const proximas = eventos.filter((e) => !e.fecha || new Date(e.fecha).getTime() >= ahora)
  const pasadas = eventos
    .filter((e) => e.fecha && new Date(e.fecha).getTime() < ahora)
    .reverse()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Juntas y calendario</h1>

      <div className="flex gap-1 bg-slate-200/60 rounded-xl p-1">
        {[
          { id: 'calendario', label: 'Calendario' },
          { id: 'actas', label: 'Actas / minutas' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-white shadow text-teal-700' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>}

      {/* ===== CALENDARIO ===== */}
      {!cargando && tab === 'calendario' && (
        <section className="space-y-4">
          {isStaff && (
            <button
              onClick={() => setModal('evento')}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5"
            >
              + Agendar reunión
            </button>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Próximas</h2>
            {proximas.length === 0 ? (
              <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
                No hay reuniones programadas.
              </p>
            ) : (
              proximas.map((e) => (
                <EventoCard key={e.id} e={e} onBorrar={isStaff ? borrarEvento : null} />
              ))
            )}
          </div>

          {pasadas.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Anteriores
              </h2>
              {pasadas.map((e) => (
                <EventoCard key={e.id} e={e} pasada onBorrar={isStaff ? borrarEvento : null} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== ACTAS ===== */}
      {!cargando && tab === 'actas' && (
        <section className="space-y-3">
          {isAdmin && (
            <button
              onClick={() => setModal('minuta')}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5"
            >
              + Subir acta / minuta
            </button>
          )}
          {minutas.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
              Todavía no hay actas publicadas.
            </p>
          ) : (
            minutas.map((m) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{m.titulo}</p>
                    <p className="text-xs text-slate-500">{fmtFecha(m.fecha)}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => borrarMinuta(m.id)}
                      className="text-[11px] text-red-500 hover:underline shrink-0"
                    >
                      eliminar
                    </button>
                  )}
                </div>
                {m.archivo_url && (
                  <button
                    onClick={() => abrirArchivo(m.archivo_url)}
                    className="mt-3 text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                  >
                    📄 Ver acta
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {modal === 'evento' && (
        <FormEvento
          privada={privada}
          onCerrar={() => setModal(null)}
          onGuardado={() => {
            setModal(null)
            cargar()
          }}
        />
      )}
      {modal === 'minuta' && (
        <FormMinuta
          privada={privada}
          eventos={eventos}
          onCerrar={() => setModal(null)}
          onGuardado={() => {
            setModal(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function EventoCard({ e, pasada, onBorrar }) {
  return (
    <div
      className={`rounded-xl shadow-sm p-4 border ${
        pasada ? 'bg-slate-50 border-slate-200' : 'bg-white border-teal-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">
            {tipoLabel(e.tipo)}
          </span>
          <p className="font-semibold text-slate-800 mt-1">{e.titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">🗓️ {fmtFechaHora(e.fecha)}</p>
          {e.lugar && <p className="text-xs text-slate-500">📍 {e.lugar}</p>}
          {e.descripcion && (
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{e.descripcion}</p>
          )}
        </div>
        {onBorrar && (
          <button
            onClick={() => onBorrar(e.id)}
            className="text-[11px] text-red-500 hover:underline shrink-0"
          >
            eliminar
          </button>
        )}
      </div>
    </div>
  )
}

function FormEvento({ privada, onCerrar, onGuardado }) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('junta')
  const [fecha, setFecha] = useState('')
  const [lugar, setLugar] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) return setError('Escribe el título de la reunión.')
    setGuardando(true)
    const { error: insErr } = await supabase.from('eventos').insert({
      privada_id: privada.id,
      titulo: titulo.trim(),
      tipo,
      fecha: fecha ? new Date(fecha).toISOString() : null,
      lugar: lugar.trim() || null,
      descripcion: descripcion.trim() || null,
    })
    setGuardando(false)
    if (insErr) return setError('No se pudo guardar: ' + insErr.message)
    onGuardado()
  }

  return (
    <ModalShell titulo="Agendar reunión" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Título *">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Asamblea general"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          >
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Fecha y hora">
          <input
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Lugar">
          <input
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Ej. Caseta de vigilancia"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Detalles">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </Campo>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Agendar reunión'}
        </button>
      </form>
    </ModalShell>
  )
}

function FormMinuta({ privada, eventos, onCerrar, onGuardado }) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [eventoId, setEventoId] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) return setError('Escribe el título del acta.')
    setGuardando(true)
    try {
      let path = null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('minutas').upload(path, archivo)
        if (upErr) throw upErr
      }
      const { error: insErr } = await supabase.from('minutas').insert({
        privada_id: privada.id,
        titulo: titulo.trim(),
        fecha: fecha || null,
        evento_id: eventoId || null,
        archivo_url: path,
      })
      if (insErr) throw insErr
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message || 'error'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalShell titulo="Subir acta / minuta" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Título *">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Acta de asamblea de julio"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Fecha">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        {eventos.length > 0 && (
          <Campo label="Reunión relacionada (opcional)">
            <select
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              <option value="">— Ninguna —</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Archivo (PDF o foto)">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </Campo>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Publicar acta'}
        </button>
      </form>
    </ModalShell>
  )
}

function ModalShell({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
