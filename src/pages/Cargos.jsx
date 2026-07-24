import { useEffect, useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))
const hoy = () => new Date().toISOString().slice(0, 10)

export default function Cargos() {
  const { isAdmin } = useAuth()
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
        Pagos como luz comunal, agua, etc. El monto total se reparte en partes iguales entre
        las casas seleccionadas.
      </p>
      {isAdmin ? <CargosAdmin /> : <CargosVecino />}
    </div>
  )
}

/* ---------- Vecino ---------- */
const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

function CargosVecino() {
  const { vecino, privada, isStaff } = useAuth()
  const [cargos, setCargos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [cRes, pRes] = await Promise.all([
      supabase.rpc('mis_cargos'),
      supabase.from('pagos').select('*').not('cargo_id', 'is', null),
    ])
    setCargos(cRes.data || [])
    setPagos(pRes.data || [])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const verEvidencia = async (path) => {
    const { data, error } = await supabase.storage.from('comprobantes').createSignedUrl(path, 3600)
    if (error) return alert('No se pudo abrir: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  if (cargando) return <Cargando />
  if (cargos.length === 0) return <Vacio texto="No tienes cargos pendientes por ahora." />

  return (
    <div className="space-y-2">
      {cargos.map((c) => {
        const pago = pagos.find((p) => p.cargo_id === c.id && p.vecino_id === vecino?.id)
        const pendiente = !pago || pago.estatus === 'rechazado'
        const vencido = pendiente && c.fecha_limite && c.fecha_limite < hoy()
        return (
          <div
            key={c.id}
            className={`bg-white rounded-xl shadow-sm p-4 ${vencido ? 'ring-1 ring-red-300' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{c.nombre}</p>
                <p className="text-xs text-slate-500">
                  {c.periodo ? `${c.periodo} · ` : ''}Total {money(c.monto_total)} ÷ {c.n_casas} casas
                </p>
                {c.fecha_limite && (
                  <p
                    className={`text-xs mt-0.5 font-medium ${
                      vencido ? 'text-red-600' : 'text-slate-500'
                    }`}
                  >
                    {vencido ? '⚠️ Venció el' : 'Vence:'} {fmtFecha(c.fecha_limite)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Te toca</p>
                <p className="font-bold text-teal-700">{money(c.mi_parte)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {c.evidencia_url && (
                <button onClick={() => verEvidencia(c.evidencia_url)} className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600">
                  Ver recibo
                </button>
              )}
              {(isStaff || privada?.mostrar_participacion) && (
                <button
                  onClick={() => setDetalle(c)}
                  className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600"
                >
                  Ver avance
                </button>
              )}
              {pago ? (
                <span className={`text-[11px] rounded-full px-2 py-0.5 font-semibold ${
                  pago.estatus === 'validado' ? 'bg-emerald-100 text-emerald-800'
                  : pago.estatus === 'rechazado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {pago.estatus === 'validado' ? 'Pagado ✓' : pago.estatus === 'rechazado' ? 'Rechazado' : 'En revisión'}
                </span>
              ) : (
                <button
                  onClick={() => setModal(c)}
                  className={`text-xs rounded-lg px-3 py-1.5 font-semibold text-white ${
                    vencido ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  Registrar pago
                </button>
              )}
            </div>
          </div>
        )
      })}
      {detalle && <DetalleCargo cargo={detalle} isStaff={isStaff} onCerrar={() => setDetalle(null)} />}
      {modal && (
        <PagarCargo
          privada={privada}
          vecino={vecino}
          cargo={modal}
          onCerrar={() => setModal(null)}
          onGuardado={() => {
            setModal(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function PagarCargo({ privada, vecino, cargo, onCerrar, onGuardado }) {
  const [monto, setMonto] = useState(cargo.mi_parte ?? '')
  const [fecha, setFecha] = useState(hoy())
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      let path = null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/${vecino.id}/cargo-${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, archivo)
        if (upErr) throw upErr
      }
      const { error: insErr } = await supabase.from('pagos').insert({
        privada_id: privada.id,
        vecino_id: vecino.id,
        cargo_id: cargo.id,
        monto: Number(monto || 0),
        fecha_pago: fecha,
        metodo: 'Ventanilla',
        comprobante_url: path,
        estatus: 'pendiente',
      })
      if (insErr) throw insErr
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message || 'error'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Pagar: ${cargo.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
          Te toca <b>{money(cargo.mi_parte)}</b>. Si pagas de más, la diferencia se guarda en la
          Caja de la privada.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Monto pagado</label>
          <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Comprobante (foto o PDF)</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600" />
        </div>
        {error && <ErrorMsg texto={error} />}
        <BotonGuardar cargando={guardando} texto="Guardar pago" />
      </form>
    </Modal>
  )
}

/* ---------- Admin ---------- */
function CargosAdmin() {
  const { privada, isStaff } = useAuth()
  const [cargos, setCargos] = useState([])
  const [asignados, setAsignados] = useState([])
  const [vecinos, setVecinos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [cRes, aRes, vRes] = await Promise.all([
      supabase.from('cargos').select('*').order('creado_en', { ascending: false }),
      supabase.from('cargo_asignados').select('cargo_id, vecino_id'),
      supabase.from('vecinos').select('id, nombre, casa:casas(identificador)').eq('autorizado', true).eq('estatus', 'activo').order('nombre'),
    ])
    setCargos(cRes.data || [])
    setAsignados(aRes.data || [])
    setVecinos(vRes.data || [])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este cargo?')) return
    const { error } = await supabase.from('cargos').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  const nCasas = (c) => (c.aplica_todos ? vecinos.length : asignados.filter((a) => a.cargo_id === c.id).length)

  if (cargando) return <Cargando />

  return (
    <div className="space-y-3">
      <button onClick={() => setForm({})} className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5">
        + Nuevo cargo
      </button>
      {cargos.length === 0 ? (
        <Vacio texto="Aún no hay cargos. Crea el primero (ej. Luz comunal)." />
      ) : (
        cargos.map((c) => {
          const n = nCasas(c)
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {c.periodo ? `${c.periodo} · ` : ''}Total {money(c.monto)} ÷ {n} casas ={' '}
                    <b>{money(n > 0 ? c.monto / n : c.monto)}</b> c/u
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {c.aplica_todos ? 'Aplica a todos' : `Aplica a ${n} casas`}
                    {c.fecha_limite ? ` · Vence ${fmtFecha(c.fecha_limite)}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setDetalle(c)} className="text-xs rounded-lg bg-teal-50 text-teal-700 px-3 py-1.5 font-semibold">Ver desglose</button>
                <button onClick={() => setForm(c)} className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600">Editar</button>
                <button onClick={() => borrar(c.id)} className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-1.5">Eliminar</button>
              </div>
            </div>
          )
        })
      )}
      {detalle && <DetalleCargo cargo={detalle} isStaff={isStaff} onCerrar={() => setDetalle(null)} />}
      {form && (
        <FormCargo
          privada={privada}
          vecinos={vecinos}
          cargo={form}
          asignadosActuales={asignados.filter((a) => a.cargo_id === form.id).map((a) => a.vecino_id)}
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

function FormCargo({ privada, vecinos, cargo, asignadosActuales, onCerrar, onGuardado }) {
  const esNuevo = !cargo.id
  const [nombre, setNombre] = useState(cargo.nombre || '')
  const [monto, setMonto] = useState(cargo.monto ?? '')
  const [periodo, setPeriodo] = useState(cargo.periodo || '')
  const [fechaLimite, setFechaLimite] = useState(cargo.fecha_limite || '')
  const [aplicaTodos, setAplicaTodos] = useState(cargo.aplica_todos ?? true)
  const [sel, setSel] = useState(() => new Set(asignadosActuales || []))
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id) => {
    const s = new Set(sel)
    s.has(id) ? s.delete(id) : s.add(id)
    setSel(s)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre (ej. Luz comunal).')
    if (!aplicaTodos && sel.size === 0) return setError('Elige al menos una casa.')
    setGuardando(true)
    try {
      let path = cargo.evidencia_url || null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/cargo-${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, archivo)
        if (upErr) throw upErr
      }
      const datos = {
        privada_id: privada.id,
        nombre: nombre.trim(),
        monto: Number(monto || 0),
        periodo: periodo.trim() || null,
        fecha_limite: fechaLimite || null,
        evidencia_url: path,
        aplica_todos: aplicaTodos,
        activo: true,
      }
      let cargoId = cargo.id
      if (esNuevo) {
        const { data, error } = await supabase.from('cargos').insert(datos).select('id').single()
        if (error) throw error
        cargoId = data.id
      } else {
        const { error } = await supabase.from('cargos').update(datos).eq('id', cargo.id)
        if (error) throw error
      }
      // asignaciones
      await supabase.from('cargo_asignados').delete().eq('cargo_id', cargoId)
      if (!aplicaTodos && sel.size > 0) {
        const filas = [...sel].map((vid) => ({ privada_id: privada.id, cargo_id: cargoId, vecino_id: vid }))
        const { error } = await supabase.from('cargo_asignados').insert(filas)
        if (error) throw error
      }
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message || 'error'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo cargo' : 'Editar cargo'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Nombre *" value={nombre} onChange={setNombre} placeholder="Ej. Luz comunal" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monto total</label>
            <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </div>
          <Campo label="Periodo" value={periodo} onChange={setPeriodo} placeholder="Ej. jul–ago" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Fecha límite de pago (opcional)
          </label>
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Recibo / evidencia (opcional)</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={aplicaTodos} onChange={(e) => setAplicaTodos(e.target.checked)} className="h-4 w-4" />
          Aplica a todas las casas
        </label>
        {!aplicaTodos && (
          <div className="border border-slate-200 rounded-lg p-2 max-h-52 overflow-y-auto space-y-1">
            <p className="text-xs text-slate-400 px-1">Elige las casas que pagan:</p>
            {vecinos.map((v) => (
              <label key={v.id} className="flex items-center justify-between text-sm px-1 py-1">
                <span className="text-slate-700">{v.nombre}{v.casa?.identificador ? ` · Casa ${v.casa.identificador}` : ''}</span>
                <input type="checkbox" checked={sel.has(v.id)} onChange={() => toggle(v.id)} className="h-5 w-5" />
              </label>
            ))}
          </div>
        )}
        {monto && (
          <p className="text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
            Cada casa pagaría:{' '}
            <b>{money(
              (aplicaTodos ? vecinos.length : sel.size) > 0
                ? Number(monto) / (aplicaTodos ? vecinos.length : sel.size)
                : Number(monto),
            )}</b>
          </p>
        )}
        {error && <ErrorMsg texto={error} />}
        <BotonGuardar cargando={guardando} texto="Guardar cargo" />
      </form>
    </Modal>
  )
}

/* ---------- Detalle: avance (todos) + desglose (staff) ---------- */
function DetalleCargo({ cargo, isStaff, onCerrar }) {
  const { privada, isAdmin } = useAuth()
  const [avance, setAvance] = useState(null)
  const [desglose, setDesglose] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const av = await supabase.rpc('avance_cargo', { p_cargo_id: cargo.id })
      if (!vivo) return
      setAvance(av.data?.[0] || null)
      if (isStaff) {
        const dg = await supabase.rpc('desglose_cargo', { p_cargo_id: cargo.id })
        if (!vivo) return
        setDesglose(dg.data || [])
      }
      setCargando(false)
    })()
    return () => {
      vivo = false
    }
  }, [cargo.id, isStaff])

  const pct =
    avance && Number(avance.n_casas) > 0
      ? Math.round((Number(avance.n_pagados) / Number(avance.n_casas)) * 100)
      : 0
  const nCasas = avance ? Number(avance.n_casas) : 0
  const parte = nCasas > 0 ? Number(avance.meta) / nCasas : Number(cargo.monto || 0)
  // Es una aportación acordada dentro de un periodo/fecha → el admin puede generar recibo para enviar.
  const esAcordada = Boolean(cargo.periodo || cargo.fecha_limite)
  const generarRecibo = (d) =>
    reciboCargoPDF({ privada, cargo, d, parte, fechaLimite: avance?.fecha_limite })

  return (
    <Modal titulo={`Avance · ${cargo.nombre}`} onCerrar={onCerrar}>
      {cargando ? (
        <Cargando />
      ) : !avance ? (
        <Vacio texto="Sin datos." />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>
                {avance.n_pagados} de {avance.n_casas} casas pagaron
              </span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recaudado {money(avance.recaudado)} de {money(avance.meta)}
              {avance.fecha_limite ? ` · Vence ${fmtFecha(avance.fecha_limite)}` : ''}
            </p>
          </div>

          {isStaff && desglose && (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Desglose por casa</p>
              {isAdmin && esAcordada && (
                <p className="text-[11px] text-slate-500 mb-2">
                  Aportación acordada. Genera el recibo de cada casa para enviárselo al vecino.
                </p>
              )}
              <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {desglose.map((d) => (
                  <li
                    key={d.vecino_id}
                    className="py-2 flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-slate-700 min-w-0 truncate">
                      {d.casa ? `Casa ${d.casa}` : d.nombre}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] rounded-full px-2 py-0.5 font-semibold ${
                          d.pagado
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.estatus === 'pendiente'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {d.pagado
                          ? `Pagó ${money(d.monto)}`
                          : d.estatus === 'pendiente'
                            ? 'En revisión'
                            : 'Pendiente'}
                      </span>
                      {isAdmin && esAcordada && (
                        <button
                          onClick={() => generarRecibo(d)}
                          title="Generar recibo para enviar al vecino"
                          className="text-[11px] rounded-lg border border-teal-300 text-teal-700 px-2 py-1 font-semibold hover:bg-teal-50"
                        >
                          📄 Recibo
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!isStaff && (
            <p className="text-[11px] text-slate-400">Solo la administración ve quién pagó.</p>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ---------- Recibo PDF de aportación acordada (para enviar al vecino) ---------- */
function reciboCargoPDF({ privada, cargo, d, parte, fechaLimite }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const fmtMoney = (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))
  const folio = `${cargo.id.slice(0, 6)}-${String(d.vecino_id).slice(0, 4)}`.toUpperCase()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(privada?.nombre || 'Privada', 40, 60)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (privada?.direccion) doc.text(privada.direccion, 40, 76)

  doc.setDrawColor(200)
  doc.line(40, 92, 555, 92)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(d.pagado ? 'RECIBO DE APORTACIÓN' : 'AVISO DE APORTACIÓN', 40, 122)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Folio: ${folio}`, 400, 122)

  const filas = [
    ['Casa:', d.casa ? `#${d.casa}` : '—'],
    ['Vecino:', d.nombre || 'Vecino'],
    ['Concepto:', cargo.nombre || '—'],
    ['Periodo:', cargo.periodo || '—'],
    ['Fecha límite:', fechaLimite ? fmtFecha(fechaLimite) : '—'],
    ['Estado:', d.pagado ? 'Pagado' : d.estatus === 'pendiente' ? 'En revisión' : 'Pendiente'],
  ]
  let y = 160
  filas.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(k, 40, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(v), 180, y)
    y += 24
  })

  doc.setFillColor(240, 253, 250)
  doc.rect(40, y + 8, 515, 46, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(d.pagado ? 'Monto recibido:' : 'Le corresponde aportar:', 56, y + 37)
  doc.setFontSize(16)
  doc.text(fmtMoney(d.pagado ? d.monto : parte), 400, y + 37)

  y += 120
  doc.setDrawColor(160)
  doc.line(360, y, 555, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma / sello de la administración', 400, y + 16)

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Documento generado por la app de administración de la privada.', 40, 800)

  const nombreCasa = d.casa ? `casa-${d.casa}` : 'vecino'
  doc.save(`recibo-${nombreCasa}.pdf`)
}

/* ---------- utilitarios ---------- */
function Cargando() {
  return <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
}
function Vacio({ texto }) {
  return <p className="text-sm text-slate-400 bg-white rounded-xl p-4">{texto}</p>
}
function ErrorMsg({ texto }) {
  return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{texto}</p>
}
function Campo({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
    </div>
  )
}
function BotonGuardar({ cargando, texto }) {
  return (
    <button type="submit" disabled={cargando} className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5">
      {cargando ? 'Guardando…' : texto}
    </button>
  )
}
function Modal({ titulo, children, onCerrar }) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <button onClick={onCerrar} className="text-slate-400 text-2xl">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
