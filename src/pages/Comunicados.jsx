import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const vigente = (c) => {
  const fin = new Date(c.creado_en).getTime() + (c.dias_visible || 7) * 86400000
  return Date.now() < fin
}

export default function Comunicados() {
  const { privada, isAdmin, isStaff, user } = useAuth()
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(false)

  const cargar = useCallback(async () => {
    if (!privada) return
    const { data } = await supabase
      .from('comunicados')
      .select('*')
      .order('creado_en', { ascending: false })
    setLista(data || [])
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este aviso?')) return
    const { error } = await supabase.from('comunicados').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  const activos = lista.filter(vigente)

  if (!isStaff && activos.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          📣 Avisos
        </h2>
        {isStaff && (
          <button
            onClick={() => setForm(true)}
            className="text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5"
          >
            + Publicar
          </button>
        )}
      </div>

      {activos.length === 0 ? (
        <p className="text-xs text-slate-400 bg-white rounded-xl p-3">
          No hay avisos activos.
        </p>
      ) : (
        activos.map((c) => (
          <div key={c.id} className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-teal-900">{c.titulo}</p>
              {(isAdmin || c.autor_id === user?.id) && (
                <button onClick={() => borrar(c.id)} className="text-[11px] text-red-500 hover:underline shrink-0">
                  eliminar
                </button>
              )}
            </div>
            {c.cuerpo && <p className="text-sm text-teal-800 mt-1 whitespace-pre-line">{c.cuerpo}</p>}
            <p className="text-[11px] text-teal-500 mt-2">Visible por {c.dias_visible} día(s)</p>
          </div>
        ))
      )}

      {form && (
        <FormComunicado
          privada={privada}
          userId={user?.id}
          onCerrar={() => setForm(false)}
          onGuardado={() => {
            setForm(false)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function FormComunicado({ privada, userId, onCerrar, onGuardado }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [dias, setDias] = useState(7)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) return setError('Escribe el título del aviso.')
    setGuardando(true)
    const { error } = await supabase.from('comunicados').insert({
      privada_id: privada.id,
      titulo: titulo.trim(),
      cuerpo: cuerpo.trim() || null,
      dias_visible: dias,
      autor_id: userId || null,
    })
    setGuardando(false)
    if (error) return setError('No se pudo publicar: ' + error.message)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <form onSubmit={guardar} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Publicar aviso</h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">×</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Corte de agua el sábado" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Mensaje</label>
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">¿Cuántos días visible?</label>
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
            <option value={1}>1 día</option>
            <option value={3}>3 días</option>
            <option value={7}>7 días</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={guardando} className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5">
          {guardando ? 'Publicando…' : 'Publicar aviso'}
        </button>
      </form>
    </div>
  )
}
