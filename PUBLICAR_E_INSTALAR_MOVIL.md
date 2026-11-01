# Generador de Solicitudes de Permiso — versión móvil PWA 0.7.0

## Qué incluye
- Formulario institucional existente adaptado a pantallas móviles.
- Ícono propio para añadirlo a la pantalla de inicio de Android/iPhone.
- Generación del PDF en el navegador y descarga del archivo.
- Selección de varios soportes PDF/JPG/JPEG/PNG (hasta 20 archivos, 25 MB por archivo); los PDF se incorporan al final y las imágenes se anexan en páginas institucionales.
- Caché PWA de la interfaz y del motor PDF para facilitar el uso posterior sin conexión, si el primer acceso pudo descargar todos los recursos.

## Importante
Este paquete es el proyecto fuente para publicar en un servidor HTTPS; no es una app instalada ni contiene una URL pública. Para instalarlo en el móvil hay que publicarlo primero en un hosting estático HTTPS. La primera apertura necesita internet para cargar la aplicación y el motor PDF. No se ha hecho una prueba real en un teléfono Android/iPhone en esta sesión.

## Publicar con hosting estático HTTPS
Suba el contenido de la carpeta `solicitud_permiso_reconstruido` a la raíz de un hosting estático HTTPS (por ejemplo GitHub Pages, Cloudflare Pages o Netlify). No cambie las rutas relativas de `index.html`, `assets`, `src`, `manifest.webmanifest` ni `service-worker.js`.

Antes de publicarlo, compruebe que el hosting sirve:
- `/index.html`
- `/manifest.webmanifest`
- `/service-worker.js`
- `/assets/icono-192.png`
- `/assets/icono-512.png`

## Instalar en Android
1. Abra la URL HTTPS en Chrome.
2. Abra el menú de Chrome y elija «Instalar aplicación» o «Añadir a pantalla principal».
3. Confirme. Debe aparecer el ícono de Solicitudes.

## Instalar en iPhone
1. Abra la URL HTTPS en Safari.
2. Toque Compartir.
3. Seleccione «Añadir a pantalla de inicio».
4. Confirme el nombre y añada.

## Uso móvil
1. Abra el ícono instalado.
2. Diligencie el formulario.
3. Toque «Adjuntar soportes» y seleccione uno o varios archivos.
4. Toque «Generar solicitud PDF». El navegador descargará el documento; la ubicación depende del navegador y del dispositivo.

## Limitaciones que deben validarse en el dispositivo real
- El sistema operativo puede mostrar un diálogo de descarga o abrir el PDF en una vista previa, según navegador y ajustes.
- Los PDF adjuntos protegidos con contraseña, dañados o con estructuras no compatibles pueden fallar.
- Las imágenes anexas se incrustan como JPG/PNG; las fotos HEIC deben convertirse a JPG antes de adjuntarse.
- La selección de sedes múltiples y estrategias se ha ajustado para toque, pero debe verificarse en Android/iPhone.
- El PDF móvil conserva el membrete, pie, datos, firmas y anexos, pero la diagramación es una implementación web equivalente y debe compararse visualmente con la versión de PC.
- El motor PDF se obtiene de jsDelivr durante la primera visita y se intenta guardar en caché. Si la red bloquea ese CDN, la generación de PDF no estará disponible hasta que pueda cargarse.

## Pruebas realizadas en esta entrega
Se revisaron las rutas de archivos y la sintaxis de los scripts. Estas verificaciones no sustituyen pruebas reales en un teléfono ni validan visualmente el PDF móvil.
