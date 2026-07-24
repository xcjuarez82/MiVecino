import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Accesos() {
  const { privada, isAdmin } = useAuth()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Acceso a…</h1>
        <p className="text-sm text-slate-500">
          Claves de accesos comunes (contenedores, portones, etc.).
        </p>
      </div>
      {isAdmin ? <AccesosAdmin privada={privada} /> : <AccesosVecino />}
    </div>
  )
}

/* ---------------- Vista del VECINO ---------------- */
function AccesosVecino() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [verId, setVerId] = useState(null)

  useEffect(() => {
    supabase.rpc('listar_accesos_vecino').then(({ data }) => {
      setLista(data || [])
      setCargando(false)
    })
  }, [])

  if (cargando) return <Cargando />
  if (lista.length === 0) return <Vacio texto="Aún no hay accesos configurados." />

  return (
    <div className="space-y-2">
      {lista.map((a) => (
        <div key={a.id} className="bg-white rounded-xl shadow-sm p-4">
          <p className="font-semibold text-slate-800">{a.nombre}</p>
          {a.instrucciones && (
            <p className="text-xs text-slate-500 mt-0.5">{a.instrucciones}</p>
          )}
          <div className="mt-3">
            {a.puede_ver ? (
              <button
                onClick={() => setVerId(verId === a.id ? null : a.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 px-3 py-2"
              >
                <span className="text-xs text-teal-700 font-medium">Clave:</span>
                <span className="font-mono font-bold tracking-widest text-teal-800">
                  {verId === a.id ? a.clave : '••••••'}
                </span>
                <span className="text-[11px] text-teal-600">
                  {verId === a.id ? 'ocultar' : 'ver'}
                </span>
              </button>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                🔒 Clave no disponible. El administrador debe autorizarte (normalmente
                al estar al corriente de tus pagos).
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Vista del ADMIN ---------------- */
function AccesosAdmin({ privada }) {
  const [accesos, setAccesos] = useState([])
  const [vecinos, setVecinos] = useState([])
  const [permisos, setPermisos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [gestion, setGestion] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [aRes, vRes, pRes] = await Promise.all([
      supabase.from('accesos').select('*').order('nombre'),
      supabase
        .from('vecinos')
        .select('id, nombre, casa:casas(identificador)')
        .eq('autorizado', true)
        .order('nombre'),
      supabase.from('acceso_permisos').select('acceso_id, vecino_id'),
    ])
    setAccesos(aRes.data || [])
    setVecinos(vRes.data || [])
    setPermisos(pRes.data || [])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este acceso?')) return
    const { error } = await supabase.from('accesos').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  const nAutorizados = (accesoId) =>
    permisos.filter((p) => p.acceso_id === accesoId).length

  if (cargando) return <Cargando />

  return (
    <div className="space-y-3">
      <button
        onClick={() => setEditando({})}
        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5"
      >
        + Nuevo acceso
      </button>

      {accesos.length === 0 ? (
        <Vacio texto="Crea el primer acceso (ej. Contenedores de basura)." />
      ) : (
        accesos.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {a.nombre}
                  {!a.activo && (
                    <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">
                      inactivo
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  Clave:{' '}
                  <span className="font-mono font-semibold text-slate-700">{a.clave}</span>
                </p>
                {a.instrucciones && (
                  <p className="text-xs text-slate-400 mt-0.5">{a.instrucciones}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setGestion(a)}
                className="text-xs rounded-lg bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1.5 font-medium"
              >
                Autorizados ({nAutorizados(a.id)})
              </button>
              <button
                onClick={() => setEditando(a)}
                className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600"
              >
                Editar
              </button>
              <button
                onClick={() => borrar(a.id)}
                className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-1.5"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}

      {editando && (
        <FormAcceso
          privada={privada}
          acceso={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            cargar()
          }}
        />
      )}
      {gestion && (
        <GestionPermisos
          privada={privada}
          acceso={gestion}
          vecinos={vecinos}
          permisos={permisos.filter((p) => p.acceso_id === gestion.id)}
          onCerrar={() => setGestion(null)}
          onCambio={cargar}
        />
      )}
    </div>
  )
}

function FormAcceso({ privada, acceso, onCerrar, onGuardado }) {
  const esNuevo = !acceso.id
  const [nombre, setNombre] = useState(acceso.nombre || '')
  const [clave, setClave] = useState(acceso.clave || '')
  const [instrucciones, setInstrucciones] = useState(acceso.instrucciones || '')
  const [activo, setActivo] = useState(acceso.activo ?? true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre del acceso.')
    setGuardando(true)
    const datos = {
      privada_id: privada.id,
      nombre: nombre.trim(),
      clave: clave.trim() || null,
      instrucciones: instrucciones.trim() || null,
      activo,
    }
    const resp = esNuevo
      ? await supabase.from('accesos').insert(datos)
      : await supabase.from('accesos').update(datos).eq('id', acceso.id)
    setGuardando(false)
    if (resp.error) return setError('No se pudo guardar: ' + resp.error.message)
    onGuardado()
  }

  return (
    <Modal onCerrar={onCerrar} titulo={esNuevo ? 'Nuevo acceso' : 'Editar acceso'}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Nombre *" value={nombre} onChange={setNombre} placeholder="Ej. Contenedores de basura" />
        <Campo
          label="Combinación / clave"
          value={clave}
          onChange={setClave}
          placeholder="Ej. 1234, 45-89-12, ABCD…"
        />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Instrucciones (opcional)
          </label>
          <textarea
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            rows={2}
            placeholder="Ej. Candado del portón junto a la caseta."
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
          Activo
        </label>
        {error && <ErrorMsg texto={error} />}
        <BotonGuardar cargando={guardando} />
      </form>
    </Modal>
  )
}

function GestionPermisos({ privada, acceso, vecinos, permisos, onCerrar, onCambio }) {
  const [locales, setLocales] = useState(() => new Set(permisos.map((p) => p.vecino_id)))
  const [guardando, setGuardando] = useState('')

  const toggle = async (vecinoId) => {
    setGuardando(vecinoId)
    const yaTiene = locales.has(vecinoId)
    if (yaTiene) {
      const { error } = await supabase
        .from('acceso_permisos')
        .delete()
        .eq('acceso_id', acceso.id)
        .eq('vecino_id', vecinoId)
      if (!error) {
        const s = new Set(locales)
        s.delete(vecinoId)
        setLocales(s)
      } else alert('No se pudo: ' + error.message)
    } else {
      const { error } = await supabase.from('acceso_permisos').insert({
        privada_id: privada.id,
        acceso_id: acceso.id,
        vecino_id: vecinoId,
      })
      if (!error) setLocales(new Set(locales).add(vecinoId))
      else alert('No se pudo: ' + error.message)
    }
    setGuardando('')
    onCambio()
  }

  return (
    <Modal onCerrar={onCerrar} titulo={`¿Quién ve la clave? — ${acceso.nombre}`}>
      <p className="text-xs text-slate-500 mb-2">
        Marca a los vecinos que están al corriente para que puedan ver la clave.
      </p>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {vecinos.map((v) => (
          <label
            key={v.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="text-sm text-slate-700">
              {v.nombre}
              {v.casa?.identificador ? ` · Casa ${v.casa.identificador}` : ''}
            </span>
            <input
              type="checkbox"
              checked={locales.has(v.id)}
              disabled={guardando === v.id}
              onChange={() => toggle(v.id)}
              className="h-5 w-5"
            />
          </label>
        ))}
      </div>
    </Modal>
  )
}

/* ---------------- utilitarios ---------------- */
function Cargando() {
  return <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
}
function Vacio({ texto }) {
  return <p className="text-sm text-slate-400 bg-white rounded-xl p-4">{texto}</p>
}
function ErrorMsg({ texto }) {
  return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{texto}</p>
}
function Campo({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
      />
    </div>
  )
}
function BotonGuardar({ cargando }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
    >
      {cargando ? 'Guardando…' : 'Guardar'}
    </button>
  )
}
function Modal({ titulo, children, onCerrar }) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <button onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
