## Versión móvil 0.8.4

Actualización derivada de los ajustes validados en GSP PC v0.8.3: fechas hábiles, máximo de tres días, niveles Preescolar y Primaria ajustados e importación de firma digital recortada automáticamente.

# Generador de Solicitudes de Permiso — evolución funcional 0.2.9

## Alcance
Este proyecto se reconstruyó a partir de los archivos fuente localizados en la biblioteca. El ejecutable original `Solicitud Permiso 0.2.8.exe` no se modificó. La hoja `src/styles.css` fue recreada porque no se localizó la original; por ello, el aspecto visual no puede garantizarse idéntico al de la distribución original.

## Requisitos
- Windows 10/11 de 64 bits para empaquetar Windows.
- Node.js compatible con Electron 41.
- Acceso a internet para instalar dependencias inicialmente.

## Ejecutar en desarrollo
1. Instalar Node.js.
2. Abrir una terminal en esta carpeta.
3. Ejecutar `npm install`.
4. Ejecutar `npm start`.

## Empaquetar
Ejecutar `npm run build`. Los artefactos se generan en `dist/`.

## Funciones recuperadas
- Solicitud por días o por horas.
- Datos del solicitante, sede, causa y observaciones.
- Selección opcional de soporte PDF/JPG/JPEG/PNG, límite de 25 MB.
- Generación de un PDF combinado y diálogo para elegir la ubicación de guardado.

## Cambios de seguridad realizados en esta revisión
- Activación de `sandbox` en la ventana Electron.
- Verificación del emisor y del documento principal en los manejadores IPC.
- El proceso principal conserva la ruta del soporte elegido; la interfaz ya no puede enviar una ruta arbitraria para leer archivos del equipo.
- Validación de extensión, tamaño y tipo de objeto del soporte.
- Límites defensivos adicionales: los PDF adjuntos no pueden superar 100 páginas y las imágenes deben tener como máximo 12.000 px por dimensión y 40 megapíxeles.
- Validación adicional de fechas calendario reales (rechaza fechas inexistentes), horas y longitudes de campos en el proceso principal.
- Canal IPC explícito para quitar el soporte seleccionado.
- Se eliminó de la interfaz una variable de ruta de soporte que ya no se utilizaba; la ruta real permanece únicamente bajo control del proceso principal.

## Validaciones efectuadas
- `node --check` sin errores en `main.js`, `preload.js` y `src/renderer.js`.
- Comprobación estática de referencias del renderer: todos los identificadores usados existen en `src/index.html`.
- Se incorporó el sello institucional recortado del membrete aportado y se añadió el crédito discreto, en letra serif cursiva pequeña: “Desarrollado por Mg. César Avila”, tanto en la interfaz como en el pie de la solicitud PDF.

## Limitaciones no resueltas
- Se incorporó `assets/encabezado-institucional.png`, recortado del membrete institucional compartido en la conversación. La hoja CSS original no se localizó y fue recreada.
- Se intentó ejecutar `npm install`, pero agotó el tiempo de espera en este entorno. Se volvió a intentar `npm install --no-audit --no-fund`, pero agotó el tiempo de espera. No se ejecutaron la aplicación Electron ni `electron-builder`; por tanto, no se certifica la generación del PDF en tiempo de ejecución ni el empaquetado para Windows.
- Los PDF de soporte se incorporan copiando sus páginas, con un máximo de 100 páginas. Los archivos PDF malformados pueden producir un error de lectura; la aplicación informa el error y no debe considerarse que el documento se generó correctamente.
- La ruta de destino es seleccionada por el usuario; la aplicación pide confirmación antes de reemplazar un archivo existente.

## Preservación
El ejecutable original encontrado en la biblioteca permanece intacto. Este ZIP es una reconstrucción de los fuentes disponibles, no una copia certificada del proyecto original.


Encabezado: se utiliza una imagen recortada del membrete original de “FORMATO SOLICITUD DE PERMISO.pdf”, que ya contiene el logo institucional. El sistema no agrega un segundo logo.

### Límites de entrada

Los campos de nombre del rector y del solicitante admiten hasta 100 caracteres; el documento hasta 30; y las observaciones hasta 500. El proceso principal vuelve a validar estos límites antes de crear el PDF, de modo que la validación no depende únicamente de la interfaz.


### Validaciones adicionales

El proceso principal valida también los valores permitidos para tipo de personal, sede y causa, y comprueba que el cargo corresponda al tipo de personal seleccionado. Estas comprobaciones se realizan además de las validaciones visuales del formulario.


