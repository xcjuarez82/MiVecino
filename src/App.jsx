import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppGate from './components/AppGate'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pagos from './pages/Pagos'
import Conceptos from './pages/Conceptos'
import Directorio from './pages/Directorio'
import Accesos from './pages/Accesos'
import Caja from './pages/Caja'
import Configuracion from './pages/Configuracion'
import Juntas from './pages/Juntas'
import Proyectos from './pages/Proyectos'
import Participacion from './pages/Participacion'
import Emergencia from './pages/Emergencia'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppGate />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="conceptos" element={<Conceptos />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="caja" element={<Caja />} />
            <Route path="directorio" element={<Directorio />} />
            <Route path="accesos" element={<Accesos />} />
            <Route path="proyectos" element={<Proyectos />} />
            <Route path="juntas" element={<Juntas />} />
            <Route path="participacion" element={<Participacion />} />
            <Route path="emergencia" element={<Emergencia />} />
          </Route>
          <Route path="*" element={<Placeholder titulo="Página no encontrada" icono="🧭" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
