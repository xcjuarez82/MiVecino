import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ICONO = { proyecto: '🏗️', cobro: '💳', aviso: '📣', baja: '⚠️', junta: '📅', validar: '📥' }

// A qué módulo lleva cada notificación al tocarla.
const rutaDe = (tipo) =>
  ({
    proyecto: '/proyectos',
    cobro: '/pagos?tab=otros',
    aviso: '/',
    junta: '/juntas',
    validar: '/pagos?tab=validar',
  }[tipo] || null)

export default function Campana() {
  const { vecino, refrescarPerfil } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [notifs, setNotifs] = useState([])
  const ref = useRef(null)

  const irA = (n) => {
    const r = rutaDe(n.tipo)
    if (!r) return
    setAbierto(false)
    navigate(r)
  }

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(30)
    setNotifs(data || [])
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const vistoEn = vecino?.notif_visto_en ? new Date(vecino.notif_visto_en).getTime() : 0
  const noLeidas = notifs.filter((n) => new Date(n.creado_en).getTime() > vistoEn).length

  const alternar = async () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    if (nuevo && noLeidas > 0) {
      await supabase.rpc('marcar_notif_visto')
      await refrescarPerfil()
    }
  }

  const responder = async (movId, autoriza) => {
    if (!movId) return
    const { error } = await supabase.rpc('responder_baja_ingreso', {
      p_mov_id: movId,
      p_autoriza: autoriza,
    })
    if (error) return alert('No se pudo: ' + error.message)
    alert(autoriza ? 'Autorizaste la eliminación.' : 'Rechazaste la solicitud.')
    cargar()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={alternar}
        title="Notificaciones"
        className="relative rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1.5 text-base leading-none"
      >
        🔔
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[88vw] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 z-30 text-slate-800">
          <div className="p-3 border-b border-slate-100 font-semibold text-slate-700 text-sm">
            Notificaciones
          </div>
          {notifs.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No tienes notificaciones.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifs.map((n) => {
                const nueva = new Date(n.creado_en).getTime() > vistoEn
                const conRuta = !!rutaDe(n.tipo)
                return (
                  <li key={n.id} className={`${nueva ? 'bg-teal-50/60' : ''}`}>
                    <div
                      onClick={() => irA(n)}
                      className={`p-3 flex gap-2 ${conRuta ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                    >
                      <span className="text-lg leading-none">{ICONO[n.tipo] || '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{n.titulo}</p>
                        {n.cuerpo && (
                          <p className="text-xs text-slate-500 whitespace-pre-line">{n.cuerpo}</p>
                        )}
                        {n.tipo === 'baja' && (
                          <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => responder(n.ref_id, true)}
                              className="text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 font-semibold"
                            >
                              Autorizar
                            </button>
                            <button
                              onClick={() => responder(n.ref_id, false)}
                              className="text-xs rounded-lg border border-slate-300 text-slate-600 px-3 py-1 font-semibold"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                        {conRuta && (
                          <p className="text-[10px] text-teal-600 mt-1">Toca para ver detalles →</p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
