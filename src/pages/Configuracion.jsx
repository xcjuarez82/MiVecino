import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { temaGuardado, guardarTema } from '../lib/tema'

export const APP_NOMBRE = 'Mi Vecino'
export const APP_VERSION = '1.0.0'

export default function Configuracion() {
  const { privada, vecino, casa, isAdmin, refrescarPerfil } = useAuth()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Configuración</h1>

      {/* ---- Cuenta ---- */}
      <MiCuenta vecino={vecino} casa={casa} refrescar={refrescarPerfil} />

      {/* ---- Cambiar correo (una sola vez) ---- */}
      <CambiarCorreo vecino={vecino} />

      {/* ---- Cambiar contraseña ---- */}
      <CambiarClave />

      {/* ---- Apariencia ---- */}
      <Apariencia />

      {/* ---- Notificaciones ---- */}
      <Notificaciones />

      {/* ---- Privacidad ---- */}
      <Privacidad vecino={vecino} refrescar={refrescarPerfil} />

      {/* ---- Números de emergencia (todos) ---- */}
      <Link
        to="/emergencia"
        className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">🚨</div>
          <div>
            <p className="font-semibold text-slate-800">Números de emergencia</p>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'Agrega y edita los números de la comunidad' : 'Consulta y llama'}
            </p>
          </div>
        </div>
      </Link>

      {/* ---- Datos de la comunidad (solo admin) ---- */}
      {isAdmin && <DatosPrivada privada={privada} refrescar={refrescarPerfil} />}
      {isAdmin && <ParticipacionConfig privada={privada} refrescar={refrescarPerfil} />}
      {/* Licencia en pausa — límites universales: 50 casas / 2 usuarios por casa */}

      {/* ---- Accesos rápidos del admin ---- */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-3">
          <EnlaceCard to="/conceptos" icono="💳" titulo="Configurar cobros" texto="Mantenimiento y otros conceptos de pago" />
          <EnlaceCard to="/caja" icono="🏦" titulo="Caja / ahorro" texto="Saldo, ingresos y gastos" />
        </div>
      )}

      {/* ---- Manual / Ayuda ---- */}
      <a
        href="/manual.html"
        target="_blank"
        rel="noreferrer"
        className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">📘</div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">Manual y ayuda</p>
            <p className="text-xs text-slate-500">Cómo usar la app, paso a paso</p>
          </div>
          <div className="ml-auto text-slate-300 text-lg">↗</div>
        </div>
      </a>

      {/* ---- Información ---- */}
      <Informacion />

      {/* ---- Donaciones al desarrollador ---- */}
      <Donaciones />

      {/* ---- Salir de la comunidad ---- */}
      <SalirComunidad />

      {/* ---- Eliminar cuenta ---- */}
      <EliminarCuenta />

      {/* ---- Desarrollado por ---- */}
      <DesarrolladoPor />
    </div>
  )
}

function EnlaceCard({ to, icono, titulo, texto }) {
  return (
    <Link to={to} className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icono}</div>
        <div>
          <p className="font-semibold text-slate-800">{titulo}</p>
          <p className="text-xs text-slate-500">{texto}</p>
        </div>
      </div>
    </Link>
  )
}

function MiCuenta({ vecino, casa, refrescar }) {
  const [nombre, setNombre] = useState(vecino?.nombre || '')
  const [telefono, setTelefono] = useState(vecino?.telefono || '')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!nombre.trim()) return setError('Tu nombre es obligatorio.')
    setGuardando(true)
    const { error } = await supabase
      .from('vecinos')
      .update({ nombre: nombre.trim(), telefono: telefono.trim() || null })
      .eq('id', vecino.id)
    setGuardando(false)
    if (error) return setError('No se pudo guardar: ' + error.message)
    setMsg('¡Datos actualizados!')
    await refrescar()
  }

  return (
    <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Cuenta</p>
      <p className="text-xs text-slate-400 -mt-2">{vecino?.email || ''}</p>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Nombre *</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="10 dígitos"
          inputMode="tel"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Número de casa</label>
        <input
          value={casa?.identificador ? `Casa ${casa.identificador}` : 'Sin casa asignada'}
          disabled
          className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-500 px-3 py-2.5"
        />
        <p className="text-xs text-slate-400 mt-1">
          Tu casa no se puede cambiar aquí; se define con la invitación inicial.
        </p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
      >
        {guardando ? 'Guardando…' : 'Guardar mis datos'}
      </button>
    </form>
  )
}

