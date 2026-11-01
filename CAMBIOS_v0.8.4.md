# GSP móvil v0.8.4

Actualización basada en los ajustes consolidados de GSP PC v0.8.3.

## Cambios
- Fecha de solicitud fijada al día actual.
- Fechas de permiso desde hoy en adelante; se rechazan fechas pasadas.
- Bloqueo de sábados, domingos y festivos nacionales de Colombia, tanto en permisos por días como por horas.
- Selección de hasta tres fechas hábiles independientes, consecutivas o no.
- Validación de máximo tres días hábiles y rechazo de fechas duplicadas.
- Incorporación de Preescolar con Prejardín, Jardín y Transición.
- Eliminación de la opción Otro y del grado 0° de Primaria.
- Importación de firma digital PNG/JPG, máximo 5 MB, con recorte automático de márgenes blancos o transparentes y escalado proporcional.
- Eliminación de la línea de firma del solicitante en el PDF y ubicación de la firma digital en el espacio correspondiente.
- Conservación de la PWA, almacenamiento local, soportes adjuntos y estructura de generación PDF.

## Verificación realizada
- `node --check` en `src/renderer.js` y `src/mobile-bridge.js`: correcto.
- `npm run test:mobile`: auditoría PWA superada.
- `node --test scripts/validation.test.js scripts/support-validation.test.js`: 25 pruebas aprobadas, 0 fallidas.

La generación PDF debe probarse en navegador/dispositivo después de publicar la carpeta en HTTPS, especialmente la importación de firma en el teléfono.
