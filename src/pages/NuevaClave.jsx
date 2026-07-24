import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Pantalla que aparece cuando el usuario llega desde el enlace de
// "recuperar contraseña". Le permite fijar una clave nueva.
export default function NuevaClave() {
  const { updatePassword, setRecuperandoClave, signOut } = useAuth()
  const navigate = useNavigate()

  const cancelar = async () => {
    setRecuperandoClave(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== password2) return setError('Las dos contraseñas no coinciden.')
    setCargando(true)
    const { error } = await updatePassword(password)
    setCargando(false)
    if (error) return setError('No se pudo cambiar: ' + error.message)
    setListo(true)
    setTimeout(() => {
      setRecuperandoClave(false)
      navigate('/', { replace: true })
    }, 1600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-teal-700 to-teal-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl">
            🔑
          </div>
          <h1 className="text-xl font-bold text-slate-800">Nueva contraseña</h1>
          <p className="text-sm text-slate-500">Elige una contraseña para tu cuenta</p>
        </div>

        {listo ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-3 text-center">
            ¡Contraseña actualizada! Entrando a tu cuenta…
          </p>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nueva contraseña</label>
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
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Repite la contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Escríbela de nuevo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5 transition"
            >
              {cargando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="w-full text-center text-xs text-slate-500 hover:underline"
            >
              Cancelar y volver al inicio
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
