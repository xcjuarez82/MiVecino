import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))
const hoy = () => new Date().toISOString().slice(0, 10)

export default function Caja() {
  const { privada, isStaff, isAdmin } = useAuth()
  const [movs, setMovs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null) // {tipo}

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const { data } = await supabase
      .from('caja_movimientos')
      .select('*, vecinos(nombre, casa:casas(identificador))')
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
    setMovs(data || [])
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('caja_movimientos').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  const solicitarBaja = async (id) => {
    const motivo = prompt(
      '¿Por qué quieres eliminar este ingreso? El vecino verá el motivo y deberá autorizarlo.',
    )
    if (motivo === null) return
    const { error } = await supabase.rpc('solicitar_baja_ingreso', {
      p_mov_id: id,
      p_motivo: motivo,
    })
    if (error) return alert('No se pudo: ' + error.message)
    alert('Se envió la solicitud al vecino. Podrás eliminarlo cuando lo autorice.')
    cargar()
  }

  if (!isStaff) {
    return <SaldoVecino privada={privada} />
  }

  const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0)
  const egresos = movs.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0)
  const saldo = ingresos - egresos

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Caja (ahorro de la comunidad)</h1>

      <div className="bg-teal-700 text-white rounded-2xl p-5 shadow">
        <p className="text-teal-100 text-sm">Saldo actual</p>
        <p className="text-3xl font-bold">{money(saldo)}</p>
        <div className="flex gap-4 mt-2 text-xs text-teal-100">
          <span>Ingresos {money(ingresos)}</span>
          <span>Egresos {money(egresos)}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setForm({ tipo: 'ingreso' })} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5">
            + Ingreso
          </button>
          <button onClick={() => setForm({ tipo: 'egreso' })} className="rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5">
            + Gasto
          </button>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Movimientos</h2>
        {cargando ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
        ) : movs.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Aún no hay movimientos.</p>
        ) : (
          <div className="space-y-2">
            {movs.map((m) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{m.concepto}</p>
                  <p className="text-xs text-slate-500">
                    {m.fecha}
                    {m.vecinos
                      ? ` · ${
                          m.vecinos.casa?.identificador
                            ? 'Casa ' + m.vecinos.casa.identificador
                            : m.vecinos.nombre
                        }`
                      : ''}
                    {m.origen === 'pago' || m.origen === 'sobrepago' ? ' · automático' : ''}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className={`font-bold ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.tipo === 'ingreso' ? '+' : '−'}
                    {money(m.monto)}
                  </p>
                  {isAdmin &&
                    (m.tipo === 'ingreso' && m.vecino_id && !m.baja_autorizada ? (
                      m.baja_solicitada ? (
                        <span className="text-[10px] text-amber-600 leading-tight max-w-[70px]">
                          Esperando autorización
                        </span>
                      ) : (
                        <button
                          onClick={() => solicitarBaja(m.id)}
                          className="text-[10px] text-slate-400 hover:text-red-500"
                        >
                          Solicitar baja
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => borrar(m.id)}
                        title={m.baja_autorizada ? 'Autorizado por el vecino' : 'Eliminar'}
                        className="text-[11px] text-slate-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {form && (
        <FormMov
          privada={privada}
          tipo={form.tipo}
          onCerrar={() => setForm(null)}
          onGuardado={() => {
            setForm(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function SaldoVecino({ privada }) {
  const [saldo, setSaldo] = useState(null)
  useEffect(() => {
    if (!privada) return
    supabase
      .rpc('saldo_caja', { p_privada_id: privada.id })
      .then(({ data }) => setSaldo(Number(data || 0)))
  }, [privada])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Ahorro de la comunidad</h1>
      <div className="bg-teal-700 text-white rounded-2xl p-5 shadow">
        <p className="text-teal-100 text-sm">Saldo actual</p>
        <p className="text-3xl font-bold">{saldo === null ? '…' : money(saldo)}</p>
      </div>
      <p className="text-xs text-slate-400">
        El detalle de ingresos y gastos lo administra la mesa directiva.
      </p>
    </div>
  )
}

function FormMov({ privada, tipo, onCerrar, onGuardado }) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [vecinoId, setVecinoId] = useState('')
  const [vecinos, setVecinos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (tipo !== 'ingreso') return
    supabase
      .from('vecinos')
      .select('id, nombre, casa:casas(identificador)')
      .eq('autorizado', true)
      .eq('estatus', 'activo')
      .order('nombre')
      .then(({ data }) => setVecinos(data || []))
  }, [tipo])

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!concepto.trim()) return setError('Escribe el concepto.')
    if (!monto || Number(monto) <= 0) return setError('Escribe el monto.')
    if (tipo === 'ingreso' && !vecinoId)
      return setError('Indica de qué casa viene el ingreso.')
    setGuardando(true)
    const { error } = await supabase.from('caja_movimientos').insert({
      privada_id: privada.id,
      tipo,
      concepto: concepto.trim(),
      monto: Number(monto),
      origen: 'manual',
      vecino_id: tipo === 'ingreso' ? vecinoId : null,
      fecha,
    })
    setGuardando(false)
    if (error) return setError('No se pudo: ' + error.message)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <form onSubmit={guardar} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto'}
          </h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">×</button>
        </div>
        {tipo === 'ingreso' && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              ¿De qué casa viene? *
            </label>
            <select
              value={vecinoId}
              onChange={(e) => setVecinoId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              <option value="">— Selecciona la casa —</option>
              {vecinos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.casa?.identificador ? `Casa ${v.casa.identificador} · ` : ''}
                  {v.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Concepto *</label>
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={tipo === 'ingreso' ? 'Ej. Aportación extra' : 'Ej. Reparación de bomba'} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monto *</label>
            <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={guardando} className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  )
}
