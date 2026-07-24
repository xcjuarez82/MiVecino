import { useAuth } from '../context/AuthContext'

export default function PendingApproval() {
  const { vecino, privada, casa, refrescarPerfil, signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-amber-500 to-amber-700">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7 text-center">
        <div className="text-5xl mb-3">⏳</div>
        <h1 className="text-lg font-bold text-slate-800 mb-1">
          Solicitud enviada
        </h1>
        <p className="text-sm text-slate-500">
          Tu solicitud para unirte a{' '}
          <span className="font-medium">{privada?.nombre || 'la privada'}</span>
          {casa?.identificador ? ` (Casa ${casa.identificador})` : ''} está
          esperando que el administrador confirme que eres el propietario.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Te avisará cuando quede autorizada. Registrado como{' '}
          {vecino?.nombre || 'vecino'}.
        </p>

        <button
          onClick={refrescarPerfil}
          className="mt-5 w-full rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5"
        >
          Ya me autorizaron — actualizar
        </button>
        <button
          onClick={signOut}
          className="mt-2 w-full rounded-lg border border-slate-300 text-slate-600 py-2.5 text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