function Apariencia() {
  const [tema, setTema] = useState(temaGuardado())
  const opciones = [
    { v: 'light', t: '☀️ Claro' },
    { v: 'dark', t: '🌙 Oscuro' },
    { v: 'system', t: '⚙️ Automático' },
  ]
  const cambiar = (v) => {
    setTema(v)
    guardarTema(v)
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Apariencia</p>
      <div className="flex gap-2">
        {opciones.map((o) => (
          <button
            key={o.v}
            onClick={() => cambiar(o.v)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
              tema === o.v
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">“Automático” sigue el modo claro/oscuro de tu teléfono.</p>
    </div>
  )
}

function Notificaciones() {
  const { refrescarPerfil } = useAuth()
  const [msg, setMsg] = useState('')

  const marcarLeidas = async () => {
    await supabase.rpc('marcar_notif_visto')
    await refrescarPerfil()
    setMsg('Marcadas como leídas')
    setTimeout(() => setMsg(''), 1500)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Notificaciones</p>
      <p className="text-sm text-slate-600">
        Recibes avisos en la 🔔 campanita sobre: nuevos proyectos, cobros, avisos y juntas.
        El administrador también recibe aviso cuando llega un pago por validar.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={marcarLeidas}
          className="rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold px-4 py-2"
        >
          Marcar todo como leído
        </button>
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
      </div>
    </div>
  )
}

function Privacidad({ vecino, refrescar }) {
  const [verNombre, setVerNombre] = useState(vecino?.mostrar_nombre ?? true)
  const [verTel, setVerTel] = useState(vecino?.mostrar_telefono ?? true)
  const [msg, setMsg] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    setMsg('')
    const { error } = await supabase
      .from('vecinos')
      .update({ mostrar_nombre: verNombre, mostrar_telefono: verTel })
      .eq('id', vecino.id)
    setGuardando(false)
    if (error) return alert('No se pudo: ' + error.message)
    setMsg('Guardado')
    setTimeout(() => setMsg(''), 1500)
    refrescar()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Privacidad</p>
      <label className="flex items-center justify-between text-sm text-slate-700">
        Mostrar mi nombre a otros vecinos
        <input type="checkbox" checked={verNombre} onChange={(e) => setVerNombre(e.target.checked)} className="h-5 w-5" />
      </label>
      <label className="flex items-center justify-between text-sm text-slate-700">
        Mostrar mi teléfono a otros vecinos
        <input type="checkbox" checked={verTel} onChange={(e) => setVerTel(e.target.checked)} className="h-5 w-5" />
      </label>
      <p className="text-[11px] text-slate-400">
        Si los ocultas, los demás vecinos solo verán tu número de casa. El administrador siempre
        ve tus datos.
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

function DatosPrivada({ privada, refrescar }) {
  const [nombre, setNombre] = useState(privada?.nombre || '')
  const [direccion, setDireccion] = useState(privada?.direccion || '')
  const [numCasas, setNumCasas] = useState(String(privada?.numero_casas ?? ''))
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!nombre.trim()) return setError('El nombre de la comunidad es obligatorio.')
    // Campo vacío = no cambiar el número de casas (evita dejarlo en 0 sin querer).
    const nCasas = numCasas.trim() === '' ? null : Math.max(parseInt(numCasas, 10) || 0, 0)
    if (nCasas !== null && privada?.max_casas && nCasas > privada.max_casas) {
      return setError(
        `Tu plan permite hasta ${privada.max_casas} casas. Baja el número (o activa una licencia). Tu nombre y dirección sí se pueden guardar.`,
      )
    }
    setGuardando(true)
    const { error } = await supabase.rpc('configurar_privada', {
      p_privada_id: privada.id,
      p_nombre: nombre.trim(),
      p_direccion: direccion.trim() || null,
      p_numero_casas: nCasas,
    })
    setGuardando(false)
    if (error) return setError('No se pudo guardar: ' + error.message)
    setMsg('¡Guardado! Si aumentaste el número de casas, las nuevas ya se crearon.')
    await refrescar()
  }

  return (
    <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        Datos de la comunidad
      </p>
      <p className="text-[11px] text-slate-400 -mt-2">
        Este nombre aparece en los recibos (fraccionamiento o condominio).
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Nombre de la comunidad *
        </label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Dirección</label>
        <input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Número de casas</label>
        <input
          type="number"
          min="0"
          value={numCasas}
          onChange={(e) => setNumCasas(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <p className="text-xs text-slate-400 mt-1">
          Si lo aumentas, se agregan las casas nuevas automáticamente. Reducirlo no borra casas
          existentes.
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-800">
          Código para invitar vecinos:{' '}
          <span className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded">
            {privada?.codigo || '—'}
          </span>
        </p>
        <p className="text-[11px] text-amber-700 mt-1">
          Tu comunidad permite hasta {privada?.max_usuarios_casa ?? 2} usuarios por casa y {privada?.max_casas ?? 50} casas.
        </p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
      >
        {guardando ? 'Guardando…' : 'Guardar datos de la comunidad'}
      </button>
    </form>
  )
}

function ParticipacionConfig({ privada, refrescar }) {
  const [activo, setActivo] = useState(privada?.mostrar_participacion ?? false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')

  const cambiar = async (val) => {
    setActivo(val)
    setGuardando(true)
    setMsg('')
    const { error } = await supabase
      .from('privadas')
      .update({ mostrar_participacion: val })
      .eq('id', privada.id)
    setGuardando(false)
    if (error) {
      setActivo(!val)
      return alert('No se pudo: ' + error.message)
    }
    setMsg('Guardado')
    setTimeout(() => setMsg(''), 1500)
    refrescar()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Participación</p>
      <label className="flex items-center justify-between text-sm text-slate-700 gap-3">
        <span>
          Mostrar a los vecinos el nivel de participación (avance de cobros en “Otros” y de
          proyectos). Solo como estadístico, sin nombres.
        </span>
        <input
          type="checkbox"
          checked={activo}
          disabled={guardando}
          onChange={(e) => cambiar(e.target.checked)}
          className="h-5 w-5 shrink-0"
        />
      </label>
      {msg && <span className="text-xs text-emerald-600">{msg}</span>}
    </div>
  )
}

function Informacion() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Información</p>
      <FilaDato etiqueta="Aplicación" valor={APP_NOMBRE} />
      <FilaDato etiqueta="Versión" valor={APP_VERSION} />
      <FilaExpandible titulo="Licencias" detalle="Por ahora la app es gratuita (Free). Estamos preparando planes de pago; por ejemplo, un tercer usuario por casa requerirá una licencia adicional." />
      <FilaExpandible titulo="Política de privacidad" detalle="Tus datos se usan únicamente para administrar tu comunidad y no se comparten con terceros. El documento completo estará disponible próximamente en itouch.mx." />
      <FilaExpandible titulo="Términos de uso" detalle="Al usar la aplicación aceptas darle un uso lícito para la administración de tu comunidad. El documento completo estará disponible próximamente en itouch.mx." />
    </div>
  )
}

function FilaDato({ etiqueta, valor }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{etiqueta}</span>
      <span className="font-medium text-slate-800">{valor}</span>
    </div>
  )
}

function FilaExpandible({ titulo, detalle }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="border-t border-slate-100 pt-2">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="w-full flex items-center justify-between text-sm text-slate-700"
      >
        <span>{titulo}</span>
        <span className="text-slate-400">{abierto ? '▲' : '›'}</span>
      </button>
      {abierto && <p className="text-xs text-slate-500 mt-2">{detalle}</p>}
    </div>
  )
}

// Compra de licencia: el cobro lo crea la Edge Function crear-pago-licencia y el
// plan se activa SOLO cuando Mercado Pago confirma el pago (webhook mp-webhook).
const PRECIO_LICENCIA = '$160'

function LicenciaConfig({ privada, refrescar }) {
  const [clave, setClave] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [comprando, setComprando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const comprar = async () => {
    setError('')
    setMsg('')
    setComprando(true)
    const { data, error } = await supabase.functions.invoke('crear-pago-licencia', {
      method: 'POST',
    })
    setComprando(false)
    if (error || !data?.url) {
      return setError('No se pudo iniciar el pago en este momento. Inténtalo más tarde.')
    }
    window.location.href = data.url
  }

  const maxUsuarios = privada?.max_usuarios_casa ?? 2
  const maxCasas = privada?.max_casas ?? 10
  const esPago = maxUsuarios > 2 || maxCasas > 10

  const activar = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    const val = clave.trim()
    if (!val) return setError('Escribe tu clave de licencia.')
    setGuardando(true)
    const { data, error } = await supabase.rpc('activar_licencia', {
      p_privada_id: privada.id,
      p_clave: val,
    })
    setGuardando(false)
    if (error) {
      const m = error.message || ''
      if (m.includes('CLAVE_INVALIDA')) return setError('Esa clave no es válida.')
      if (m.includes('CLAVE_USADA')) return setError('Esa clave ya se usó en otra comunidad.')
      return setError('No se pudo: ' + m)
    }
    setMsg(
      '¡Licencia activada! Tu plan ahora permite ' +
        (data?.usuarios_por_casa ?? 5) +
        ' usuarios por casa y hasta ' +
        (data?.casas_max ?? 100) +
        ' casas.',
    )
    setClave('')
    await refrescar()
  }

  return (
    <form onSubmit={activar} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Licencia</p>
      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
        Plan actual:{' '}
        <b className={esPago ? 'text-emerald-700' : 'text-slate-700'}>
          {esPago ? 'De pago' : 'Gratuito (Free)'}
        </b>
        <br />
        {maxUsuarios} usuarios por casa · hasta {maxCasas} casas
      </div>

      {esPago ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Tu licencia está activa. ✅
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500 -mt-1">
            ¿Tienes una clave? Ingrésala para activar el plan de pago (5 usuarios por casa, 100
            casas).
          </p>
          <input
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Ej. MV-7F3A-9K2P-X4B8"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono uppercase"
          />
          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
          >
            {guardando ? 'Activando…' : 'Activar licencia'}
          </button>

          <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
            <p className="text-xs text-slate-500">
              ¿No tienes clave? Paga tu licencia completa ({PRECIO_LICENCIA}) y tu plan se activa
              <b> automáticamente</b> al confirmarse el pago.
            </p>
            <button
              type="button"
              onClick={comprar}
              disabled={comprando}
              className="w-full rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold py-2.5"
            >
              {comprando ? 'Abriendo pago…' : `Comprar licencia — ${PRECIO_LICENCIA}`}
            </button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>}
    </form>
  )
}

// === Donaciones al desarrollador ===
// Enlaces controlados ÚNICAMENTE por el desarrollador (Itouch). NO son editables
// desde la app: ningún administrador ni vecino puede agregar ni cambiar estos
// enlaces de cobro. Para actualizarlos se cambian aquí y se vuelve a publicar.
const DONAR_MERCADOPAGO = 'https://link.mercadopago.com.mx/itouchrys' // enlace oficial de Itouch (Mercado Pago)
const DONAR_PAYPAL = '' // enlace oficial de Itouch (PayPal)

function Donaciones() {
  const hayLinks = DONAR_MERCADOPAGO || DONAR_PAYPAL

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        Apoya al desarrollador
      </p>
      <p className="text-xs text-slate-500 -mt-1">
        Esta app se ofrece gratis. Si quieres apoyar su desarrollo, puedes donar.
      </p>

      <div className="flex flex-col gap-2">
        {DONAR_MERCADOPAGO && (
          <a
            href={DONAR_MERCADOPAGO}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold py-2.5 text-center"
          >
            Donar con Mercado Pago
          </a>
        )}
        {DONAR_PAYPAL && (
          <a
            href={DONAR_PAYPAL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 text-center"
          >
            Donar con PayPal
          </a>
        )}
        {!hayLinks && (
          <p className="text-xs text-slate-400">
            Muy pronto podrás apoyar al desarrollador desde aquí.
          </p>
        )}
      </div>
    </div>
  )
}

function CambiarCorreo({ vecino }) {
  const [abierto, setAbierto] = useState(false)
  const [nuevo, setNuevo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const yaCambiado = !!vecino?.email_cambiado

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    const correo = nuevo.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      return setError('Escribe un correo válido.')
    }
    if (correo === (vecino?.email || '').toLowerCase()) {
      return setError('Ese ya es tu correo actual.')
    }
    setCargando(true)
    // Envía un enlace de confirmación al correo nuevo. El cambio (y el "una sola
    // vez") se aplican SOLO cuando el vecino confirma desde ese enlace, así un
    // error de dedo no gasta el cambio ni te deja fuera.
    const { error: authErr } = await supabase.auth.updateUser({ email: correo })
    setCargando(false)
    if (authErr) {
      const m = (authErr.message || '').toLowerCase()
      if (m.includes('already') || m.includes('registered'))
        return setError('Ese correo ya está en uso por otra cuenta.')
      return setError('No se pudo: ' + authErr.message)
    }
    setMsg(
      'Te enviamos un enlace a ' +
        correo +
        '. Ábrelo para CONFIRMAR el cambio. Mientras no lo confirmes, sigues entrando con tu correo actual.',
    )
    setNuevo('')
    setAbierto(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Correo de acceso</p>
      <p className="text-sm text-slate-700 -mt-1">
        Actual: <b>{vecino?.email || '—'}</b>
      </p>

      {yaCambiado ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800">
            Ya cambiaste tu correo una vez. Para cambiarlo de nuevo, pide al administrador
            que te envíe una <b>nueva invitación</b>.
          </p>
        </div>
      ) : !abierto ? (
        <button
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold px-4 py-2"
        >
          Cambiar mi correo
        </button>
      ) : (
        <form onSubmit={guardar} className="space-y-2">
          <p className="text-[11px] text-slate-400">
            Solo puedes cambiarlo <b>una vez</b>. Recibirás un enlace en el correo nuevo para confirmarlo.
          </p>
          <input
            type="email"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            placeholder="nuevocorreo@ejemplo.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={cargando}
              className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60"
            >
              {cargando ? 'Enviando…' : 'Guardar correo'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                setError('')
              }}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  )
}

function CambiarClave() {
  const { user, resetPassword } = useAuth()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const enviar = async () => {
    setError('')
    setMsg('')
    if (!user?.email) return setError('No encontramos tu correo.')
    setCargando(true)
    const { error } = await resetPassword(user.email)
    setCargando(false)
    if (error) return setError('No se pudo: ' + error.message)
    setMsg(
      'Te enviamos un correo a ' +
        user.email +
        '. Ábrelo y ahí eliges tu nueva contraseña. Nada cambia hasta que confirmes desde ese correo.',
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contraseña</p>
      <p className="text-xs text-slate-500 -mt-1">
        Por seguridad, el cambio se confirma desde tu correo: te enviamos un enlace y ahí eliges la
        nueva contraseña.
      </p>
      <button
        onClick={enviar}
        disabled={cargando}
        className="rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold px-4 py-2 disabled:opacity-60"
      >
        {cargando ? 'Enviando…' : 'Cambiar contraseña'}
      </button>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  )
}

function SalirComunidad() {
  const { privada, refrescarPerfil } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const salir = async () => {
    setError('')
    setCargando(true)
    const { data, error } = await supabase.rpc('salir_de_comunidad')
    setCargando(false)
    if (error) return setError('No se pudo: ' + error.message)
    if (data === 'comunidad_pago') {
      return setError(
        'Tu comunidad tiene licencia de pago y eres el único integrante. Para darla de baja, contacta a soporte.',
      )
    }
    await refrescarPerfil()
    window.location.href = '/'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 border border-amber-200">
      <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
        Salir de la comunidad
      </p>
      <p className="text-xs text-slate-500">
        Dejas de pertenecer a <b>{privada?.nombre || 'esta comunidad'}</b>. Tu cuenta y tu correo
        siguen activos, así que podrás <b>unirte a otra comunidad</b>. Si hay más integrantes, otro
        queda como administrador y el historial se conserva. Si eres el <b>único integrante</b>
        (comunidad gratuita), la comunidad se borra por completo.
      </p>
      {!abierto ? (
        <button
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-amber-300 text-amber-700 text-sm font-semibold px-4 py-2 hover:bg-amber-50"
        >
          Salir de la comunidad
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            ¿Seguro que quieres salir de <b>{privada?.nombre || 'esta comunidad'}</b>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={salir}
              disabled={cargando}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {cargando ? 'Saliendo…' : 'Sí, salir'}
            </button>
            <button
              onClick={() => {
                setAbierto(false)
                setError('')
              }}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}

function EliminarCuenta() {
  const { signOut } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const eliminar = async () => {
    setError('')
    setCargando(true)
    const { data, error } = await supabase.functions.invoke('eliminar-cuenta', {
      method: 'POST',
    })
    // supabase-js pone el cuerpo del error en error.context (Response) para 4xx/5xx.
    let code = data?.error
    if (!code && error?.context?.json) {
      try {
        const body = await error.context.json()
        code = body?.error
      } catch {
        /* ignore */
      }
    }
    if (error || data?.error) {
      setCargando(false)
      if (code === 'comunidad_pago') {
        return setError(
          'Tu comunidad tiene licencia de pago y eres el único integrante. Para darla de baja sin perder los datos, contacta a soporte.',
        )
      }
      return setError('No se pudo eliminar la cuenta. Inténtalo de nuevo más tarde.')
    }
    // Cuenta eliminada: cerramos sesión.
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 border border-red-200">
      <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Eliminar mi cuenta</p>
      <p className="text-xs text-slate-500">
        Se elimina tu acceso a la app. Si hay más integrantes, el <b>historial de tu casa se
        conserva</b> y otro usuario queda como administrador. Si eres el <b>único integrante</b> de
        una comunidad gratuita, la comunidad y sus datos se borran por completo. No se puede deshacer.
      </p>

      {!abierto ? (
        <button
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-red-300 text-red-600 text-sm font-semibold px-4 py-2 hover:bg-red-50"
        >
          Eliminar mi cuenta
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            Para confirmar, escribe <b>ELIMINAR</b>:
          </p>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="ELIMINAR"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <div className="flex gap-2">
            <button
              onClick={eliminar}
              disabled={cargando || texto.trim().toUpperCase() !== 'ELIMINAR'}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {cargando ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
            </button>
            <button
              onClick={() => {
                setAbierto(false)
                setTexto('')
                setError('')
              }}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}

function DesarrolladoPor() {
  return (
    <div className="text-center text-xs text-slate-400 py-4 space-y-0.5">
      <p className="uppercase tracking-wide text-[10px] text-slate-400">Desarrollado por</p>
      <p className="font-semibold text-slate-500">Itouch · IRS.dev</p>
      <a href="https://itouch.mx" target="_blank" rel="noreferrer" className="text-teal-600">
        itouch.mx
      </a>
    </div>
  )
}
