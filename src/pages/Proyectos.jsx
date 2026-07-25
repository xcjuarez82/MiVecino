import { useEffect, useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))
const hoy = () => new Date().toISOString().slice(0, 10)

const ESTATUS = {
  futuro: { txt: 'Futuro', cls: 'bg-slate-100 text-slate-600' },
  en_curso: { txt: 'En curso', cls: 'bg-amber-100 text-amber-800' },
  terminado: { txt: 'Terminado', cls: 'bg-emerald-100 text-emerald-800' },
}

export default function Proyectos() {
  const { privada, vecino, isAdmin, isStaff } = useAuth()
  const esPromotor = isStaff && !isAdmin
  const [tab, setTab] = useState('proyectos')
  const [proyectos, setProyectos] = useState([])
  const [aportaciones, setAportaciones] = useState([])
  const [recMap, setRecMap] = useState({})
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalProyecto, setModalProyecto] = useState(null) // null | {} | proyecto
  const [modalAporte, setModalAporte] = useState(false)
  const [modalGasto, setModalGasto] = useState(null) // proyecto
  const [modalPart, setModalPart] = useState(null) // proyecto (participación)

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const [pRes, aRes, gRes, recRes] = await Promise.all([
      supabase.from('proyectos').select('*').order('creado_en', { ascending: false }),
      supabase
        .from('aportaciones')
        .select('*, vecinos(nombre, casa:casas(identificador))')
        .order('creado_en', { ascending: false }),
      supabase
        .from('caja_movimientos')
        .select('id, proyecto_id, concepto, monto, documento_url, fecha, origen')
        .eq('tipo', 'egreso')
        .not('proyecto_id', 'is', null)
        .neq('origen', 'aporte_ahorro'),
      supabase.rpc('recaudado_por_proyecto', { p_privada_id: privada.id }),
    ])
    setProyectos(pRes.data || [])
    setAportaciones(aRes.data || [])
    setGastos(gRes.data || [])
    const map = {}
    ;(recRes.data || []).forEach((r) => {
      map[r.proyecto_id] = Number(r.recaudado || 0)
    })
    setRecMap(map)
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const borrarProyecto = async (id) => {
    if (
      !confirm(
        '¿Eliminar este proyecto? Si tenía un cobro asociado en "Otros", ese cobro se desactivará (los vecinos dejarán de verlo). Los pagos ya registrados se conservan.',
      )
    )
      return
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }

  // Recaudado real por proyecto (calculado en el servidor, ve el total de todos).
  const recaudadoDe = (pid) => (pid in recMap ? recMap[pid] : null)
  const gastosDe = (pid) => gastos.filter((g) => g.proyecto_id === pid)

  const abrirFactura = async (path) => {
    if (!path) return
    const { data, error } = await supabase.storage.from('facturas').createSignedUrl(path, 3600)
    if (error) return alert('No se pudo abrir: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Proyectos y mejoras</h1>

      <div className="flex gap-1 bg-slate-200/60 rounded-xl p-1">
        {[
          { id: 'proyectos', label: 'Proyectos' },
          { id: 'aportaciones', label: 'Aportaciones' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-white shadow text-teal-700' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>}

      {/* ===== PROYECTOS ===== */}
      {!cargando && tab === 'proyectos' && (
        <section className="space-y-3">
          {isAdmin && (
            <button
              onClick={() => setModalProyecto({})}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5"
            >
              + Nuevo proyecto
            </button>
          )}
          {proyectos.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
              Aún no hay proyectos registrados.
            </p>
          ) : (
            proyectos.map((p) => {
              const rec = recaudadoDe(p.id)
              const recaudado = rec === null ? Number(p.monto_recaudado || 0) : rec
              const gs = gastosDe(p.id)
              const gastado = gs.length
                ? gs.reduce((a, g) => a + Number(g.monto || 0), 0)
                : Number(p.monto_gastado || 0)
              return (
                <ProyectoCard
                  key={p.id}
                  p={p}
                  isAdmin={isAdmin}
                  esStaff={isStaff}
                  puedeVerParticipacion={isStaff || !!privada?.mostrar_participacion}
                  recaudado={recaudado}
                  gastado={gastado}
                  gastos={gs}
                  onEditar={() => setModalProyecto(p)}
                  onBorrar={() => borrarProyecto(p.id)}
                  onGasto={() => setModalGasto(p)}
                  onParticipacion={() => setModalPart(p)}
                  onAbrirFactura={abrirFactura}
                />
              )
            })
          )}
        </section>
      )}

      {/* ===== APORTACIONES ===== */}
      {!cargando && tab === 'aportaciones' && (
        <Aportaciones
          privada={privada}
          vecino={vecino}
          isAdmin={isAdmin}
          isStaff={isStaff}
          esPromotor={esPromotor}
          aportaciones={aportaciones}
          onNueva={() => setModalAporte(true)}
          onCambio={cargar}
        />
      )}

      {modalProyecto && (
        <FormProyecto
          privada={privada}
          proyecto={modalProyecto.id ? modalProyecto : null}
          onCerrar={() => setModalProyecto(null)}
          onGuardado={() => {
            setModalProyecto(null)
            cargar()
          }}
        />
      )}
      {modalAporte && (
        <FormAportacion
          privada={privada}
          vecino={vecino}
          isAdmin={isAdmin}
          onCerrar={() => setModalAporte(false)}
          onGuardado={() => {
            setModalAporte(false)
            cargar()
          }}
        />
      )}
      {modalGasto && (
        <FormGasto
          privada={privada}
          proyecto={modalGasto}
          onCerrar={() => setModalGasto(null)}
          onGuardado={() => {
            setModalGasto(null)
            cargar()
          }}
        />
      )}
      {modalPart && (
        <DetalleParticipacion
          proyecto={modalPart}
          esStaff={isStaff}
          onCerrar={() => setModalPart(null)}
        />
      )}
    </div>
  )
}

function ProyectoCard({ p, isAdmin, esStaff, puedeVerParticipacion, recaudado, gastado, gastos, onEditar, onBorrar, onGasto, onParticipacion, onAbrirFactura }) {
  const est = ESTATUS[p.estatus] || ESTATUS.futuro
  const meta = Number(p.monto_estimado)
  const pct = meta > 0 ? Math.min(100, Math.round((Number(recaudado) / meta) * 100)) : 0
  const fotoUrl = p.foto_url
    ? supabase.storage.from('fotos').getPublicUrl(p.foto_url).data.publicUrl
    : null

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {fotoUrl && <img src={fotoUrl} alt="" className="w-full h-36 object-cover" />}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${est.cls}`}
            >
              {est.txt}
            </span>
            <p className="font-semibold text-slate-800 mt-1">{p.titulo}</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button onClick={onEditar} className="text-[11px] text-teal-600 hover:underline">
                editar
              </button>
              <button onClick={onBorrar} className="text-[11px] text-red-500 hover:underline">
                eliminar
              </button>
            </div>
          )}
        </div>
        {p.descripcion && (
          <p className="text-sm text-slate-600 whitespace-pre-line">{p.descripcion}</p>
        )}

        {puedeVerParticipacion && (
          <div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Recaudado {money(recaudado)}</span>
              <span>Meta {money(meta)}</span>
            </div>
            {Number(gastado) > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">Gastado: {money(gastado)}</p>
            )}
          </div>
        )}

        {puedeVerParticipacion && (
          <button
            onClick={onParticipacion}
            className="text-xs rounded-lg bg-teal-50 text-teal-700 px-3 py-1.5 font-semibold"
          >
            {esStaff ? 'Ver quién aportó' : 'Ver participación'}
          </button>
        )}

        {/* Gastos con factura (solo admin) */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Gastos
              </p>
              <button
                onClick={onGasto}
                className="text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 font-semibold text-slate-600"
              >
                + Registrar gasto
              </button>
            </div>
            {gastos.length === 0 ? (
              <p className="text-[11px] text-slate-400 mt-1">Sin gastos registrados.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {gastos.map((g) => (
                  <li key={g.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate">
                      {g.concepto} · {g.fecha}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-red-500">−{money(g.monto)}</span>
                      {g.documento_url && (
                        <button
                          onClick={() => onAbrirFactura(g.documento_url)}
                          className="text-teal-600 underline"
                        >
                          factura
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Aportaciones({ vecino, isAdmin, esPromotor, aportaciones, onNueva, onCambio }) {
  const lista = isAdmin || esPromotor
    ? aportaciones
    : aportaciones.filter((a) => a.vecino_id === vecino?.id)

  const abrir = async (bucket, path) => {
    if (!path) return
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
    if (error) return alert('No se pudo abrir: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  return (
    <section className="space-y-3">
      {esPromotor && (
        <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          👀 Vista de promotoría · solo lectura.
        </p>
      )}
      {!esPromotor && (
        <button
          onClick={onNueva}
          className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5"
        >
          + Registrar aportación
        </button>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
          {isAdmin || esPromotor
            ? 'Todavía no hay aportaciones registradas.'
            : 'Aún no has registrado aportaciones.'}
        </p>
      ) : (
        lista.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">
                  {a.concepto}
                  <span
                    className={`ml-2 align-middle text-[10px] rounded-full px-2 py-0.5 font-semibold ${
                      a.tipo === 'especie'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {a.tipo === 'especie' ? '📦 Especie' : '💵 Dinero'}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {(isAdmin || esPromotor) &&
                    `${a.vecinos?.nombre || 'Vecino'}${
                      a.vecinos?.casa?.identificador ? ` · Casa ${a.vecinos.casa.identificador}` : ''
                    } · `}
                  {a.fecha || '—'}
                </p>
              </div>
              <p className="font-bold text-slate-800 shrink-0">{money(a.monto)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.comprobante_url && (
                <button
                  onClick={() => abrir('comprobantes', a.comprobante_url)}
                  className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                >
                  Ver comprobante
                </button>
              )}
              {a.recibo_url ? (
                <button
                  onClick={() => abrir('recibos', a.recibo_url)}
                  className="text-xs rounded-lg bg-teal-50 text-teal-700 px-3 py-1.5 font-semibold hover:bg-teal-100"
                >
                  📄 Ver recibo
                </button>
              ) : (
                isAdmin && <BotonRecibo aportacion={a} onListo={onCambio} />
              )}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

function BotonRecibo({ aportacion, onListo }) {
  const [gen, setGen] = useState(false)

  const generar = async () => {
    setGen(true)
    try {
      // Traer datos de la comunidad y el vecino para el recibo
      const [{ data: privada }, { data: vec }] = await Promise.all([
        supabase.from('privadas').select('nombre, direccion').eq('id', aportacion.privada_id).single(),
        aportacion.vecino_id
          ? supabase
              .from('vecinos')
              .select('nombre, casa:casas(identificador)')
              .eq('id', aportacion.vecino_id)
              .single()
          : Promise.resolve({ data: null }),
      ])
      const blob = construirReciboPDF({ aportacion, privada, vecino: vec })

      // La ruta incluye el vecino_id (2º segmento) para que el dueño pueda
      // ver su propio recibo bajo las políticas de Storage por privada/dueño.
      const carpeta = aportacion.vecino_id
        ? `${aportacion.privada_id}/${aportacion.vecino_id}`
        : `${aportacion.privada_id}`
      const path = `${carpeta}/recibo-${aportacion.id}.pdf`
      const { error: upErr } = await supabase.storage
        .from('recibos')
        .upload(path, blob, { contentType: 'application/pdf', upsert: true })
      if (upErr) throw upErr
      const { error: updErr } = await supabase
        .from('aportaciones')
        .update({ recibo_url: path })
        .eq('id', aportacion.id)
      if (updErr) throw updErr
      onListo()
    } catch (err) {
      alert('No se pudo generar el recibo: ' + (err?.message || 'error'))
    } finally {
      setGen(false)
    }
  }

  return (
    <button
      onClick={generar}
      disabled={gen}
      className="text-xs rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-3 py-1.5 font-semibold"
    >
      {gen ? 'Generando…' : 'Generar recibo'}
    </button>
  )
}

function construirReciboPDF({ aportacion, privada, vecino }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const money = (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))
  const folio = aportacion.id.slice(0, 8).toUpperCase()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(privada?.nombre || 'Comunidad', 40, 60)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (privada?.direccion) doc.text(privada.direccion, 40, 76)

  doc.setDrawColor(200)
  doc.line(40, 92, 555, 92)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBO DE APORTACIÓN', 40, 122)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Folio: ${folio}`, 400, 122)

  const filas = [
    ['Recibí de:', vecino?.nombre || 'Vecino'],
    ['Casa:', vecino?.casa?.identificador ? `#${vecino.casa.identificador}` : '—'],
    ['Concepto:', aportacion.concepto || '—'],
    ['Fecha:', aportacion.fecha || new Date().toISOString().slice(0, 10)],
  ]
  let y = 160
  filas.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(k, 40, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(v), 160, y)
    y += 24
  })

  doc.setFillColor(240, 253, 250)
  doc.rect(40, y + 8, 515, 46, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Monto recibido:', 56, y + 37)
  doc.setFontSize(16)
  doc.text(money(aportacion.monto), 400, y + 37)

  y += 120
  doc.setDrawColor(160)
  doc.line(360, y, 555, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma / sello de la administración', 400, y + 16)

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Documento generado por la app de administración de la comunidad.', 40, 800)

  return doc.output('blob')
}

function FormProyecto({ privada, proyecto, onCerrar, onGuardado }) {
  const esNuevo = !proyecto
  const [titulo, setTitulo] = useState(proyecto?.titulo || '')
  const [descripcion, setDescripcion] = useState(proyecto?.descripcion || '')
  const [estimado, setEstimado] = useState(proyecto?.monto_estimado ?? '')
  const [estatus, setEstatus] = useState(proyecto?.estatus || 'futuro')
  const [archivo, setArchivo] = useState(null)
  // cobro a vecinos (solo al crear)
  const [crearCargo, setCrearCargo] = useState(true)
  const [modo, setModo] = useState('todos') // 'todos' | 'algunas'
  const [vecinos, setVecinos] = useState([])
  const [casasSel, setCasasSel] = useState([])
  const [aporteAhorro, setAporteAhorro] = useState('')
  const [saldo, setSaldo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!esNuevo) return
    supabase
      .from('vecinos')
      .select('id, nombre, casa:casas(identificador)')
      .eq('autorizado', true)
      .eq('estatus', 'activo')
      .order('nombre')
      .then(({ data }) => setVecinos(data || []))
    supabase
      .rpc('saldo_caja', { p_privada_id: privada.id })
      .then(({ data }) => setSaldo(Number(data || 0)))
  }, [esNuevo, privada.id])

  const difCoop = Math.max((Number(estimado) || 0) - (Number(aporteAhorro) || 0), 0)

  const toggleCasa = (id) =>
    setCasasSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) return setError('Escribe el título del proyecto.')
    const meta = Number(estimado) || 0
    const aporte = Math.min(Math.max(Number(aporteAhorro) || 0, 0), meta)
    const dif = meta - aporte
    if (esNuevo && saldo !== null && aporte > saldo) {
      return setError(`Solo hay ${money(saldo)} en el ahorro; no puedes tomar más de eso.`)
    }
    if (esNuevo && crearCargo && dif > 0) {
      if (modo === 'algunas' && casasSel.length === 0)
        return setError('Selecciona al menos una casa para el cobro.')
    }
    setGuardando(true)
    try {
      let foto_url = proyecto?.foto_url || null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${privada.id}/${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('fotos').upload(path, archivo)
        if (upErr) throw upErr
        foto_url = path
      }
      const payload = {
        privada_id: privada.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        monto_estimado: meta,
        estatus,
        foto_url,
      }

      if (esNuevo) {
        // Todo en una sola transacción (proyecto + cargo + casas)
        const { error: rpcErr } = await supabase.rpc('crear_proyecto_con_cargo', {
          p_privada_id: privada.id,
          p_titulo: titulo.trim(),
          p_descripcion: descripcion.trim() || null,
          p_meta: meta,
          p_estatus: estatus,
          p_foto_url: foto_url,
          p_crear_cargo: crearCargo,
          p_aplica_todos: modo === 'todos',
          p_vecino_ids: crearCargo && modo === 'algunas' ? casasSel : null,
          p_aporte_ahorro: aporte,
        })
        if (rpcErr) throw rpcErr
      } else {
        const { error: updErr } = await supabase
          .from('proyectos')
          .update(payload)
          .eq('id', proyecto.id)
        if (updErr) throw updErr
      }
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message || 'error'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalShell titulo={esNuevo ? 'Nuevo proyecto' : 'Editar proyecto'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Título *">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Rehabilitar el parque"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Meta $">
            <input
              type="number"
              step="0.01"
              value={estimado}
              onChange={(e) => setEstimado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-2.5"
            />
          </Campo>
          <Campo label="Estatus">
            <select
              value={estatus}
              onChange={(e) => setEstatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-2.5"
            >
              <option value="futuro">Futuro</option>
              <option value="en_curso">En curso</option>
              <option value="terminado">Terminado</option>
            </select>
          </Campo>
        </div>

        {/* Tomar del ahorro (sólo al crear) */}
        {esNuevo && (
          <Campo label="Tomar del ahorro (opcional)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={aporteAhorro}
              onChange={(e) => setAporteAhorro(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {saldo !== null ? `Disponible en ahorro: ${money(saldo)}. ` : ''}
              Esta parte se cubre con el ahorro (se descuenta cuando registres los gastos). La
              diferencia se divide entre las casas.
            </p>
          </Campo>
        )}

        {/* Cobro a vecinos: sólo al crear */}
        {esNuevo && (
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={crearCargo}
                onChange={(e) => setCrearCargo(e.target.checked)}
              />
              Crear cobro en “Otros” para juntar{' '}
              {(Number(aporteAhorro) || 0) > 0 ? 'la diferencia' : 'la meta'}
            </label>
            {crearCargo && difCoop <= 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                El ahorro cubre toda la meta; no se creará ningún cobro a los vecinos.
              </p>
            )}
            {crearCargo && difCoop > 0 && (
              <>
                <p className="text-[11px] text-slate-500">
                  Se repartirá <b>{money(difCoop)}</b> en partes iguales entre las casas elegidas y
                  aparecerá como un pago pendiente en la pestaña “Otros”.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModo('todos')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                      modo === 'todos'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Todas las casas
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo('algunas')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                      modo === 'algunas'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Solo algunas
                  </button>
                </div>
                {modo === 'algunas' && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {vecinos.map((v) => (
                      <label key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={casasSel.includes(v.id)}
                          onChange={() => toggleCasa(v.id)}
                        />
                        <span>
                          {v.casa?.identificador ? `Casa ${v.casa.identificador} · ` : ''}
                          {v.nombre}
                        </span>
                      </label>
                    ))}
                    {vecinos.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">No hay vecinos registrados.</p>
                    )}
                  </div>
                )}
                {modo === 'algunas' && casasSel.length > 0 && difCoop > 0 && (
                  <p className="text-[11px] text-teal-700">
                    Cada casa pagaría {money(difCoop / casasSel.length)}.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <Campo label="Foto (opcional)">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </Campo>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar proyecto'}
        </button>
      </form>
    </ModalShell>
  )
}

function FormGasto({ privada, proyecto, onCerrar, onGuardado }) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [archivo, setArchivo] = useState(null)
  // ¿de dónde sale el dinero? 'ahorro' = de la Caja; 'cooperacion' = cobro dividido a las casas
  const [fuente, setFuente] = useState('ahorro')
  const dividir = fuente === 'cooperacion'
  const [modo, setModo] = useState('todos') // 'todos' | 'algunas'
  const [vecinos, setVecinos] = useState([])
  const [casasSel, setCasasSel] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('vecinos')
      .select('id, nombre, casa:casas(identificador)')
      .eq('autorizado', true)
      .eq('estatus', 'activo')
      .order('nombre')
      .then(({ data }) => setVecinos(data || []))
  }, [])

  const toggleCasa = (id) =>
    setCasasSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!concepto.trim()) return setError('Escribe el concepto del gasto.')
    if (!(Number(monto) > 0)) return setError('Escribe un monto válido.')
    if (dividir && modo === 'algunas' && casasSel.length === 0)
      return setError('Selecciona al menos una casa para dividir el gasto.')
    setGuardando(true)
    try {
      let documento_url = null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        documento_url = `${privada.id}/${proyecto.id}/${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage
          .from('facturas')
          .upload(documento_url, archivo)
        if (upErr) throw upErr
      }
      const { error: rpcErr } = await supabase.rpc('registrar_gasto_proyecto', {
        p_privada_id: privada.id,
        p_proyecto_id: proyecto.id,
        p_concepto: concepto.trim(),
        p_monto: Number(monto),
        p_fecha: fecha,
        p_documento_url: documento_url,
        p_dividir: dividir,
        p_aplica_todos: modo === 'todos',
        p_vecino_ids: dividir && modo === 'algunas' ? casasSel : null,
      })
      if (rpcErr) throw rpcErr
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message || 'error'))
    } finally {
      setGuardando(false)
    }
  }

  const nCasas = modo === 'todos' ? vecinos.length : casasSel.length

  return (
    <ModalShell titulo={`Gasto · ${proyecto.titulo}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
          Registra el gasto del proyecto y guarda la factura o nota de remisión.
        </p>
        <Campo label="Concepto *">
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej. Compra de pintura"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Monto *">
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </Campo>
          <Campo label="Fecha">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </Campo>
        </div>

        {/* ¿Se divide el gasto entre las casas? */}
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-medium text-slate-700">¿De dónde sale el dinero?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFuente('ahorro')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                fuente === 'ahorro'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              🏦 Del ahorro
            </button>
            <button
              type="button"
              onClick={() => setFuente('cooperacion')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                fuente === 'cooperacion'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              👥 Cooperación
            </button>
          </div>
          {fuente === 'ahorro' && (
            <p className="text-[11px] text-slate-500">
              El gasto se descuenta de la Caja de ahorro de la comunidad.
            </p>
          )}
          {dividir && (
            <>
              <p className="text-[11px] text-slate-500">
                Se creará un cobro en “Otros” por el monto del gasto, repartido en partes iguales
                entre las casas elegidas. Cada vecino paga su parte.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModo('todos')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                    modo === 'todos'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Todas las casas
                </button>
                <button
                  type="button"
                  onClick={() => setModo('algunas')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                    modo === 'algunas'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Solo algunas
                </button>
              </div>
              {modo === 'algunas' && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {vecinos.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={casasSel.includes(v.id)}
                        onChange={() => toggleCasa(v.id)}
                      />
                      <span>
                        {v.casa?.identificador ? `Casa ${v.casa.identificador} · ` : ''}
                        {v.nombre}
                      </span>
                    </label>
                  ))}
                  {vecinos.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">No hay vecinos registrados.</p>
                  )}
                </div>
              )}
              {nCasas > 0 && Number(monto) > 0 && (
                <p className="text-[11px] text-teal-700">
                  Cada casa pagaría {money(Number(monto) / nCasas)} ({nCasas} casas).
                </p>
              )}
            </>
          )}
        </div>

        <Campo label="Factura o nota de remisión">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </Campo>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Registrar gasto'}
        </button>
      </form>
    </ModalShell>
  )
}

function FormAportacion({ privada, vecino, isAdmin, onCerrar, onGuardado }) {
  const [concepto, setConcepto] = useState('')
  const [tipo, setTipo] = useState('dinero') // 'dinero' | 'especie'
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [archivo, setArchivo] = useState(null)
  const [vecinoSel, setVecinoSel] = useState(vecino?.id || '')
  const [vecinos, setVecinos] = useState([])
  const [destino, setDestino] = useState('') // '' = Ahorro (caja); id = proyecto
  const [proyectos, setProyectos] = useState([])
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
    supabase
      .from('proyectos')
      .select('id, titulo')
      .order('creado_en', { ascending: false })
      .then(({ data }) => setProyectos(data || []))
  }, [isAdmin])

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!concepto.trim()) return setError('Escribe el concepto de la aportación.')
    if (!(Number(monto) > 0)) return setError('Escribe un monto válido.')
    setGuardando(true)
    try {
      const vid = isAdmin && vecinoSel ? vecinoSel : vecino.id
      let path = null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/${vid}/${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, archivo)
        if (upErr) throw upErr
      }
      const { error: insErr } = await supabase.from('aportaciones').insert({
        privada_id: privada.id,
        vecino_id: vid,
        concepto: concepto.trim(),
        tipo,
        monto: Number(monto),
        fecha,
        comprobante_url: path,
        proyecto_id: isAdmin && tipo === 'dinero' && destino ? destino : null,
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
    <ModalShell titulo="Registrar aportación" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        {isAdmin && (
          <Campo label="Registrar a nombre de">
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
          </Campo>
        )}
        <Campo label="Concepto *">
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej. Cooperación para el portón"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Tipo de aportación">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('dinero')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                tipo === 'dinero'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              💵 En dinero
            </button>
            <button
              type="button"
              onClick={() => setTipo('especie')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                tipo === 'especie'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              📦 En especie
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {tipo === 'dinero'
              ? 'Entrará a la Caja de ahorro cuando el administrador emita el recibo.'
              : 'Donación en especie (material, servicio…). No entra a la Caja; se registra su valor.'}
          </p>
        </Campo>
        {isAdmin && tipo === 'dinero' && (
          <Campo label="¿A dónde va este dinero?">
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              <option value="">🏦 Ahorro de la comunidad</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  🏗️ Proyecto: {p.titulo}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              El dinero entra al ahorro; si eliges un proyecto, además cuenta para su avance.
            </p>
          </Campo>
        )}
        <Campo label={tipo === 'especie' ? 'Valor estimado *' : 'Monto *'}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Fecha">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Campo>
        <Campo label="Comprobante (opcional)">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </Campo>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar aportación'}
        </button>
      </form>
    </ModalShell>
  )
}

function DetalleParticipacion({ proyecto, esStaff, onCerrar }) {
  const [avance, setAvance] = useState(null)
  const [desglose, setDesglose] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const av = await supabase.rpc('avance_proyecto', { p_proyecto_id: proyecto.id })
      if (!vivo) return
      setAvance(av.data?.[0] || null)
      if (esStaff) {
        const dg = await supabase.rpc('desglose_proyecto', { p_proyecto_id: proyecto.id })
        if (!vivo) return
        setDesglose(dg.data || [])
      }
      setCargando(false)
    })()
    return () => {
      vivo = false
    }
  }, [proyecto.id, esStaff])

  const nCasas = avance ? Number(avance.n_casas) : 0
  const nAp = avance ? Number(avance.n_aportaron) : 0
  const pct = nCasas > 0 ? Math.round((nAp / nCasas) * 100) : 0

  return (
    <ModalShell titulo={`Participación · ${proyecto.titulo}`} onCerrar={onCerrar}>
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : !avance ? (
        <p className="text-sm text-slate-400">Sin datos de participación por ahora.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>
                {nAp} de {nCasas} casas han aportado
              </span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recaudado {money(avance.recaudado)} de {money(avance.meta)}
            </p>
          </div>

          {esStaff && desglose && (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Quién ha aportado</p>
              {desglose.length === 0 ? (
                <p className="text-xs text-slate-400">Todavía nadie ha aportado a este proyecto.</p>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {desglose.map((d) => (
                    <li
                      key={d.vecino_id}
                      className="py-2 flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">{d.casa ? `Casa ${d.casa}` : d.nombre}</span>
                      <span className="font-semibold text-emerald-700">{money(d.monto)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!esStaff && (
            <p className="text-[11px] text-slate-400">Solo la administración ve quién aportó.</p>
          )}
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
