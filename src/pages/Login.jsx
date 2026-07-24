import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [modo, setModo] = useState('entrar') // 'entrar' | 'registrar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [correoExistente, setCorreoExistente] = useState(false)

  const limpiar = () => {
    setError('')
    setAviso('')
    setCorreoExistente(false)
  }

  const enviar = async (e) => {
    e.preventDefault()
    limpiar()
    setCargando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await signIn(email.trim(), password)
        if (error) throw error
        navigate('/', { replace: true })
      } else {
        const { data, error } = await signUp(email.trim(), password)
        if (error) throw error
        // Supabase, por seguridad, no da error si el correo ya existe:
        // devuelve un usuario con identities vacío. Lo detectamos aquí.
        const yaRegistrado =
          data?.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        if (yaRegistrado) {
          setCorreoExistente(true)
        } else if (data?.session) {
          navigate('/', { replace: true })
        } else {
          setAviso(
            'Si el correo es nuevo, te enviamos un enlace para activarlo. Si ya tenías cuenta, inicia sesión o usa “Recuperar mi cuenta”.',
          )
          setModo('entrar')
        }
      }
    } catch (err) {
      setError(traducirError(err?.message))
    } finally {
      setCargando(false)
    }
  }

  const enviarRecuperacion = async () => {
    if (!email.trim()) {
      return setError('Escribe tu correo arriba para enviarte el enlace.')
    }
    limpiar()
    setCargando(true)
    const { error } = await resetPassword(email.trim())
    setCargando(false)
    if (error) return setError(traducirError(error.message))
    setAviso(
      'Te enviamos un correo para cambiar tu contraseña. Ábrelo y elige una nueva.',
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-teal-700 to-teal-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Mi Vecino — Comunidad Digital"
            className="mx-auto w-full max-w-[240px] h-auto rounded-xl"
            style={{ backgroundColor: '#ffffff', padding: '8px 12px' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-1 mb-5 bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => {
              setModo('entrar')
              limpiar()
            }}
            className={`py-2 rounded-lg text-sm font-medium transition ${
              modo === 'entrar' ? 'bg-white shadow text-teal-700' : 'text-slate-500'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('registrar')
              limpiar()
            }}
            className={`py-2 rounded-lg text-sm font-medium transition ${
              modo === 'registrar' ? 'bg-white shadow text-teal-700' : 'text-slate-500'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {aviso && (
            <p className="text-sm text-teal-700 bg-teal-50 rounded-lg px-3 py-2">{aviso}</p>
          )}

          {correoExistente && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-2">
              <p className="text-amber-800 font-medium">Este correo ya está registrado.</p>
              <p className="text-amber-700 text-xs">
                Puedes iniciar sesión, o si olvidaste tu contraseña, recupera tu cuenta.
              </p>
              <button
                type="button"
                onClick={enviarRecuperacion}
                disabled={cargando}
                className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 text-sm disabled:opacity-60"
              >
                Recuperar mi cuenta
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5 transition"
          >
            {cargando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>

          {modo === 'entrar' && (
            <button
              type="button"
              onClick={enviarRecuperacion}
              disabled={cargando}
              className="w-full text-center text-xs text-teal-600 hover:underline disabled:opacity-60"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function traducirError(msg = '') {
  const m = (msg || '').toLowerCase()
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered'))
    return 'Ese correo ya tiene una cuenta. Intenta iniciar sesión.'
  if (m.includes('email not confirmed'))
    return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.'
  if (m.includes('rate limit') || m.includes('seconds'))
    return 'Espera un momento antes de volver a intentarlo.'
  return msg || 'Ocurrió un error. Inténtalo de nuevo.'
}
