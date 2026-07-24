import { useAuth } from '../context/AuthContext'
import Layout from './Layout'
import Onboarding from '../pages/Onboarding'
import PendingApproval from '../pages/PendingApproval'
import NuevaClave from '../pages/NuevaClave'

// Decide qué mostrar según el estado del usuario:
// - sin ficha de vecino  -> Onboarding (crear privada o unirse)
// - vecino sin autorizar -> pantalla de "esperando autorización"
// - vecino autorizado    -> la app normal (Layout con menú)
export default function AppGate() {
  const { loading, vecino, recuperandoClave } = useAuth()

  // Prioridad: si viene de un enlace de recuperación, elige nueva contraseña.
  if (recuperandoClave) return <NuevaClave />

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando…
      </div>
    )
  }
  if (!vecino) return <Onboarding />
  if (!vecino.autorizado) return <PendingApproval />
  return <Layout />
}
