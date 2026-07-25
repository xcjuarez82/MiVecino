import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Onboarding() {
  const { user, signOut, refrescarPerfil } = useAuth()
  const [modo, setModo] = useState('elegir') // elegir | crear | token | solicitud

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-700 to-teal-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div className="text-center mb-5">
          <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl">
            🏘️
          </div>
          <h1 className="text-lg font-bold text-slate-800">¡Bienvenido!</h1>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>

        {modo === 'elegir' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 text-center mb-2">
              ¿Cómo quieres empezar?
            </p>
            <BotonModo
              icono="🏗️"
              titulo="Crear mi privada"
              texto="Soy administrador y voy a dar de alta mi privada."
              onClick={() => setModo('crear')}
            />
            <BotonModo
              icono="🎫"
              titulo="Tengo un código de invitación"
              texto="El administrador me envió un token para mi casa."
              onClick={() => setModo('token')}
            />
            <BotonModo
              icono="📩"
              titulo="Unirme a mi privada"
              texto="Tengo el código de la privada y elijo mi casa (el admin me autoriza)."
              onClick={() => setModo('solicitud')}
            />
          </div>
        )}

        {modo === 'crear' && (
          <CrearPrivada onBack={() => setModo('elegir')} onDone={refrescarPerfil} />
        )}
        {modo === 'token' && (
          <CanjearToken onBack={() => setModo('elegir')} onDone={refrescarPerfil} />
        )}
        {modo === 'solicitud' && (
          <Solicitud onBack={() => setModo('elegir')} onDone={refrescarPerfil} />
        )}

        <button
          onClick={signOut}
          className="mt-5 w-full text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function BotonModo({ icono, titulo, texto, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 p-4 transition"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icono}</span>
        <div>
          <p className="font-semibold text-slate-800">{titulo}</p>
          <p className="text-xs text-slate-500">{texto}</p>
        </div>
      </div>
    </button>
  )
}

function Encabezado({ onBack, titulo }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button onClick={onBack} className="text-slate-400 text-xl">
        ←
      </button>
      <h2 className="font-bold text-slate-800">{titulo}</h2>
    </div>
  )
}

function CrearPrivada({ onBack, onDone }) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [numCasas, setNumCasas] = useState('')
  const [nombreAdmin, setNombreAdmin] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre de la privada.')
    setCargando(true)
    const { error } = await supabase.rpc('crear_privada_y_admin', {
      p_nombre: nombre.trim(),
      p_direccion: direccion.trim() || null,
      p_numero_casas: parseInt(numCasas || '0', 10) || 0,
      p_nombre_admin: nombreAdmin.trim() || null,
    })
    setCargando(false)
    if (error) return setError('No se pudo crear: ' + error.message)
    await onDone()
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Encabezado onBack={onBack} titulo="Crear mi privada" />
      <Campo label="Nombre de la privada *" value={nombre} onChange={setNombre} placeholder="Ej. Privada Los Cipreses" />
      <Campo label="Dirección" value={direccion} onChange={setDireccion} placeholder="Calle y número" />
      <Campo label="Número de casas" type="number" value={numCasas} onChange={setNumCasas} placeholder="Ej. 20" />
      <Campo label="Tu nombre (administrador)" value={nombreAdmin} onChange={setNombreAdmin} placeholder="Ej. Juan Pérez" />
      {error && <Error texto={error} />}
      <Boton cargando={cargando} texto="Crear privada" />
    </form>
  )
}

