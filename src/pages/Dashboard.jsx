import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Comunicados from './Comunicados'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))

function AhorroCard({ privada }) {
  const [saldo, setSaldo] = useState(null)
  useEffect(() => {
    if (!privada) return
    supabase
      .rpc('saldo_caja', { p_privada_id: privada.id })
      .then(({ data }) => setSaldo(Number(data || 0)))
  }, [privada])
  if (saldo === null) return null
  return (
    <div className="bg-teal-700 text-white rounded-2xl p-5 shadow">
      <p className="text-teal-100 text-sm">Ahorro de la privada</p>
      <p className="text-3xl font-bold">{money(saldo)}</p>
    </div>
  )
}

export default function Dashboard() {
  const { vecino, privada, casa, isAdmin, isStaff } = useAuth()
  const esPromotor = isStaff && !isAdmin

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-800">
          Hola, {vecino?.nombre?.split(' ')[0] || 'vecino'} 👋
        </h2>
        <p className="text-sm text-slate-500">
          {privada?.nombre}
          {casa?.identificador ? ` · Casa ${casa.identificador}` : ''}
        </p>
      </div>

      <AhorroCard privada={privada} />

      <Comunicados />

      <div className="grid grid-cols-2 gap-3">
        <Link to="/pagos" className="bg-white rounded-2xl shadow-sm p-4 hover:shadow transition">
          <div className="text-2xl">💳</div>
          <p className="mt-2 font-semibold text-slate-800">Mis pagos</p>
          <p className="text-xs text-slate-500">Sube tu comprobante de mensualidad</p>
        </Link>
        <Link to="/juntas" className="bg-white rounded-2xl shadow-sm p-4 hover:shadow transition">
          <div className="text-2xl">📅</div>
          <p className="mt-2 font-semibold text-slate-800">Próxima junta</p>
          <p className="text-xs text-slate-500">Consulta el calendario</p>
        </Link>
      </div>

      {isStaff && (
        <Link
          to="/participacion"
          className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <p className="font-semibold text-slate-800">Participación vecinal</p>
              <p className="text-xs text-slate-500">
                % de casas al corriente por mes {esPromotor ? '(solo lectura)' : ''}
              </p>
            </div>
          </div>
        </Link>
      )}

      {isAdmin && (
        <div className="space-y-3">
          <Link
            to="/conceptos"
            className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚙️</div>
              <div>
                <p className="font-semibold text-slate-800">Configurar pagos</p>
                <p className="text-xs text-slate-500">
                  Define el mantenimiento y otros conceptos
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/configuracion"
            className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏘️</div>
              <div>
                <p className="font-semibold text-slate-800">Configurar comunidad</p>
                <p className="text-xs text-slate-500">
                  Nombre, dirección y número de casas
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/caja"
            className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow transition"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏦</div>
              <div>
                <p className="font-semibold text-slate-800">Caja / ahorro</p>
                <p className="text-xs text-slate-500">
                  Saldo, ingresos y gastos de la comunidad
                </p>
              </div>
            </div>
          </Link>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-semibold text-amber-900 text-sm mb-1">
              Datos de tu comunidad
            </p>
            <p className="text-xs text-amber-800">
              Código para invitar vecinos:{' '}
              <span className="font-mono font-bold tracking-wide bg-white/70 px-1.5 py-0.5 rounded">
                {privada?.codigo || '—'}
              </span>
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Casas registradas: <b>{privada?.numero_casas ?? 0}</b>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
