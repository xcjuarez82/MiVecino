export default function Placeholder({ titulo = 'Sección', icono = '🛠️' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div className="text-4xl mb-3">{icono}</div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">{titulo}</h2>
      <p className="text-slate-500 text-sm">
        Esta sección la construiremos muy pronto. Estamos avanzando pantalla por
        pantalla. 🙂
      </p>
    </div>
  )
}