function traducirUnion(msg = '') {
  const m = (msg || '').toLowerCase()
  if (
    m.includes('permission denied') ||
    m.includes('jwt') ||
    m.includes('not authenticated') ||
    m.includes('iniciar sesión') ||
    m.includes('401')
  )
    return 'Primero confirma tu correo (revisa tu bandeja) e inicia sesión. Luego vuelve a unirte.'
  if (m.includes('inválido') || m.includes('utilizado') || m.includes('invalid') || m.includes('encontr'))
    return 'Código inválido, vencido o ya utilizado. Pide al administrador un código nuevo.'
  if (m.includes('máximo') || m.includes('usuarios') || m.includes('lugares') || m.includes('llena'))
    return 'Esa casa ya está llena. Pide al administrador que te asigne otra casa o active una licencia.'
  if (m.includes('suspend'))
    return 'Tu cuenta en esa privada está suspendida. Contacta al administrador.'
  return msg || 'No se pudo. Inténtalo de nuevo.'
}

function CanjearToken({ onBack, onDone }) {
  const [token, setToken] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (!token.trim()) return setError('Escribe el código de invitación.')
    setCargando(true)
    const { error } = await supabase.rpc('canjear_invitacion', {
      p_token: token.trim(),
      p_nombre: nombre.trim() || null,
    })
    setCargando(false)
    if (error) return setError(traducirUnion(error.message))
    await onDone()
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Encabezado onBack={onBack} titulo="Código de invitación" />
      <Campo label="Código / token *" value={token} onChange={setToken} placeholder="El que te dio el administrador" />
      <Campo label="Tu nombre" value={nombre} onChange={setNombre} placeholder="Ej. María López" />
      {error && <Error texto={error} />}
      <Boton cargando={cargando} texto="Unirme" />
    </form>
  )
}

function Solicitud({ onBack, onDone }) {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [casas, setCasas] = useState([])
  const [privadaNombre, setPrivadaNombre] = useState('')
  const [casaSel, setCasaSel] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const buscar = async () => {
    setError('')
    setCasas([])
    setPrivadaNombre('')
    if (!codigo.trim()) return setError('Escribe el código de la privada.')
    setBuscando(true)
    const { data, error } = await supabase.rpc('casas_por_codigo', {
      p_codigo: codigo.trim(),
    })
    setBuscando(false)
    if (error) return setError(traducirUnion(error.message))
    if (!data || data.length === 0) return setError('No encontré ninguna privada con ese código.')
    setPrivadaNombre(data[0].privada_nombre)
    setCasas(data)
  }

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (!casaSel) return setError('Elige tu casa.')
    setCargando(true)
    const { error } = await supabase.rpc('solicitar_union', {
      p_codigo: codigo.trim(),
      p_casa_identificador: casaSel,
      p_nombre: nombre.trim() || null,
    })
    setCargando(false)
    if (error) return setError(traducirUnion(error.message))
    await onDone()
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Encabezado onBack={onBack} titulo="Unirme a mi privada" />
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Código de la privada *
        </label>
        <div className="flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="El que te dio el admin"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <button
            type="button"
            onClick={buscar}
            disabled={buscando}
            className="rounded-lg bg-slate-700 text-white px-3 text-sm font-medium disabled:opacity-60"
          >
            {buscando ? '…' : 'Buscar'}
          </button>
        </div>
      </div>

      {privadaNombre && (
        <>
          <p className="text-sm text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
            Privada encontrada: <b>{privadaNombre}</b>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Tu casa *
            </label>
            <select
              value={casaSel}
              onChange={(e) => setCasaSel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              <option value="">— Elige tu casa —</option>
              {casas.map((c) => (
                <option key={c.casa_id} value={c.identificador}>
                  Casa {c.identificador}
                </option>
              ))}
            </select>
          </div>
          <Campo label="Tu nombre" value={nombre} onChange={setNombre} placeholder="Ej. María López" />
        </>
      )}

      {error && <Error texto={error} />}
      {privadaNombre && <Boton cargando={cargando} texto="Enviar solicitud" />}
    </form>
  )
}

// ---- pequeños componentes reutilizables ----
function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
      />
    </div>
  )
}
function Error({ texto }) {
  return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{texto}</p>
}
function Boton({ cargando, texto }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
    >
      {cargando ? 'Un momento…' : texto}
    </button>
  )
}
