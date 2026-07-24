import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    Number(n || 0),
  )
const hoy = () => new Date().toISOString().slice(0, 10)

export default function Convenios() {
  const { user, vecino, privada, isAdmin } = useAuth()
  const [convenios, setConvenios] = useState([])
  const [recibos, setRecibos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null) // {} nuevo | convenio editar
  const [reciboDe, setReciboDe] = useState(null) // convenio para agregar recibo

  const cargar = useCallback(async () => {
    if (!privada) return
    setCargando(true)
    const [cRes, rRes] = await Promise.all([
      supabase
        .from('convenios')
        .select('*, vecinos(nombre, casa:casas(identificador))')
        .order('creado_en', { ascending: false }),
      supabase
        .from('pagos')
        .select('*')
        .not('convenio_id', 'is', null)
        .order('creado_en', { ascending: false }),
    ])
    setConvenios(cRes.data || [])
    setRecibos(rRes.data || [])
    setCargando(false)
  }, [privada])

  useEffect(() => {
    cargar()
  }, [cargar])

  const validar = async (c, correcto) => {
    const datos = correcto
      ? { validado: true, validado_por: user.id, validado_en: new Date().toISOString() }
      : { validado: false, validado_por: null, validado_en: null }
    const { error } = await supabase.from('convenios').update(datos).eq('id', c.id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }
  const borrar = async (id) => {
    if (!confirm('¿Eliminar este convenio?')) return
    const { error } = await supabase.from('convenios').delete().eq('id', id)
    if (error) return alert('No se pudo: ' + error.message)
    cargar()
  }
  const verArchivo = async (path) => {
    if (!path) return
    const { data, error } = await supabase.storage.from('comprobantes').createSignedUrl(path, 3600)
    if (error) return alert('No se pudo abrir: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  if (cargando) return <p className="text-sm text-slate-400 bg-white rounded-xl p-4">Cargando…</p>

  const mios = isAdmin ? convenios : convenios.filter((c) => c.vecino_id === vecino?.id)

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <p className="text-xs text-slate-500">
          {isAdmin
            ? 'Convenios de los vecinos con adeudo. Por privacidad, tú solo marcas si el convenio está correcto ✓.'
            : 'Si tienes un adeudo con convenio, regístralo aquí y sube tus recibos. Solo tú y el administrador los ven.'}
        </p>
      </div>

      {!isAdmin && (
        <button
          onClick={() => setForm({})}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5"
        >
          + Registrar convenio
        </button>
      )}

      {mios.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl p-4">
          {isAdmin ? 'Ningún vecino ha registrado convenios.' : 'No tienes convenios registrados.'}
        </p>
      ) : (
        mios.map((c) => {
          const recibosC = recibos.filter((r) => r.convenio_id === c.id)
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    {c.descripcion || c.concepto || 'Convenio de adeudo'}
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-slate-500">
                      {c.vecinos?.nombre}
                      {c.vecinos?.casa?.identificador ? ` · Casa ${c.vecinos.casa.identificador}` : ''}
                    </p>
                  )}
                  {(c.monto_total > 0 || c.monto_mensual > 0) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.monto_total > 0 ? `Total ${money(c.monto_total)}` : ''}
                      {c.monto_mensual > 0 ? ` · Mensual ${money(c.monto_mensual)}` : ''}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[11px] rounded-full px-2 py-0.5 font-semibold ${
                    c.validado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {c.validado ? '✓ Correcto' : 'Por validar'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.documento_url && (
                  <button
                    onClick={() => verArchivo(c.documento_url)}
                    className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600"
                  >
                    Ver convenio
                  </button>
                )}
                {isAdmin ? (
                  c.validado ? (
                    <button
                      onClick={() => validar(c, false)}
                      className="text-xs rounded-lg border border-amber-300 text-amber-700 px-3 py-1.5"
                    >
                      Quitar validación
                    </button>
                  ) : (
                    <button
                      onClick={() => validar(c, true)}
                      className="text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-semibold"
                    >
                      Marcar correcto ✓
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => setReciboDe(c)}
                      className="text-xs rounded-lg bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1.5 font-medium"
                    >
                      + Recibo
                    </button>
                    <button
                      onClick={() => setForm(c)}
                      className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => borrar(c.id)}
                      className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-1.5"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>

              {recibosC.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">
                    Recibos ({recibosC.length})
                  </p>
                  {recibosC.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {r.fecha_pago || '—'} · {money(r.monto)}
                      </span>
                      {r.comprobante_url && (
                        <button
                          onClick={() => verArchivo(r.comprobante_url)}
                          className="text-teal-600 underline"
                        >
                          ver
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {form && (
        <FormConvenio
          privada={privada}
          vecino={vecino}
          convenio={form}
          onCerrar={() => setForm(null)}
          onGuardado={() => {
            setForm(null)
            cargar()
          }}
        />
      )}
      {reciboDe && (
        <FormRecibo
          privada={privada}
          vecino={vecino}
          convenio={reciboDe}
          onCerrar={() => setReciboDe(null)}
          onGuardado={() => {
            setReciboDe(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function FormConvenio({ privada, vecino, convenio, onCerrar, onGuardado }) {
  const esNuevo = !convenio.id
  const [descripcion, setDescripcion] = useState(convenio.descripcion || '')
  const [montoTotal, setMontoTotal] = useState(convenio.monto_total || '')
  const [montoMensual, setMontoMensual] = useState(convenio.monto_mensual || '')
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      let path = convenio.documento_url || null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/${vecino.id}/convenio-${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, archivo)
        if (upErr) throw upErr
      }
      const datos = {
        privada_id: privada.id,
        vecino_id: vecino.id,
        descripcion: descripcion.trim() || 'Convenio de adeudo',
        monto_total: Number(montoTotal || 0),
        monto_mensual: Number(montoMensual || 0),
        documento_url: path,
      }
      const resp = esNuevo
        ? await supabase.from('convenios').insert({ ...datos, validado: false })
        : await supabase.from('convenios').update(datos).eq('id', convenio.id)
      if (resp.error) throw resp.error
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message || 'error'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalConv titulo={esNuevo ? 'Registrar convenio' : 'Editar convenio'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Descripción</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Convenio de mantenimiento 2024–2025"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monto total</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Mensualidad</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={montoMensual}
              onChange={(e) => setMontoMensual(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Documento del convenio (foto o PDF)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </ModalConv>
  )
}

function FormRecibo({ privada, vecino, convenio, onCerrar, onGuardado }) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (!monto || Number(monto) <= 0) return setError('Escribe el monto.')
    setGuardando(true)
    try {
      let path = null
      if (archivo) {
        const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${privada.id}/${vecino.id}/recibo-${Date.now()}-${limpio}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, archivo)
        if (upErr) throw upErr
      }
      const { error: insErr } = await supabase.from('pagos').insert({
        privada_id: privada.id,
        vecino_id: vecino.id,
        convenio_id: convenio.id,
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
    <ModalConv titulo="Agregar recibo del convenio" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monto *</label>
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
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Comprobante (foto o PDF)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5"
        >
          {guardando ? 'Guardando…' : 'Guardar recibo'}
        </button>
      </form>
    </ModalConv>
  )
}

function ModalConv({ titulo, children, onCerrar }) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <button onClick={onCerrar} className="text-slate-400 text-2xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
