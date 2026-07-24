import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Campana from './Campana'

const items = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/pagos', label: 'Pagos', icon: '💳' },
  { to: '/directorio', label: 'Vecinos', icon: '📖' },
  { to: '/accesos', label: 'Accesos', icon: '🔑' },
  { to: '/proyectos', label: 'Proyectos', icon: '🏗️' },
  { to: '/juntas', label: 'Juntas', icon: '📅' },
]

export default function Layout() {
  const { privada, vecino, casa, isAdmin, signOut, esAdminReal, verComoVecino, setVerComoVecino } =
    useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-teal-700 text-white sticky top-0 z-10 shadow">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[13px] leading-tight text-teal-100">Mi Vecino</p>
            <p className="font-semibold truncate">
              {privada?.nombre || 'Sin privada'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-1">
              <p className="text-sm font-medium leading-tight truncate max-w-[110px]">
                {vecino?.nombre || 'Vecino'}
              </p>
              <p className="text-[11px] text-teal-100">
                {isAdmin
                  ? vecino?.rol === 'tesorero'
                    ? 'Tesorero'
                    : 'Administrador'
                  : casa?.identificador
                    ? `Casa ${casa.identificador}`
                    : 'Vecino'}
              </p>
            </div>
            <Link
              to="/emergencia"
              title="Números de emergencia"
              className="rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1.5 text-base leading-none"
            >
              🚨
            </Link>
            <Campana />
            <Link
              to="/configuracion"
              title="Configuración"
              className="rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1.5 text-base leading-none"
            >
              ⚙️
            </Link>
            {esAdminReal && (
              <button
                onClick={() => setVerComoVecino(!verComoVecino)}
                title={verComoVecino ? 'Volver a administrador' : 'Ver como vecino'}
                className="rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1.5 text-base leading-none"
              >
                {verComoVecino ? '🛠️' : '👁️'}
              </button>
            )}
            <button
              onClick={signOut}
              title="Cerrar sesión"
              className="rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1.5 text-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {verComoVecino && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs sm:text-sm">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
            <span>👁️ Estás viendo la app como un vecino normal.</span>
            <button
              onClick={() => setVerComoVecino(false)}
              className="font-semibold underline shrink-0"
            >
              Volver a administrador
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-10">
        <div className="max-w-2xl mx-auto grid grid-cols-6">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  isActive ? 'text-teal-700' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg leading-none">{it.icon}</span>
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
