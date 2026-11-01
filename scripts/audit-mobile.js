const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = [
  'index.html','manifest.webmanifest','service-worker.js','src/mobile-bridge.js',
  'src/renderer.js','src/styles.css','assets/icono-192.png','assets/icono-512.png',
  'assets/encabezado-institucional.png','assets/pie-institucional.png'
];
let failed = false;
for (const f of required) {
  if (!fs.existsSync(path.join(root,f))) { console.error('FALTA:', f); failed = true; }
}
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
for (const phrase of ['manifest.webmanifest','src/mobile-bridge.js','src/renderer.js','service-worker.js']) {
  if (!html.includes(phrase)) { console.error('REFERENCIA HTML FALTANTE:',phrase); failed = true; }
}
const bridge = fs.readFileSync(path.join(root,'src/mobile-bridge.js'),'utf8');
for (const phrase of ['seleccionarSoporte','quitarSoporte','generarPdf','PDFDocument.load','pdf.save','createObjectURL']) {
  if (!bridge.includes(phrase)) { console.error('FUNCION MOVIL FALTANTE:',phrase); failed = true; }
}
if (failed) process.exit(1);
console.log('AUDITORIA PWA: recursos, manifiesto, service worker y bridge móvil presentes.');
