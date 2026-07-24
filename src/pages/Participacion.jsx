import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const periodo = (anio, mes) => `${anio}-${String(mes + 1).padStart(2, '0')}`

export default function Participacion() {
  const { privada, isStaff } = useAuth()
  const [conceptos, setConceptos] = useState([])
  const [pagos, setPagos] = useState([])
  const [vecinos, setVecinos] = useState([])
  const [cargando, setCargando] = useState(true)

  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth())
  const [conceptoId, setConceptoId] = useState('')

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const [cRes, pRes, vRes] = await Promise.all([
      supabase.from('conceptos').select('*').eq('activo', true),
      supabase
        .from('pagos')
        .select('id, concepto_id, periodo, estatus, vecino_id, vecinos(nombre, casa:casas(identificador))')
        .eq('estatus', 'validado'),
      supabase
        .from('vecinos')
        .select('id, nombre, rol, casa:casas(identificador)')
        .eq('autorizado', true)
        .eq('estatus', 'activo'),
    ])
    const cs = (cRes.data || []).filter((c) => c.periodicidad === 'mensual' || c.tipo === 'mantenimiento')
    setConceptos(cs)
    setPagos(pRes.data || [])
    setVecinos(vRes.data || [])
    if (cs.length && !conceptoId) setConceptoId(cs[0].id)
    setCargando(false)
  }, [privada, conceptoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Padrón que paga = vecinos (rol 'vecino') con casa asignada. El denominador
  // y la lista de faltantes usan el MISMO padrón para ser consistentes
  // (no cuenta admin/tesorero/promotoría ni vecinos sin casa).
  const padron = useMemo(
    () => vecinos.filter((v) => v.rol === 'vecino' && v.casa),
    [vecinos],
  )
  const base = padron.length

  const conceptoSel = conceptos.find((c) => c.id === conceptoId)

  const pagadoresDe = useCallback(
    (cid, per) => {
      const set = new Set(
        pagos.filter((p) => p.concepto_id === cid && p.periodo === per).map((p) => p.vecino_id),
      )
      return set
    },
    [pagos],
  )

  const perSel = periodo(anio, mes)
  const pagadores = useMemo(() => pagadoresDe(conceptoId, perSel), [pagadoresDe, conceptoId, perSel])
  const faltantes = padron.filter((v) => !pagadores.has(v.id))
  const alCorriente = base - faltantes.length
  const pct = base > 0 ? Math.round((alCorriente / base) * 100) : 0

  if (!isStaff) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        <p className="text-slate-500">Esta sección es solo para la administración.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Participación vecinal</h1>
        <p className="text-sm text-slate-500">
          Qué tanto participan los vecinos en los pagos obligatorios (solo lectura).
        </p>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
      ) : conceptos.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
          Aún no hay conceptos mensuales configurados.
        </p>
      ) : (
        <>
          {/* Selector de concepto */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {conceptos.map((c) => (
              <button
                key={c.id}
                onClick={() => setConceptoId(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border transition ${
                  c.id === conceptoId
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Selector de periodo */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setAnio(anio - 1)} className="text-slate-500 px-2">‹</button>
            <span className="font-semibold text-slate-700">{anio}</span>
            <button onClick={() => setAnio(anio + 1)} className="text-slate-500 px-2">›</button>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Tarjeta de % del mes */}
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-sm text-slate-500">
              {conceptoSel?.nombre} · {MESES[mes]} {anio}
            </p>
            <p className="text-4xl font-bold text-teal-700 mt-1">{pct}%</p>
            <p className="text-sm text-slate-500 mt-1">
              {alCorriente} de {base} casas registradas al corriente
            </p>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Participación por mes (año actual del concepto) */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-600 mb-3">Participación mensual {anio}</p>
            <div className="flex items-end justify-between gap-1 h-28">
              {MESES_CORTO.map((m, i) => {
                const setMes = pagadoresDe(conceptoId, periodo(anio, i))
                const p = base > 0 ? (padron.filter((v) => setMes.has(v.id)).length / base) * 100 : 0
                return (
                  <button
                    key={m}
                    onClick={() => setMes(i)}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${m}: ${Math.round(p)}%`}
                  >
                    <div className="w-full bg-slate-100 rounded-md flex items-end h-20 overflow-hidden">
                      <div
                        className={`w-full rounded-md ${i === mes ? 'bg-teal-600' : 'bg-teal-300'}`}
                        style={{ height: `${p}%` }}
                      />
                    </div>
                    <span className={`text-[9px] ${i === mes ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
                      {m}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Faltantes del mes seleccionado */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-600 mb-2">
              Faltan por pagar ({faltantes.length})
            </p>
            {faltantes.length === 0 ? (
              <p className="text-sm text-emerald-600">¡Todos al corriente! 🎉</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {faltantes.map((v) => (
                  <li key={v.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm text-slate-700">
                      {v.casa?.identificador ? `Casa ${v.casa.identificador}` : v.nombre}
                    </span>
                    <span className="text-[11px] rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                      pendiente
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
