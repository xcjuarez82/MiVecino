import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [vecino, setVecino] = useState(null)
  const [privada, setPrivada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verComoVecino, setVerComoVecino] = useState(false)
  const [recuperandoClave, setRecuperandoClave] = useState(false)

  const cargarPerfil = useCallback(async (uid) => {
    if (!uid) {
      setVecino(null)
      setPrivada(null)
      return
    }
    const { data } = await supabase
      .from('vecinos')
      .select('*, privadas(*), casa:casas(identificador, etiqueta)')
      .eq('user_id', uid)
      .eq('estatus', 'activo')
      .order('autorizado', { ascending: false })
      .limit(1)
    const v = data?.[0] || null
    setVecino(v)
    setPrivada(v?.privadas || null)
  }, [])

  useEffect(() => {
    let activo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return
      setSession(data.session)
      await cargarPerfil(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      // El enlace de "recuperar contraseña" abre sesión y dispara este evento:
      // mostramos la pantalla para elegir una nueva clave.
      if (_e === 'PASSWORD_RECOVERY') setRecuperandoClave(true)
      // Cuando el usuario CONFIRMA un cambio de correo, sincronizamos la ficha
      // con el correo real ya confirmado (así el "una sola vez" no se gasta por un typo).
      if (_e === 'USER_UPDATED') {
        try {
          await supabase.rpc('sincronizar_correo_confirmado')
        } catch (e) {
          /* silencioso: es una sincronización de conveniencia */
        }
      }
      setSession(sess)
      await cargarPerfil(sess?.user?.id)
    })
    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const esAdminReal = vecino?.rol === 'admin' || vecino?.rol === 'tesorero'
  const esStaffReal = ['admin', 'tesorero', 'promotoria'].includes(vecino?.rol)

  const value = {
    session,
    user: session?.user ?? null,
    vecino,
    privada,
    casa: vecino?.casa || null,
    // Rol EFECTIVO en la interfaz (el admin puede simular ser vecino normal)
    isAdmin: !verComoVecino && esAdminReal,
    isStaff: !verComoVecino && esStaffReal,
    // Rol REAL (para saber quién puede activar la simulación)
    esAdminReal,
    esStaffReal,
    verComoVecino,
    setVerComoVecino,
    autorizado: !!vecino?.autorizado,
    loading,
    recuperandoClave,
    setRecuperandoClave,
    refrescarPerfil: () => cargarPerfil(session?.user?.id),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) =>
      supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      }),
    resetPassword: (email) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      }),
    updatePassword: (password) => supabase.auth.updateUser({ password }),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
