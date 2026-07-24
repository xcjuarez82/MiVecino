// Manejo del tema claro/oscuro/automático.
const KEY = 'tema'

export function temaGuardado() {
  try {
    return localStorage.getItem(KEY) || 'system'
  } catch {
    return 'system'
  }
}

export function aplicarTema(t) {
  const oscuro =
    t === 'dark' ||
    (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', oscuro)
}

export function guardarTema(t) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // ignorar
  }
  aplicarTema(t)
}