### Auditoría estática

Con Node.js instalado, ejecute `npm test` en la carpeta del proyecto. Esta prueba comprueba la sintaxis JavaScript, las referencias entre HTML y renderer, los recursos locales y la presencia de controles de validación. No sustituye las pruebas funcionales de Electron ni la generación real de PDF.

### Alcance de la auditoría ampliada

La auditoría `npm test` también verifica que no existan IDs HTML duplicados, que estén presentes los controles obligatorios, que `package.json` declare correctamente el test y que los objetivos de empaquetado Windows NSIS y portable estén configurados. Estas son comprobaciones estáticas; no simulan la ventana Electron ni la creación del PDF.

### Pruebas unitarias de validación
La ejecución de `npm test` ahora incluye pruebas unitarias reales de `src/validation.js`: fechas calendario válidas e inválidas, solicitudes por días y horas, campos obligatorios, formato del documento, rango de fechas, compatibilidad entre tipo de personal y cargo, catálogos institucionales, estructuras de datos inválidas y límites de caracteres. La auditoría también verifica el encabezado original, la anexión de páginas PDF y que la carta no duplique la línea «Ciudad.-». Estas pruebas no necesitan instalar Electron ni `pdf-lib`.

### Límites de procesamiento de soportes

Además del máximo de 25 MB por archivo, se rechazan PDF de más de 100 páginas e imágenes de más de 40 megapíxeles o 12.000 píxeles en cualquiera de sus dimensiones, para reducir el riesgo de consumo excesivo de memoria durante la conversión. Los validadores de estos límites están aislados y cubiertos por pruebas unitarias.


### Pruebas actualizadas

`npm test` ejecuta auditoría estática y 20 pruebas unitarias: 12 de solicitudes y 8 de validación de soportes, incluidos límites de páginas PDF, dimensiones y megapíxeles de imágenes. Esto no sustituye las pruebas de ejecución real en Electron, generación PDF y empaquetado Windows.


### Prevención de decodificación de imágenes sobredimensionadas
Antes de pedir a Electron que decodifique los píxeles de un soporte, la aplicación lee las dimensiones directamente de la cabecera PNG/JPEG y aplica los límites establecidos. Después de decodificar, vuelve a comprobar las dimensiones informadas por Electron. Esto permite rechazar imágenes excesivas antes de la asignación de memoria de la imagen decodificada. Se añadieron pruebas unitarias para las cabeceras PNG y JPEG válidas e inválidas.


## Cambios funcionales de la versión 0.2.9

- Campos contextuales de jornada, nivel, grado/grupo y área para solicitudes de docentes.
- Plan propuesto de atención a estudiantes con modalidades pedagógicas, detalle y espacio de revisión de Coordinación.
- Campos de situación específica y justificación ampliada.
- Aviso contextual para la causa «Otro».
- Aviso preventivo cuando el periodo de docentes/directivos docentes supera tres días de lunes a viernes; el aviso explica que no descuenta festivos ni reemplaza la verificación del régimen aplicable.
- Prevención de generación dirigida al propio rector(a), dado que debe tramitarse ante el superior jerárquico competente.
- Inclusión de los nuevos datos en el PDF y conservación del membrete original y del crédito de autoría.

## Límites que siguen pendientes de una siguiente iteración

Esta versión todavía admite un solo archivo de soporte por solicitud; no implementa importación múltiple ni una bandeja de trámite multiusuario. La lista de cargos administrativos requiere confirmación institucional antes de considerarse definitiva. La aplicación genera una solicitud para revisión, no aprueba permisos. Las pruebas automatizadas verifican validaciones y estructura, pero no sustituyen una prueba manual de Electron, de selección de archivos ni de la apariencia final del PDF en el equipo de destino.


## Cambios de la versión 0.4.1

- La selección de sede se adapta al perfil: docentes y coordinadores trabajan con las cinco sedes educativas; los demás perfiles pueden seleccionar también la sede administrativa.
- Para solicitudes de Rectoría aparece un campo obligatorio para identificar la autoridad jerárquica destinataria. El PDF dirige la carta a esa autoridad y no a la propia Rectoría.
- El área académica pasa a un catálogo seleccionable para secundaria y media.
- La carta formal incluye la situación específica y la justificación registrada.
- El encabezado institucional se centra y se separa 0,7 cm del borde superior.
- Se actualizaron pruebas de validación de cargos, causas, fechas, sedes y destinatario jerárquico.

