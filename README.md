# GSP móvil — Generador de Solicitudes de Permiso

**Versión 0.8.5 — PWA móvil depurada**

Aplicación web progresiva para diligenciar solicitudes institucionales de permiso y generar el documento PDF desde un navegador compatible.

## Publicación en GitHub Pages

1. Descomprima el ZIP.
2. Abra el repositorio de GitHub Pages.
3. Cargue el contenido de esta carpeta en la raíz del repositorio y confirme el reemplazo de los archivos existentes.
4. Espere a que GitHub Pages termine la publicación.
5. Abra la dirección HTTPS de la aplicación con conexión a internet. Cierre completamente la PWA anterior y vuelva a abrirla para que el service worker instale la caché v0.8.5.

## Pruebas locales

Se requiere Node.js únicamente para ejecutar las pruebas de validación; no se necesita instalar Electron ni compilar ejecutables.

```bash
npm test
```

La aplicación publicada funciona en el navegador. La biblioteca PDF se carga desde jsDelivr y el service worker intenta conservarla en caché para el uso sin conexión después de la primera carga satisfactoria.

## Estructura

- `index.html`: interfaz web de la PWA.
- `src/renderer.js`: interacción y validaciones del formulario.
- `src/mobile-bridge.js`: generación del PDF y manejo de archivos/firma en el navegador.
- `src/validation.js`: reglas de validación compartidas.
- `src/styles.css`: presentación adaptable a dispositivos móviles.
- `service-worker.js`: instalación, actualización y caché offline.
- `manifest.webmanifest`: configuración instalable de la PWA.
- `assets/`: imágenes e identidad institucional.
- `scripts/`: auditoría PWA y pruebas automatizadas.

## Alcance de esta distribución

Esta carpeta corresponde exclusivamente a la versión web móvil. No contiene Electron, procesos principales de escritorio, instaladores de Windows ni scripts de compilación para Windows. La versión de escritorio se mantiene como proyecto independiente.
