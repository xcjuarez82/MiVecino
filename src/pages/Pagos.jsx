import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Convenios from './Convenios'
import Cargos from './Cargos'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    Number(n || 0),
  )
const hoy = () => new Date().toISOString().slice(0, 10)
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const ESTATUS = {
  pendiente: { txt: 'En revisión', cls: 'bg-amber-100 text-amber-800' },
  validado: { txt: 'Validado', cls: 'bg-emerald-100 text-emerald-800' },
  rechazado: { txt: 'Rechazado', cls: 'bg-red-100 text-red-800' },
}

export default function Pagos() {
  const { vecino, privada, isAdmin, isStaff } = useAuth()
  const esPromotor = isStaff && !isAdmin
  const [searchParams] = useSearchParams()
  const [conceptos, setConceptos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState(() => {
    if (esPromotor) return 'estado'
    const pedida = searchParams.get('tab')
    const validas = isAdmin
      ? ['mantenimiento', 'otros', 'convenios', 'validar']
      : ['mantenimiento', 'otros', 'convenios']
    return validas.includes(pedida) ? pedida : 'mantenimiento'
  })
  const [modal, setModal] = useState(null)

  // Sincroniza la pestaña cuando cambia ?tab= (p.ej. al tocar una notificación estando ya en /pagos)
  useEffect(() => {
    if (esPromotor) return
    const pedida = searchParams.get('tab')
    const validas = isAdmin
      ? ['mantenimiento', 'otros', 'convenios', 'validar']
      : ['mantenimiento', 'otros', 'convenios']
    if (pedida && validas.includes(pedida)) setTab(pedida)
  }, [searchParams, isAdmin, esPromotor])

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const [cRes, pRes] = await Promise.all([
      supabase.from('conceptos').select('*').eq('activo', true).order('tipo'),
      supabase
        .from('pagos')
        .select('*, vecinos(nombre, casa:casas(identificador)), conceptos(nombre, tipo)')
        .order('creado_en', { ascending: false }),
    ])
    setConceptos(cRes.data || [])
    setPagos(pRes.data || [])
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cambiarEstatus = async (id, estatus) => {
    const patch = { estatus }
    if (estatus === 'validado') patch.autorizado_por = vecino?.nombre || 'Administración'
    const { error } = await supabase.from('pagos').update(patch).eq('id', id)
    if (error) return alert('No se pudo actualizar: ' + error.message)
    cargar()
  }
  const verComprobante = async (path) => {
    if (!path) return
    const { data, error } = await supabase.storage
      .from('comprobantes')
      .createSignedUrl(path, 3600)
    if (error) return alert('No se pudo abrir: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  const mant = conceptos.find((c) => c.tipo === 'mantenimiento')
  const otrosMensuales = conceptos.filter(
    (c) => c.tipo === 'otro' && c.periodicidad === 'mensual',
  )
  const misPagos = pagos.filter((p) => p.vecino_id === vecino?.id)
  const pendientes = pagos.filter((p) => p.estatus === 'pendiente')

  const tabs = esPromotor
    ? [{ id: 'estado', label: 'Estado (solo lectura)' }]
    : [
        { id: 'mantenimiento', label: 'Mantto.' },
        { id: 'otros', label: 'Otros' },
        { id: 'convenios', label: 'Convenios' },
      ]
  if (isAdmin) tabs.push({ id: 'validar', label: `Validar (${pendientes.length})` })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Pagos / Mensualidades</h1>

      {/* pestañas */}
      <div className="flex gap-1 bg-slate-200/60 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              tab === t.id ? 'bg-white shadow text-teal-700' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando && (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>
      )}

      {/* ===== ESTADO (promotoría · solo lectura) ===== */}
      {!cargando && tab === 'estado' && esPromotor && (
        <section className="space-y-2">
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            👀 Vista de promotoría · <b>solo lectura</b>. Puedes ver el estado de los
            pagos pero no registrarlos ni validarlos.
          </p>
          {pagos.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
              Todavía no hay pagos registrados.
            </p>
          ) : (
            pagos.map((p) => {
              const est = ESTATUS[p.estatus] || ESTATUS.pendiente
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {p.vecinos?.nombre || 'Vecino'}
                      {p.vecinos?.casa?.identificador
                        ? ` · Casa ${p.vecinos.casa.identificador}`
                        : ''}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {p.conceptos?.nombre || 'Pago'}
                      {p.periodo ? ` · ${p.periodo}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-slate-800">{money(p.monto)}</p>
                    <span
                      className={`inline-block mt-1 text-[11px] rounded-full px-2 py-0.5 font-semibold ${est.cls}`}
                    >
                      {est.txt}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </section>
      )}

      {/* ===== MANTENIMIENTO ===== */}
      {!cargando && tab === 'mantenimiento' && !esPromotor && (
        <section className="space-y-3">
          {!mant ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl p-4">
              El administrador aún no configura el mantenimiento mensual.
            </p>
          ) : isAdmin ? (
            <MarcadoMensualAdmin
              concepto={mant}
              privada={privada}
              pagos={pagos}
              onCambio={cargar}
              monto={0}
              verComprobante={verComprobante}
            />
          ) : (
            <GridMensual
              concepto={mant}
              misPagos={misPagos}
              onPagar={setModal}
              mostrarMonto={false}
              descripcion="Obligatorio · sin monto fijo. Sube tu ficha del mes (el pago se hace en ventanilla)."
            />
          )}
        </section>
      )}

      {/* ===== OTROS (conceptos mensuales + cargos) ===== */}
      {!cargando && tab === 'otros' && (
        <div className="space-y-6">
          {otrosMensuales.map((c) =>
            isAdmin ? (
              <MarcadoMensualAdmin
                key={c.id}
                concepto={c}
                privada={privada}
                pagos={pagos}
                onCambio={cargar}
                monto={Number(c.monto || 0)}
                verComprobante={verComprobante}
              />
            ) : (
              <GridMensual
                key={c.id}
                concepto={c}
                misPagos={misPagos}
                onPagar={setModal}
                mostrarMonto={true}
                descripcion={`Mensual · ${money(c.monto)}${c.obligatorio ? ' · obligatorio' : ''}`}
              />
            ),
          )}
          <Cargos />
        </div>
      )}

      {/* ===== CONVENIOS ===== */}
      {!cargando && tab === 'convenios' && <Convenios />}

      {/* ===== POR VALIDAR (admin) ===== */}
      {!cargando && tab === 'validar' && isAdmin && (
        <section className="space-y-2">
          {pendientes.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
              No hay pagos pendientes de validar. 🎉
            </p>
          ) : (
            pendientes.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">
                      {p.vecinos?.nombre || 'Vecino'}
                      {p.vecinos?.casa?.identificador
                        ? ` · Casa ${p.vecinos.casa.identificador}`
                        : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.conceptos?.nombre || 'Pago'}
                      {p.periodo ? ` · ${p.periodo}` : ''} · {p.metodo || ''}
                    </p>
                  </div>
                  <p className="font-bold text-slate-800">{money(p.monto)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.comprobante_url && (
                    <button
                      onClick={() => verComprobante(p.comprobante_url)}
                      className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                    >
                      Ver comprobante
                    </button>
                  )}
                  <button
                    onClick={() => cambiarEstatus(p.id, 'validado')}
                    className="text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-semibold"
                  >
                    Validar
                  </button>
                  <button
                    onClick={() => cambiarEstatus(p.id, 'rechazado')}
                    className="text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 font-semibold"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {modal && (
        <FormPago
          privada={privada}
          vecino={vecino}
          isAdmin={isAdmin}
          info={modal}
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

function MarcadoMensualAdmin({ concepto, privada, pagos, onCambio, monto = 0, verComprobante }) {
  const { vecino: admin } = useAuth()
  const [vecinos, setVecinos] = useState([])
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth())
  const [guardando, setGuardando] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const conMonto = Number(monto) > 0

  useEffect(() => {
    supabase
      .from('vecinos')
      .select('id, nombre, casa:casas(identificador)')
      .eq('autorizado', true)
      .eq('estatus', 'activo')
      .order('nombre')
      .then(({ data }) => setVecinos(data || []))
  }, [])

  const periodo = `${anio}-${String(mes + 1).padStart(2, '0')}`
  const pagoDe = (vid) => {
    const lista = pagos.filter(
      (p) => p.concepto_id === concepto.id && p.periodo === periodo && p.vecino_id === vid,
    )
    if (lista.length === 0) return undefined
    // Si coexisten una ficha real del vecino y una marca del admin, mostramos la ficha real
    // (así no se enmascara un pago pendiente ni se permite borrar la ficha del vecino).
    return lista.find((p) => p.comprobante_url || p.metodo !== 'Marcado por admin') || lista[0]
  }
  // Una marca hecha por el admin (no una ficha subida por el vecino) sí se puede quitar.
  const esMarcaAdmin = (pago) => pago && !pago.comprobante_url && pago.metodo === 'Marcado por admin'

  const pendientes = vecinos.filter((v) => !pagoDe(v.id))

  // Al cambiar de mes/año limpiamos la selección para no arrastrarla.
  useEffect(() => {
    setSel(new Set())
  }, [periodo])

  const toggleSel = (id) => {
    const s = new Set(sel)
    s.has(id) ? s.delete(id) : s.add(id)
    setSel(s)
  }

  const insertarMarcas = async (lista) => {
    if (lista.length === 0) return
    // Reconsultamos el estado actual: si un vecino subió su ficha entre que se cargó la lista
    // y este clic, NO creamos una marca duplicada (evita la condición de carrera).
    const ids = lista.map((v) => v.id)
    const { data: yaPagados } = await supabase
      .from('pagos')
      .select('vecino_id')
      .eq('concepto_id', concepto.id)
      .eq('periodo', periodo)
      .in('vecino_id', ids)
    const conPago = new Set((yaPagados || []).map((p) => p.vecino_id))
    const filas = lista
      .filter((v) => !conPago.has(v.id))
      .map((v) => ({
        privada_id: privada.id,
        vecino_id: v.id,
        concepto_id: concepto.id,
        periodo,
        monto: Number(monto) || 0,
        estatus: 'validado',
        metodo: 'Marcado por admin',
        autorizado_por: admin?.nombre || 'Administración',
      }))
    if (filas.length === 0) return
    const { error } = await supabase.from('pagos').insert(filas)
    if (error) throw error
  }

  const verRecibo = (v, pago) =>
    reciboPagoPDF({
      privada,
      vecino: { nombre: v.nombre, casa: v.casa },
      pago,
      concepto,
    })

  const toggle = async (v) => {
    const pago = pagoDe(v.id)
    if (pago && !esMarcaAdmin(pago)) {
      return alert('Este vecino subió su propia ficha. No puedes quitar su registro desde aquí.')
    }
    if (!pago) {
      if (!confirm('El vecino no ha subido su recibo. ¿Está seguro que quiere marcarlo como entregado?')) return
    } else if (!confirm('¿Quitar la marca de entregado de esta casa?')) return

    setGuardando(v.id)
    try {
      if (pago) {
        const { error } = await supabase.from('pagos').delete().eq('id', pago.id)
        if (error) throw error
      } else {
        await insertarMarcas([v])
      }
      onCambio()
    } catch (err) {
      alert('No se pudo: ' + (err?.message || 'error'))
    } finally {
      setGuardando(null)
    }
  }

  const marcarLote = async (lista) => {
    const aMarcar = lista.filter((v) => !pagoDe(v.id))
    if (aMarcar.length === 0) return alert('No hay casas pendientes que marcar.')
    if (
      !confirm(
        `No se están validando los recibos. ¿Está seguro de marcar ${aMarcar.length} casa(s) como entregadas?`,
      )
    )
      return
    setGuardando('lote')
    try {
      await insertarMarcas(aMarcar)
      setSel(new Set())
      onCambio()
    } catch (err) {
      alert('No se pudo: ' + (err?.message || 'error'))
    } finally {
      setGuardando(null)
    }
  }

  const seleccionados = pendientes.filter((v) => sel.has(v.id))

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">{concepto.nombre}</p>
          <p className="text-xs text-slate-500">
            Marca qué casas ya {conMonto ? 'cooperaron' : 'entregaron su ficha'} este mes. Al
            marcarlas, el vecino podrá ver su recibo (📄).
          </p>
        </div>
        {conMonto && <p className="font-bold text-teal-700 shrink-0">{money(monto)}</p>}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setAnio(anio - 1)} className="text-slate-500 px-2">‹</button>
        <span className="font-semibold text-slate-700">{anio}</span>
        <button onClick={() => setAnio(anio + 1)} className="text-slate-500 px-2">›</button>
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {MESES_LARGO.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {pendientes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => marcarLote(pendientes)}
            disabled={guardando === 'lote'}
            className="text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 font-semibold disabled:opacity-50"
          >
            {guardando === 'lote' ? 'Marcando…' : `Marcar todos (${pendientes.length})`}
          </button>
          <button
            onClick={() => marcarLote(seleccionados)}
            disabled={guardando === 'lote' || seleccionados.length === 0}
            className="text-xs rounded-lg border border-teal-600 text-teal-700 px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Marcar seleccionados ({seleccionados.length})
          </button>
        </div>
      )}

      <div className="space-y-2">
        {vecinos.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl p-4">No hay casas registradas.</p>
        ) : (
          vecinos.map((v) => {
            const pago = pagoDe(v.id)
            const puedeSeleccionar = !pago
            return (
              <div
                key={v.id}
                className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between gap-2"
              >
                <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                  {puedeSeleccionar && (
                    <input
                      type="checkbox"
                      checked={sel.has(v.id)}
                      onChange={() => toggleSel(v.id)}
                      className="h-4 w-4 shrink-0"
                    />
                  )}
                  <span className="text-sm text-slate-700 truncate">
                    {v.casa?.identificador ? `Casa ${v.casa.identificador} · ` : ''}
                    {v.nombre}
                  </span>
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  {pago?.comprobante_url && (
                    <button
                      onClick={() => verComprobante(pago.comprobante_url)}
                      title="Ver el comprobante que subió el vecino"
                      className="text-[11px] rounded-lg border border-slate-300 text-slate-600 px-2 py-1.5 whitespace-nowrap"
                    >
                      🧾 Ver
                    </button>
                  )}
                  {pago && pago.estatus === 'validado' && (
                    <button
                      onClick={() => verRecibo(v, pago)}
                      title="Ver / descargar recibo"
                      className="text-[11px] rounded-lg border border-slate-300 text-slate-600 px-2 py-1.5"
                    >
                      📄
                    </button>
                  )}
                  <button
                    onClick={() => toggle(v)}
                    disabled={guardando === v.id}
                    className={`text-xs rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50 ${
                      pago
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {guardando === v.id ? '…' : pago ? 'Entregó ✓' : 'Marcar entregado'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function GridMensual({ concepto, misPagos, onPagar, mostrarMonto, descripcion }) {
  const { privada, vecino, casa } = useAuth()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const pagoDeMes = (m) => {
    const periodo = `${anio}-${String(m + 1).padStart(2, '0')}`
    return misPagos.find((p) => p.concepto_id === concepto.id && p.periodo === periodo)
  }
  const verRecibo = (p) =>
    reciboPagoPDF({ privada, vecino: { nombre: vecino?.nombre, casa }, pago: p, concepto })
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">{concepto.nombre}</p>
          <p className="text-xs text-slate-500">{descripcion}</p>
        </div>
        {mostrarMonto && <p className="font-bold text-teal-700">{money(concepto.monto)}</p>}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setAnio(anio - 1)} className="text-slate-500 px-2">‹</button>
        <span className="font-semibold text-slate-700">{anio}</span>
        <button onClick={() => setAnio(anio + 1)} className="text-slate-500 px-2">›</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MESES.map((mes, i) => {
          const p = pagoDeMes(i)
          const est = p ? ESTATUS[p.estatus] : null
          if (p?.estatus === 'validado') {
            return (
              <div
                key={mes}
                className="rounded-xl p-3 text-center border bg-emerald-50 border-emerald-200"
              >
                <p className="font-semibold text-slate-700 text-sm">{mes}</p>
                <p className="mt-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold bg-emerald-100 text-emerald-800">
                  Validado
                </p>
                <button
                  onClick={() => verRecibo(p)}
                  className="mt-1 text-[10px] text-teal-600 underline"
                >
                  Ver recibo
                </button>
              </div>
            )
          }
          return (
            <button
              key={mes}
              onClick={() =>
                onPagar({
                  concepto,
                  periodo: `${anio}-${String(i + 1).padStart(2, '0')}`,
                  titulo: `${concepto.nombre} · ${MESES_LARGO[i]} ${anio}`,
                  montoSugerido: mostrarMonto ? concepto.monto || '' : '',
                  soloLectura: false,
                })
              }
              className={`rounded-xl p-3 text-center border transition ${
                p?.estatus === 'pendiente'
                  ? 'bg-amber-50 border-amber-200'
                  : p?.estatus === 'rechazado'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-slate-200 hover:border-teal-400'
              }`}
            >
              <p className="font-semibold text-slate-700 text-sm">{mes}</p>
              {est ? (
                <p className={`mt-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${est.cls}`}>
                  {est.txt}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">Subir ficha</p>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 text-center">
        Toca un mes para subir tu comprobante de pago.
      </p>
    </div>
  )
}

function ListaPagos({ pagos, verComprobante }) {
  if (!pagos || pagos.length === 0) {
    return (
      <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
        Aún no has registrado pagos aquí.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {pagos.map((p) => {
        const est = ESTATUS[p.estatus] || ESTATUS.pendiente
        return (
          <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{p.conceptos?.nombre || 'Pago'}</p>
              <p className="text-xs text-slate-500">
                {p.metodo || 'Pago'} · {p.fecha_pago || '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-800">{money(p.monto)}</p>
              <span className={`inline-block mt-1 text-[11px] rounded-full px-2 py-0.5 font-semibold ${est.cls}`}>
                {est.txt}
              </span>
              {p.comprobante_url && (
                <button
                  onClick={() => verComprobante(p.comprobante_url)}
                  className="block ml-auto mt-1 text-[11px] text-teal-600 underline"
                >
                  ver ficha
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FormPago({ privada, vecino, isAdmin, info, onCerrar, onGuardado }) {
  const [monto, setMonto] = useState(info.montoSugerido ?? '')
  const [fecha, setFecha] = useState(hoy())
  const [archivo, setArchivo] = useState(null)
  const [vecinoSel, setVecinoSel] = useState(vecino?.id || '')
  const [vecinos, setVecinos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('vecinos')
      .select('id, nombre, casa:casas(identificador)')
      .eq('autorizado', true)
      .eq('estatus', 'activo')
      .order('nombre')
      .then(({ data }) => setVecinos(data || []))
  }, [isAdmin])

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const vid = isAdmin && vecinoSel ? vecinoSel : vecino.id
      let path = null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/${vid}/${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage
          .from('comprobantes')
          .upload(path, archivo)
        if (upErr) throw upErr
      }
      const { error: insErr } = await supabase.from('pagos').insert({
        privada_id: privada.id,
        vecino_id: vid,
        concepto_id: info.concepto?.id || null,
        periodo: info.periodo || null,
        monto: Number(monto),
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
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <form
        onSubmit={guardar}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Registrar pago</h3>
            <p className="text-xs text-slate-500">{info.titulo}</p>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
          El pago se realiza en la ventanilla de la asociación. Aquí solo subes tu
          comprobante y el administrador lo valida.
        </p>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Registrar a nombre de
            </label>
            <select
              value={vecinoSel}
              onChange={(e) => setVecinoSel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              {vecinos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.casa?.identificador ? `Casa ${v.casa.identificador} · ` : ''}
                  {v.nombre}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Como administrador puedes registrar el pago de cualquier vecino.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Monto pagado (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de pago</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Ficha / comprobante (foto o PDF)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar pago'}
        </button>
      </form>
    </div>
  )
}

/* ---------- Recibo de pago (ticket) para enviar/ver por el vecino ---------- */
function reciboPagoPDF({ privada, vecino, pago, concepto }) {
  const W = 264
  const doc = new jsPDF({ unit: 'pt', format: [W, 400] })
  const cx = W / 2
  const fmt = (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))
  const folio = String(pago.id).slice(0, 8).toUpperCase()
  const casaTxt = vecino?.casa?.identificador ? `Casa ${vecino.casa.identificador}` : 'Sin casa'
  const periodoTxt = (() => {
    if (!pago.periodo) return concepto?.nombre || '—'
    const [a, m] = pago.periodo.split('-')
    return `${MESES_LARGO[Number(m) - 1] || m} ${a}`
  })()
  const fecha = pago.fecha_pago || (pago.creado_en ? String(pago.creado_en).slice(0, 10) : hoy())
  const aprueba = pago.autorizado_por || 'Administración'

  let y = 34
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(privada?.nombre || 'Comunidad', cx, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90)
  if (privada?.direccion) {
    doc.text(privada.direccion, cx, y, { align: 'center' })
    y += 12
  }
  doc.setTextColor(20)
  y += 6
  doc.setDrawColor(200)
  doc.line(20, y, W - 20, y)
  y += 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('RECIBO DE PAGO', cx, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90)
  doc.text(`Folio ${folio}  ·  ${fecha}`, cx, y, { align: 'center' })
  y += 16
  doc.setTextColor(20)
  doc.setDrawColor(230)
  doc.line(20, y, W - 20, y)
  y += 18

  const fila = (k, v) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(k, 20, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(v), W - 20, y, { align: 'right' })
    y += 16
  }
  fila('Recibí de:', vecino?.nombre || 'Vecino')
  fila('Casa:', casaTxt)
  fila('Concepto:', concepto?.nombre || 'Pago')
  fila('Periodo:', periodoTxt)

  y += 6
  doc.setFillColor(240, 253, 250)
  doc.rect(20, y, W - 40, 34, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('MONTO', 30, y + 21)
  doc.setFontSize(13)
  doc.text(Number(pago.monto) > 0 ? fmt(pago.monto) : '—', W - 30, y + 21, { align: 'right' })
  y += 56

  doc.setDrawColor(230)
  doc.line(20, y, W - 20, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Recibió: ${aprueba}`, 20, y)
  y += 12
  doc.text(`Autorizó: ${aprueba}`, 20, y)
  y += 20

  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Gracias por su pago.', cx, y, { align: 'center' })
  y += 10
  doc.text('Mi Vecino', cx, y, { align: 'center' })

  doc.save(`recibo-${casaTxt.replace(/\s+/g, '-').toLowerCase()}-${pago.periodo || folio}.pdf`)
}