La carpeta `assets` disponible en este proyecto contiene el encabezado institucional, pero no se encontró una imagen independiente del pie de página. Por ello, el pie gráfico original aún requiere ese recurso para poder incorporarse con fidelidad. La generación PDF y la interfaz deben probarse en Windows antes de sustituir el ejecutable original.


## Versión 0.4.2
- Se incorpora la sede ADMINISTRATIVA en el selector de sedes para perfiles no docentes y coordinación.
- En Primaria, el grado se selecciona de 0° a 5° y el grupo se digita en un campo separado.
- El aviso de «Otra causa justificada» aparece inmediatamente después de la selección de causa e indica terminar el formulario, imprimirlo y acudir personalmente a Rectoría.
- El campo de revisión/observaciones de Coordinación informa expresamente que debe dejarse en blanco por el solicitante.


## Versión 0.4.3
- Se reorganizó la identificación para separar los datos del solicitante del destinatario institucional.
- Se añadieron los desplegables de tratamiento de Rectoría y cargo Rector/Rectora.
- El PDF utiliza el tratamiento, nombre y cargo seleccionados en el bloque de destinatario.


## Versión 0.4.5
- Destinatario institucional distribuido en una fila de tres columnas en pantallas amplias y apilado en pantallas estrechas.
- Selector de sedes de coordinación muestra todas las opciones disponibles simultáneamente y explica la selección múltiple con Ctrl/Command. Incluye ADMINISTRATIVA/PRINCIPAL.


### Versión 0.4.6 — Pie de página institucional
- Se incorporó la imagen original del pie de página compartida por el usuario, centrada horizontalmente y ubicada a 0,7 mm del borde inferior en las páginas generadas por la aplicación.
- El pie se incorpora a las páginas de solicitud y a las páginas de soporte de imagen generadas por la aplicación. Los PDF adjuntos se mantienen íntegros, sin alterar sus páginas originales.
- Se reservó espacio inferior en las páginas de imagen para evitar que el soporte se superponga al pie institucional.


Versión 0.5.3: rediseño del PDF como informe institucional en tablas compactas; secciones separadas para identificación, destinatario, información del permiso, plan pedagógico, anexos y firmas/decisión. Los soportes siguen incorporándose después del informe principal. Pruebas automatizadas: 22/22 superadas. La inspección visual de Electron/PDF en Windows sigue pendiente.


## Versión 0.5.7

- `ADMINISTRATIVA/PRINCIPAL` aparece como opción de sede para todos los tipos de personal.
- El campo de modalidad de atención permite selección múltiple de estrategias pedagógicas; mantenga Ctrl (Windows) o ⌘ Command (Mac) mientras selecciona varias opciones.
- Si se incluye “Otra estrategia pedagógica”, se exige describir las actividades, grupos y materiales.
- Pruebas automatizadas: 22 superadas. La validación visual en Electron/Windows sigue pendiente.


## Versión 0.5.9

- Aumenta la altura del recuadro de decisión de Rectoría para que la etiqueta de fecha y firma no quede pegada al borde inferior.
- Amplía el área útil de las imágenes anexas manteniendo una reserva inferior para el pie institucional y el crédito de autoría.
- Conserva las proporciones originales de las imágenes y evita recortes.


## Versión 0.6.0

- Actualización de los desplegables para asuntos médicos, calamidad familiar, asuntos judiciales y diligencias ante autoridades públicas.
- Eliminación de «Situación familiar urgente» como causa independiente; los casos que correspondan se canalizan por «Calamidad familiar».
- Ampliación de «Compensatorio» con la opción «Descanso compensatorio por cumpleaños».
- Incorporación de «Permiso sindical» como causa independiente con la situación «Reunión o asamblea sindical».
- Las opciones «Otra situación…», «Otra calamidad…», «Otra diligencia…» y «Otro motivo…» requieren descripción en el campo de justificación existente. No se añaden campos adicionales.
- Los soportes continúan adjuntándose mediante el control existente.


## Versión 0.6.5 — preparación de compilación Windows

- Se añadió `COMPILAR_WINDOWS.bat` para instalar dependencias, ejecutar las 25 pruebas automatizadas y generar el instalador NSIS y el ejecutable portable en un PC Windows.
- Se añadió `npm run build:win` como comando explícito de compilación.
- El empaquetado real no pudo ejecutarse en este entorno porque no hay resolución de red hacia `registry.npmjs.org`; no se afirma que existan binarios compilados.
- Estado de la adaptación móvil documentado en `ESTADO_PLATAFORMAS.md`: requiere portar selección de soportes y generación/ensamblado del PDF al navegador antes de ofrecer una PWA funcional.
