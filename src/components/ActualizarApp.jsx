import { useRegisterSW } from 'virtual:pwa-register/react'

// Aviso de "nueva versión disponible". Cuando publicamos una modificación,
// el navegador detecta el cambio y muestra este banner con el botón Actualizar.
export default function ActualizarApp() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-teal-700 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="text-xl leading-none">🎉</span>
        <span className="text-sm font-medium flex-1 leading-tight">
          Hay una nueva versión de Mi Vecino.
        </span>
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-white text-teal-700 rounded-lg px-3 py-1.5 text-sm font-semibold shrink-0"
        >
          Actualizar
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Cerrar"
          className="text-teal-100 hover:text-white text-xl leading-none shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}
