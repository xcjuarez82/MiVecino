import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genToken = () =>
  Array.from({ length: 6 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')

const ROLES = [
  { v: 'vecino', t: 'Vecino' },
  { v: 'tesorero', t: 'Tesorero' },
  { v: 'promotoria', t: 'Promotoría' },
  { v: 'admin', t: 'Administrador' },
]
const rolLabel = (v) => ROLES.find((r) => r.v === v)?.t || v

export default function Directorio() {
  const { isStaff } = useAuth()
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Directorio vecinal</h1>
      <MiPrivacidad />
      {isStaff ? <VistaStaff /> : <VistaVecino />}
    </div>
  )
}

/* ---------- Mi privacidad (todos) ---------- */
function MiPrivacidad() {
  const { vecino, refrescarPerfil } = useAuth()
  const [tel, setTel] = useState(vecino?.telefono || '')
  const [verNombre, setVerNombre] = useState(vecino?.mostrar_nombre ?? true)
  const [verTel, setVerTel] = useState(vecino?.mostrar_telefono ?? true)
  const [msg, setMsg] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    setMsg('')
    const { error } = await supabase
      .from('vecinos')
      .update({ telefono: tel.trim() || null, mostrar_nombre: verNombre, mostrar_telefono: verTel })
      .eq('id', vecino.id)
    setGuardando(false)
    if (error) return alert('No se pudo: ' + error.message)
    setMsg('Guardado')
    setTimeout(() => setMsg(''), 1500)
    refrescarPerfil()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="font-semibold text-slate-800 text-sm">Mi privacidad</p>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Mi teléfono</label>
        <input
          value={tel}
          onChange={(e) => setTel(e.target.value)}
          placeholder="Opcional"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center justify-between text-sm text-slate-700">
        Mostrar mi nombre a otros vecinos
        <input type="checkbox" checked={verNombre} onChange={(e) => setVerNombre(e.target.checked)} className="h-5 w-5" />
      </label>
      <label className="flex items-center justify-between text-sm text-slate-700">
        Mostrar mi teléfono a otros vecinos
        <input type="checkbox" checked={verTel} onChange={(e) => setVerTel(e.target.checked)} className="h-5 w-5" />
      </label>
      <p className="text-[11px] text-slate-400">
        Si los ocultas, los demás vecinos solo verán tu número de casa. El administrador
        siempre ve tus datos.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
      </div>
    </div>
  )
}

