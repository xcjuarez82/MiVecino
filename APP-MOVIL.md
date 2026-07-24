# App móvil (APK Android + iOS) — Mi Vecino

URL de la app: **https://cntvecino-app.vercel.app**

---

## 📦 ANDROID — Generar el APK (con PWABuilder, sin instalar nada)

1. En la computadora (o el celular), abre **https://www.pwabuilder.com**
2. Pega la URL: `https://cntvecino-app.vercel.app` y da **Start / Analyze**.
3. Te mostrará una calificación de la PWA. Da clic en **Package For Stores**.
4. Elige **Android** → botón **Generate Package**.
   - Package ID (déjalo así o pon): `mx.itouch.vecinos`
   - App name: **Mi Vecino**
5. Descarga el `.zip`. Adentro vienen:
   - `app-release-signed.apk` → **este es el APK** que se instala directo en el teléfono.
   - `*.aab` → solo si algún día lo subes a **Google Play**.
   - `assetlinks.json` y `signing.keystore` + `signing-key-info.txt` → **GUÁRDALOS** (se necesitan para el modo pantalla completa y para futuras actualizaciones).

### Instalar el APK en un teléfono Android
1. Pasa el archivo `app-release-signed.apk` al teléfono (WhatsApp, correo, cable, Drive).
2. Ábrelo; Android pedirá permitir **“instalar apps de esta fuente”** → acepta.
3. Se instala **Mi Vecino** con su ícono, como app normal.

### 👉 Para que abra a PANTALLA COMPLETA (sin barra del navegador)
Esto requiere un archivo de verificación en el sitio. **Es la parte que yo hago por ti:**
- Del `.zip`, mándame el archivo **`assetlinks.json`** (o pégame su contenido).
- Yo lo publico en `https://cntvecino-app.vercel.app/.well-known/assetlinks.json` y republico.
- Reinstalas el APK y ya abre 100% nativo (sin barra de URL).

*(Si no haces este paso, la app igual funciona, pero se ve una pequeña barra de dirección arriba.)*

---

## 🍎 iOS (iPhone / iPad)

iOS **no usa APK** ni permite instalar apps sueltas como Android. Hay dos caminos:

### A) Como app, YA (gratis, recomendado)
1. Abre `https://cntvecino-app.vercel.app` en **Safari**.
2. Botón **Compartir** ⬆️ → **Agregar a inicio**.
3. Queda con ícono, a **pantalla completa**, como app nativa. (Ya está configurado para eso.)

### B) En la App Store (opcional, más laborioso)
- Se necesita: una **Mac con Xcode** + **cuenta Apple Developer (~$99 USD/año)**.
- En **PWABuilder** eliges **iOS → Generate Package**: te da un proyecto de Xcode que envuelve la app.
- Se abre en Xcode, se firma con tu cuenta Apple y se sube con **Transporter / App Store Connect**.
- Yo puedo prepararte el proyecto, pero el paso final (firmar y subir) requiere tu Mac + cuenta Apple.

---

## Resumen
- **Android:** APK real con PWABuilder (3–4 clics) → me pasas el `assetlinks.json` y lo dejo a pantalla completa.
- **iOS:** “Agregar a inicio” desde Safari se ve y funciona como app nativa hoy mismo; la App Store necesita Mac + cuenta Apple.
