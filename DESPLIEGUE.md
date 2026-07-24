# Guía de despliegue — Vecinos by Itouch (ProjectGranada)

La app es una **PWA** (aplicación web instalable). Ya está lista para producción:
`npm run build` genera la carpeta `dist/` con las variables de Supabase incluidas.

---

## 1) Subir a Vercel (la web)

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` ya quedan **compiladas dentro
del build**, así que no hay que configurarlas en Vercel para que funcione.

### Opción fácil (guiada, sin escribir comandos raros)
Xavier puede pedirme que lo haga en vivo: yo corro los comandos y tú solo confirmas el
inicio de sesión en el navegador.

1. Instalar/usar Vercel CLI: `npx vercel login` → se abre el navegador, inicias sesión.
2. En la carpeta del proyecto: `npx vercel --prod`
   - Framework: **Vite** (lo detecta solo).
   - Build command: `npm run build` · Output: `dist`
3. Al terminar te da una URL tipo `https://vecinos-itouch.vercel.app`. Esa es la app.

### Opción por GitHub (para actualizaciones automáticas)
1. Sube el proyecto a un repositorio de GitHub.
2. En vercel.com → **Add New → Project → Import** ese repo.
3. (Opcional) En Settings → Environment Variables agrega `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` para que los rebuilds en la nube también las tengan.
4. Deploy. Cada `git push` vuelve a publicar.

> `vercel.json` ya está incluido con las reglas para que las rutas internas (/pagos, /caja…)
> funcionen al recargar la página.

---

## 2) App para Android

### A) Instalar como app (inmediato, gratis, sin tienda)
1. Abre la URL de Vercel en **Chrome** (Android).
2. Menú **⋮** → **Instalar aplicación** / **Agregar a pantalla de inicio**.
3. Queda como ícono, a pantalla completa y funciona offline (ya tiene manifest + service worker).

### B) Publicar en Google Play (opcional)
- Entra a **https://www.pwabuilder.com**, pega la URL de Vercel → genera un paquete
  **Android (.aab)** firmado.
- Súbelo en **Google Play Console** (cuenta de desarrollador: pago único ~$25 USD).
- Alternativa técnica: `@bubblewrap/cli` (TWA).

---

## 3) App para iOS (iPhone/iPad)

### A) Instalar como app (inmediato, gratis, sin tienda)
1. Abre la URL de Vercel en **Safari** (iOS).
2. Botón **Compartir** (cuadro con flecha) → **Agregar a inicio**.
3. Queda como ícono a pantalla completa (ya está configurado
   `apple-mobile-web-app-capable`).

### B) Publicar en App Store (opcional, más laborioso)
- iOS no acepta PWAs directas en la tienda. Se envuelve con **PWABuilder** (paquete iOS) o
  **Capacitor**, se abre en **Xcode** (Mac) y se sube con una **cuenta Apple Developer**
  (~$99 USD/año).

---

## Recomendación
Para empezar ya: **Vercel + "Agregar a inicio"** en Android e iOS. Es gratis, inmediato y
suficiente para que todos los vecinos la usen como app. Las tiendas se pueden hacer después.