/* ---------- Vista del vecino normal: directorio enmascarado ---------- */
function VistaVecino() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.rpc('listar_directorio').then(({ data }) => {
      setLista(data || [])
      setCargando(false)
    })
  }, [])

  if (cargando) return <Cargando />
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">
        Vecinos ({lista.length})
      </h2>
      <div className="space-y-2">
        {lista.map((v) => (
          <div key={v.vecino_id} className="bg-white rounded-xl shadow-sm p-4">
            <p className="font-medium text-slate-800">
              {v.nombre || `Casa ${v.casa || '—'}`}
              {v.es_yo ? ' (tú)' : ''}
            </p>
            <p className="text-xs text-slate-500">
              {v.casa ? `Casa ${v.casa}` : 'Sin casa'}
              {v.telefono ? ` · ${v.telefono}` : ''}
              {v.rol !== 'vecino' ? ` · ${rolLabel(v.rol)}` : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------- Vista de staff (admin/tesorero/promotoría) ---------- */
function VistaStaff() {
  const { isAdmin, vecino: yo, privada } = useAuth()
  const [vecinos, setVecinos] = useState([])
  const [tokens, setTokens] = useState([])
  const [casas, setCasas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nuevoCasa, setNuevoCasa] = useState('')
  const [nuevoRol, setNuevoRol] = useState('vecino')

  const cargar = useCallback(async () => {
    setCargando(true)
    const [vRes, tRes, cRes] = await Promise.all([
      supabase.from('vecinos').select('*, casa:casas(identificador)').order('nombre'),
      supabase.from('invitaciones').select('*, casa:casas(identificador)').eq('usado', false).order('creado_en', { ascending: false }),
      supabase.from('casas').select('id, identificador'),
    ])
    setVecinos(vRes.data || [])
    setTokens(tRes.data || [])
    setCasas(
      (cRes.data || []).slice().sort((a, b) => a.identificador.localeCompare(b.identificador, undefined, { numeric: true })),
    )
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const upd = async (id, datos) => {
    const { error } = await supabase.from('vecinos').update(datos).eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }
  const rechazar = async (id) => {
    if (!confirm('¿Dar de baja a este vecino?')) return
    // Usa la baja segura: si el vecino tiene historial de pagos/aportaciones,
    // su ficha se anonimiza (se conserva el historial); si no, se elimina.
    const { error } = await supabase.rpc('admin_baja_vecino', { p_id: id })
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }
  const crearToken = async () => {
    const sinCasa = nuevoRol === 'promotoria'
    if (!sinCasa && !nuevoCasa) return alert('Elige la casa.')
    for (let i = 0; i < 5; i++) {
      const token = genToken()
      const { error } = await supabase
        .from('invitaciones')
        .insert({ privada_id: privada.id, casa_id: sinCasa ? null : nuevoCasa, token, rol: nuevoRol })
      if (!error) {
        setNuevoCasa('')
        setNuevoRol('vecino')
        cargar()
        return
      }
      if (!/duplicate|unique/i.test(error.message)) return alert('No se pudo: ' + error.message)
    }
  }
  const borrarToken = async (id) => {
    const { error } = await supabase.from('invitaciones').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  if (cargando) return <Cargando />
  const pendientes = vecinos.filter((v) => !v.autorizado)
  const activos = vecinos.filter((v) => v.autorizado)

  return (
    <div className="space-y-5">
      {!isAdmin && (
        <p className="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
          Rol de promotoría: puedes ver todo, pero no modificar.
        </p>
      )}

      {isAdmin && pendientes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 mb-2 uppercase tracking-wide">
            Solicitudes por autorizar ({pendientes.length})
          </h2>
          <div className="space-y-2">
            {pendientes.map((v) => (
              <div key={v.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-medium text-slate-800">{v.nombre}</p>
                <p className="text-xs text-slate-500">
                  {v.casa?.identificador ? `Casa ${v.casa.identificador}` : 'Sin casa'}
                  {v.email ? ` · ${v.email}` : ''}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => upd(v.id, { autorizado: true, estatus: 'activo' })}
                    className="text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-semibold"
                  >
                    Autorizar
                  </button>
                  <button
                    onClick={() => rechazar(v.id)}
                    className="text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 font-semibold"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          Códigos de invitación
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          {isAdmin && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={nuevoRol === 'promotoria' ? '' : nuevoCasa}
                  onChange={(e) => setNuevoCasa(e.target.value)}
                  disabled={nuevoRol === 'promotoria'}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">{nuevoRol === 'promotoria' ? 'Sin casa' : 'Casa…'}</option>
                  {casas.map((c) => (
                    <option key={c.id} value={c.id}>Casa {c.identificador}</option>
                  ))}
                </select>
                <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  {ROLES.map((r) => (
                    <option key={r.v} value={r.v}>{r.t}</option>
                  ))}
                </select>
                <button onClick={crearToken} className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-3">
                  Generar
                </button>
              </div>
              {nuevoRol === 'promotoria' && (
                <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1.5">
                  La promotoría no necesita casa: es de solo lectura y solo publica avisos y juntas.
                </p>
              )}
            </div>
          )}
          {tokens.length === 0 ? (
            <p className="text-xs text-slate-400">No hay códigos activos.</p>
          ) : (
            tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
                <div>
                  <p className="font-mono font-bold tracking-widest text-teal-700">{t.token}</p>
                  <p className="text-[11px] text-slate-400">
                    {t.casa?.identificador ? `Casa ${t.casa.identificador}` : 'Sin casa'} · {rolLabel(t.rol)}
                  </p>
                </div>
                {isAdmin && (
                  <button onClick={() => borrarToken(t.id)} className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          Vecinos ({activos.length})
        </h2>
        <div className="space-y-2">
          {activos.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">
                    {v.nombre}
                    {v.id === yo?.id ? ' (tú)' : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.casa?.identificador ? `Casa ${v.casa.identificador}` : 'Sin casa'}
                    {v.telefono ? ` · ${v.telefono}` : ''}
                    {v.estatus === 'inactivo' ? ' · inactivo' : ''}
                  </p>
                </div>
                {v.rol !== 'vecino' && (
                  <span className="text-[10px] bg-teal-100 text-teal-800 rounded px-1.5 py-0.5 font-semibold uppercase">
                    {rolLabel(v.rol)}
                  </span>
                )}
              </div>
              {isAdmin && v.id !== yo?.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select value={v.rol} onChange={(e) => upd(v.id, { rol: e.target.value })} className="text-xs rounded-lg border border-slate-300 px-2 py-1.5">
                    {ROLES.map((r) => (
                      <option key={r.v} value={r.v}>{r.t}</option>
                    ))}
                  </select>
                  {v.estatus === 'inactivo' ? (
                    <button onClick={() => upd(v.id, { estatus: 'activo' })} className="text-xs rounded-lg border border-emerald-300 text-emerald-700 px-3 py-1.5">
                      Reactivar
                    </button>
                  ) : (
                    <button onClick={() => upd(v.id, { estatus: 'inactivo' })} className="text-xs rounded-lg border border-slate-300 text-slate-600 px-3 py-1.5">
                      Dar de baja
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Cargando() {
  return <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
}
