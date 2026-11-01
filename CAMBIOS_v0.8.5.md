# GSP móvil v0.8.5 — PWA depurada

## Cambios de esta versión
- Se identifica el proyecto como versión 0.8.5 en la documentación y en la carpeta raíz del paquete.
- Se depura la distribución para que corresponda exclusivamente a la aplicación web móvil PWA.
- Se excluyen componentes y configuraciones exclusivos de Windows/Electron.
- Se conservan la interfaz web, generación PDF, firma digital, almacenamiento local, manifiesto PWA y service worker.

## Funcionalidades incorporadas en la actualización 0.8.4 y conservadas en 0.8.5
- Fecha de solicitud fijada al día actual.
- Fechas de permiso desde hoy en adelante; se rechazan fechas pasadas.
- Bloqueo de sábados, domingos y festivos nacionales de Colombia.
- Selección de hasta tres fechas hábiles independientes, consecutivas o no.
- Incorporación de Preescolar con Prejardín, Jardín y Transición.
- Eliminación de la opción Otro y del grado 0° de Primaria.
- Importación de firma digital PNG/JPG, recorte automático de márgenes blancos o transparentes y escalado proporcional.
- Eliminación de la línea de firma del solicitante en el PDF y ubicación de la firma digital en el espacio correspondiente.

## Verificación registrada
- Sintaxis JavaScript comprobada.
- Auditoría PWA superada.
- 25 pruebas aprobadas, 0 fallidas.
- La generación PDF y la importación de firma deben validarse en navegador/teléfono después de publicar por HTTPS.
