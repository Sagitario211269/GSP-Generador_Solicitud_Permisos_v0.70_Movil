const $ = (id) => document.getElementById(id);

const form = $('form');
const message = $('message');
const supportBtn = $('supportBtn');
const supportInfo = $('supportInfo');
const removeSupport = $('removeSupport');
const generateBtn = $('generate');
const tipoPersonal = $('tipoPersonal');
const cargo = $('cargo');
const causa = $('causa');
const diasFields = $('diasFields');
const horasFields = $('horasFields');
const modalidadInputs = [...document.querySelectorAll('input[name="modalidad"]')];
const planDocente = $('planDocente');
const academicos = $('academicos');



// Persistencia local de los campos del formulario en este dispositivo/navegador.
// Los archivos adjuntos no se guardan; deben volver a seleccionarse al reabrir.
const DRAFT_STORAGE_KEY = 'gsp-permiso-pwa-draft-v0.7.1';
let restoringDraft = false;
function getDraftControls() {
  return [...form.querySelectorAll('input, select, textarea')].filter(el =>
    el.type !== 'file' && el.type !== 'password' && el.name !== 'modalidad'
  );
}
function saveDraft() {
  if (restoringDraft) return;
  try {
    const values = {};
    for (const el of getDraftControls()) {
      if (!el.id) continue;
      values[el.id] = el instanceof HTMLSelectElement && el.multiple
        ? [...el.selectedOptions].map(option => option.value)
        : el.value;
    }
    values.__modalidad = modalidad();
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({version: 1, savedAt: new Date().toISOString(), values}));
    const status = $('draftStatus');
    if (status) status.textContent = 'Borrador guardado automáticamente en este dispositivo.';
  } catch (error) {
    const status = $('draftStatus');
    if (status) status.textContent = 'No se pudo guardar el borrador en este navegador.';
  }
}
function restoreDraft() {
  let draft;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null'); }
  catch (_) { return; }
  if (!draft || draft.version !== 1 || !draft.values) return;
  restoringDraft = true;
  try {
    const values = draft.values;
    // Restaurar primero campos base para reconstruir los desplegables dependientes.
    for (const el of getDraftControls()) {
      if (!el.id || ['cargo', 'sede', 'situacion'].includes(el.id) || el.id === 'fechaSolicitud') continue;
      if (el instanceof HTMLSelectElement && el.multiple) {
        const selected = new Set(Array.isArray(values[el.id]) ? values[el.id] : []);
        [...el.options].forEach(option => { option.selected = selected.has(option.value); });
      } else if (Object.prototype.hasOwnProperty.call(values, el.id)) {
        el.value = values[el.id];
      }
    }
    if (values.__modalidad) {
      const radio = form.querySelector(`input[name="modalidad"][value="${CSS.escape(values.__modalidad)}"]`);
      if (radio) radio.checked = true;
    }
    updateCargoOptions();
    if (values.cargo) $('cargo').value = values.cargo;
    updateProfileFields();
    if (values.sede) {
      const selectedSites = Array.isArray(values.sede) ? values.sede : String(values.sede).split(', ').filter(Boolean);
      [...$('sede').options].forEach(option => { option.selected = selectedSites.includes(option.value); });
    }
    updateCauseSituations();
    if (values.situacion) $('situacion').value = values.situacion;
    updateDescriptionRequirement();
    updateMode();
    updateAcademicFields();
    forceUppercaseName();
    forceUppercaseRector();
    // La fecha de solicitud siempre corresponde al día actual, no a la fecha del borrador.
    lockRequestDateToToday();
    const status = $('draftStatus');
    if (status) status.textContent = 'Se recuperaron los últimos datos guardados. Los soportes deben adjuntarse nuevamente.';
  } finally {
    restoringDraft = false;
  }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (_) {}
  const status = $('draftStatus');
  if (status) status.textContent = 'Borrador eliminado de este dispositivo.';
}
form.addEventListener('input', saveDraft);
form.addEventListener('change', saveDraft);

function forceUppercaseName() {
  const input = $('nombre');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.toLocaleUpperCase('es-CO');
  if (document.activeElement === input && start !== null && end !== null) {
    input.setSelectionRange(start, end);
  }
}


function forceUppercaseRector() {
  const input = $('rector');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.toLocaleUpperCase('es-CO');
  if (document.activeElement === input && start !== null && end !== null) {
    input.setSelectionRange(start, end);
  }
}

const cargosPorTipo = {
  'DOCENTE': ['DOCENTE DE AULA', 'DOCENTE ORIENTADOR', 'DOCENTE DE APOYO', 'DOCENTE PTA'],
  'DIRECTIVO DOCENTE': ['RECTOR', 'COORDINADOR ACADÉMICO', 'COORDINADOR DE CONVIVENCIA', 'COORDINADOR ACADÉMICO Y DE CONVIVENCIA'],
  'ADMINISTRATIVO': ['SECRETARIO(A)', 'PAGADOR(A)', 'SECRETARIO(A) PAGADOR(A)', 'ARCHIVISTA', 'BIBLIOTECARIO(A) DIGITAL']
};
const situacionesPorCausa = {
  'Asuntos médicos': [
    'Cita médica general', 'Cita médica especializada', 'Exámenes de laboratorio',
    'Exámenes diagnósticos', 'Procedimiento médico ambulatorio', 'Tratamiento médico programado',
    'Terapia o rehabilitación', 'Control médico posterior', 'Atención médica de urgencia',
    'Acompañamiento a familiar a cita médica', 'Acompañamiento a familiar a procedimiento médico',
    'Otra situación médica'
  ],
  'Calamidad familiar': [
    'Grave afectación de la salud de un familiar', 'Daño grave en la vivienda familiar',
    'Desaparición o secuestro de un familiar', 'Accidente o emergencia grave de un familiar',
    'Otra calamidad familiar grave'
  ],
  'Asuntos judiciales': [
    'Comparecencia ante autoridad judicial', 'Declaración o testimonio judicial',
    'Diligencia ante Fiscalía o autoridad de investigación',
    'Audiencia de conciliación o mecanismo de solución de conflictos',
    'Notificación o diligencia procesal presencial', 'Otra situación judicial'
  ],
  'Diligencias ante autoridades públicas': [
    'Comparecencia ante autoridad administrativa', 'Diligencia ante organismo de control',
    'Trámite ante entidad pública', 'Actuación en procedimiento administrativo',
    'Otra diligencia ante autoridad pública'
  ],
  'Compensatorio': [
    'Descanso compensatorio por trabajo previamente autorizado',
    'Descanso compensatorio por actividades institucionales realizadas fuera de la jornada ordinaria',
    'Descanso compensatorio por participación en actividades institucionales especiales',
    'Descanso compensatorio por cumpleaños', 'Otro motivo de compensatorio'
  ],
  'Permiso sindical': ['Reunión o asamblea sindical'],
  'Otra causa justificada': ['Otra causa (describir en la justificación)']
};
const sedesDocentes = ['MANANTIAL', 'TOPACIO', 'NUEVA COLOMBIA', 'JORDÁN', 'SAN ANTONIO DE PADUA'];
const sedesInstitucionales = [...sedesDocentes, 'ADMINISTRATIVA/PRINCIPAL'];

function updateProfileFields() {
  const isTeacher = tipoPersonal.value === 'DOCENTE';
  const role = cargo.value;
  const isCoordinator = role.startsWith('COORDINADOR');
  const isRector = role === 'RECTOR';
  $('rectorAviso').classList.toggle('hidden', !isRector);
  $('destinatarioWrap').classList.toggle('hidden', !isRector);
  $('destinatario').required = isRector;
  planDocente.classList.toggle('hidden', !isTeacher);
  academicos.classList.toggle('hidden', !isTeacher);
  $('modalidadAtencion').required = isTeacher;
  $('nivel').required = isTeacher;
  $('jornada').required = isTeacher;
  const siteSelect = $('sede');
  const previous = [...siteSelect.selectedOptions].map(option => option.value);
  const allowedSites = sedesInstitucionales;
  siteSelect.innerHTML = '<option value="">Seleccione...</option>';
  allowedSites.forEach(site => siteSelect.appendChild(new Option(site, site)));
  [...siteSelect.options].forEach(option => { option.selected = previous.includes(option.value); });
  siteSelect.multiple = isCoordinator;
  siteSelect.size = isCoordinator ? allowedSites.length : 1;
  siteSelect.required = true;
  $('sedeHelp').textContent = isCoordinator ? 'Seleccione una o varias sedes institucionales.' : 'Seleccione la sede donde desempeña sus funciones. ADMINISTRATIVA/PRINCIPAL está disponible para todos los tipos de personal.';
  $('sedesSeleccionadas').textContent = isCoordinator ? 'Para elegir varias: mantenga presionada la tecla Ctrl y haga clic en cada sede (en Mac, ⌘ Command). En la lista verá las opciones simultáneamente; puede desplazarse si es necesario.' : ''; 
  updateAcademicFields();
}

function updateAcademicFields() {
  const level = $('nivel').value;
  const primary = level === 'PRIMARIA';
  const secondary = ['SECUNDARIA', 'MEDIA'].includes(level);
  $('gradoWrap').classList.toggle('hidden', !primary);
  $('grupoWrap').classList.toggle('hidden', !primary);
  $('grado').required = tipoPersonal.value === 'DOCENTE' && primary;
  $('grupo').required = tipoPersonal.value === 'DOCENTE' && primary;
  $('areaWrap').classList.toggle('hidden', !secondary);
  $('area').required = tipoPersonal.value === 'DOCENTE' && secondary;
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function lockRequestDateToToday() {
  const field = $('fechaSolicitud');
  const currentDay = today();
  field.min = currentDay;
  field.max = currentDay;
  field.value = currentDay;
}

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`;
}

function modalidad() {
  return document.querySelector('input[name="modalidad"]:checked')?.value || 'POR DÍAS';
}

function updateCargoOptions() {
  const tipo = tipoPersonal.value;
  cargo.innerHTML = '';
  if (!tipo) {
    cargo.disabled = true;
    cargo.required = true;
    cargo.appendChild(new Option('Seleccione primero el tipo de personal...', ''));
    return;
  }

  cargo.disabled = false;
  cargo.appendChild(new Option('Seleccione...', ''));
  for (const item of cargosPorTipo[tipo] || []) cargo.appendChild(new Option(item, item));
}

function updateMode() {
  const byDays = modalidad() === 'POR DÍAS';
  diasFields.classList.toggle('hidden', !byDays);
  horasFields.classList.toggle('hidden', byDays);

  $('fechaInicio').required = byDays;
  $('fechaFin').required = byDays;
  $('fechaHoras').required = !byDays;
  $('horaInicio').required = !byDays;
  $('horaFin').required = !byDays;
  updateDuration();
}

function updateDuration() {
  const legalNotice = $('duracionAviso');
  legalNotice.classList.add('hidden');
  legalNotice.textContent = '';
  if (modalidad() === 'POR DÍAS') {
    const start = $('fechaInicio').value;
    const end = $('fechaFin').value;
    if (!start || !end) {
      $('duration').textContent = 'Duración: —';
      return;
    }
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    const days = Math.floor((e - s) / 86400000) + 1;
    $('duration').textContent = days > 0 ? `Duración calendario: ${days} día(s)` : 'Duración: revise las fechas';
    if (days > 0 && ['DOCENTE', 'DIRECTIVO DOCENTE'].includes(tipoPersonal.value)) {
      let businessDays = 0;
      for (let d = new Date(`${start}T12:00:00`); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) businessDays++;
      }
      if (businessDays > 3) {
        legalNotice.textContent = `Atención: el rango incluye ${businessDays} días de lunes a viernes. Para docentes y directivos docentes sujetos al artículo 57 del Decreto Ley 1278 de 2002, revise el límite de tres días hábiles consecutivos al mes y el régimen aplicable. El cálculo no descuenta festivos y no constituye decisión jurídica automática.`;
        legalNotice.classList.remove('hidden');
      }
    }
    return;
  }

  const h1 = $('horaInicio').value;
  const h2 = $('horaFin').value;
  if (!h1 || !h2) {
    $('duration').textContent = 'Duración: —';
    return;
  }
  const [a, b] = h1.split(':').map(Number);
  const [c, d] = h2.split(':').map(Number);
  const mins = (c * 60 + d) - (a * 60 + b);
  $('duration').textContent = mins > 0
    ? `Duración: ${Math.floor(mins / 60)} h ${mins % 60} min`
    : 'Duración: revise las horas';
}

$('nombre').addEventListener('input', forceUppercaseName);
$('rector').addEventListener('input', forceUppercaseRector);
tipoPersonal.addEventListener('change', () => { updateCargoOptions(); updateProfileFields(); });
$('cargo').addEventListener('change', updateProfileFields);
$('nivel').addEventListener('change', updateAcademicFields);
function updateCauseSituations() {
  const situation = $('situacion');
  situation.innerHTML = '';
  situation.appendChild(new Option(causa.value ? 'Seleccione la situación...' : 'Seleccione primero la causa...', ''));
  (situacionesPorCausa[causa.value] || []).forEach(item => situation.appendChild(new Option(item, item)));
  const otraCausa = causa.value === 'Otra causa justificada';
  const otraSituacion = /^(Otra situación|Otra calamidad|Otra diligencia|Otro motivo|Otra causa)/i.test(situation.value);
  $('otraCausaAviso').classList.toggle('hidden', !otraCausa);
  $('situacionWrap').classList.toggle('hidden', otraCausa);
  situation.required = !otraCausa;
  situation.disabled = !causa.value || otraCausa;
  $('justificacionWrap').classList.toggle('hidden', otraCausa);
  $('justificacion').required = !otraCausa;
  $('observacionesWrap').classList.toggle('hidden', otraCausa);
  $('observaciones').required = false;
  if (otraCausa) {
    situation.value = '';
    $('justificacion').value = '';
    $('observaciones').value = '';
  }
  $('compensatorioAviso').classList.toggle('hidden', causa.value !== 'Compensatorio');
  $('figuraEspecialAviso').classList.toggle('hidden', !['Asuntos médicos'].includes(causa.value));
  updateDescriptionRequirement();
}
function updateDescriptionRequirement() {
  const selected = $('situacion').value;
  const isOther = /^(Otra situación|Otra calamidad|Otra diligencia|Otro motivo|Otra causa)/i.test(selected);
  const label = $('justificacionLabel');
  if (label) label.textContent = isOther ? 'Descripción obligatoria de la otra situación *' : 'Descripción de los hechos / justificación';
  $('justificacion').placeholder = isOther
    ? 'Describa la situación específica que no aparece en el desplegable.'
    : 'Describa de forma concreta la causa de la solicitud.';
  $('justificacion').required = causa.value !== 'Otra causa justificada';
}
$('situacion').addEventListener('change', updateDescriptionRequirement);
causa.addEventListener('change', updateCauseSituations);
$('modalidadAtencion').addEventListener('change', () => {
  const selected = [...$('modalidadAtencion').selectedOptions].map(option => option.value);
  $('detallePlan').required = selected.includes('Otra estrategia pedagógica');
});
modalidadInputs.forEach(input => input.addEventListener('change', updateMode));
['fechaInicio', 'fechaFin', 'fechaHoras', 'horaInicio', 'horaFin'].forEach(id => $(id).addEventListener('input', updateDuration));

supportBtn.addEventListener('click', async () => {
  try {
    const result = await window.solicitudPermiso.seleccionarSoporte();
    if (!result) return;
    const files = Array.isArray(result) ? result : [result];
    supportInfo.textContent = `Soportes seleccionados (${files.length} nuevos): ${files.map(f => f.name).join(' · ')}`;
    removeSupport.classList.remove('hidden');
    setMessage('Soporte(s) seleccionado(s) correctamente.', 'ok');
  } catch (error) {
    setMessage(error.message || 'No fue posible seleccionar el soporte.', 'error');
  }
});

removeSupport.addEventListener('click', async () => {
  try { await window.solicitudPermiso.quitarSoporte(); } catch (error) { setMessage(error.message || 'No fue posible quitar el soporte.', 'error'); return; }
  supportInfo.textContent = 'No se han seleccionado soportes.';
  removeSupport.classList.add('hidden');
  setMessage('');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');
  generateBtn.disabled = true;
  generateBtn.textContent = 'GENERANDO...';

  const byDays = modalidad() === 'POR DÍAS';
  const data = {
    rector: $('rector').value.trim().toLocaleUpperCase('es-CO'),
    tratamientoRector: $('tratamientoRector').value,
    cargoRectoria: $('cargoRectoria').value,
    destinatario: $('destinatario').value.trim(),
    nombre: $('nombre').value.trim().toLocaleUpperCase('es-CO'),
    documento: $('documento').value.trim(),
    tipoPersonal: tipoPersonal.value,
    cargo: cargo.value,
    sede: $('sede').multiple ? [...$('sede').selectedOptions].map(o => o.value).join(', ') : $('sede').value,
    modalidad: modalidad(),
    causa: causa.value,
    fechaSolicitud: $('fechaSolicitud').value,
    fechaInicio: byDays ? $('fechaInicio').value : $('fechaHoras').value,
    fechaFin: byDays ? $('fechaFin').value : $('fechaHoras').value,
    horaInicio: byDays ? '' : $('horaInicio').value,
    horaFin: byDays ? '' : $('horaFin').value,
    jornada: $('jornada').value,
    nivel: $('nivel').value,
    grado: $('grado').value,
    grupo: $('grupo').value.trim(),
    gradoGrupo: [$('grado').value, $('grupo').value.trim()].filter(Boolean).join(', grupo '),
    area: $('area').value.trim(),
    situacion: $('situacion').value,
    justificacion: $('justificacion').value.trim(),
    modalidadAtencion: [...$('modalidadAtencion').selectedOptions].map(option => option.value).join('; '),
    detallePlan: $('detallePlan').value.trim(),
    revisionCoordinacion: $('revisionCoordinacion').value.trim(),
    observaciones: $('observaciones').value.trim()
  };

  try {
    if (data.tipoPersonal === 'DOCENTE') {
      if (!data.modalidadAtencion) throw new Error('Seleccione la modalidad del plan de atención a estudiantes.');
      if (!data.detallePlan) throw new Error('Describa las actividades, grupos, recursos e instrucciones del plan de atención.');
      if (data.modalidadAtencion.split('; ').includes('Otra estrategia pedagógica') && !data.detallePlan) throw new Error('Describa la otra estrategia pedagógica.');
      if (data.nivel === 'PRIMARIA' && (!data.grado || !data.grupo)) throw new Error('Seleccione el grado de 0° a 5° y digite el grupo a cargo.');
      if (['SECUNDARIA', 'MEDIA'].includes(data.nivel) && !data.area) throw new Error('Indique el área o asignatura a cargo.');
    }
    if (data.modalidad === 'POR DÍAS' && data.fechaFin < data.fechaInicio) throw new Error('La fecha de finalización no puede ser anterior a la fecha de inicio.');
    if (data.cargo === 'RECTOR' && !data.destinatario) throw new Error('Indique la autoridad jerárquica competente a quien se dirige la solicitud de Rectoría.');
    if (data.modalidad === 'POR HORAS' && data.horaFin <= data.horaInicio) throw new Error('La hora de finalización debe ser posterior a la hora de inicio.');
    const result = await window.solicitudPermiso.generarPdf(data);
    setMessage(`PDF guardado correctamente en: ${result.outputPath} · ${result.pages} página(s).`, 'ok');
  } catch (error) {
    setMessage(error.message || 'No fue posible generar el PDF.', 'error');
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'GENERAR SOLICITUD PDF';
  }
});

$('clear').addEventListener('click', async () => {
  try { await window.solicitudPermiso.quitarSoporte(); } catch (error) { setMessage(error.message || 'No fue posible limpiar el soporte.', 'error'); return; }
  form.reset();
  forceUppercaseName();
  forceUppercaseRector();
  lockRequestDateToToday();
  $('destinatario').value = '';
  supportInfo.textContent = 'No se han seleccionado soportes.';
  removeSupport.classList.add('hidden');
  setMessage('');
  updateCargoOptions();
  updateMode();
  updateProfileFields();
  $('otraCausaAviso').classList.add('hidden');
  $('grado').value = ''; $('grupo').value = '';
  $('compensatorioAviso').classList.add('hidden');
  $('figuraEspecialAviso').classList.add('hidden');
  updateCauseSituations();
  clearDraft();
});

$('fechaSolicitud').addEventListener('change', () => {
  const selected = $('fechaSolicitud').value;
  const currentDay = today();
  if (selected !== currentDay) {
    lockRequestDateToToday();
    setMessage('La fecha de solicitud corresponde únicamente al día en que se diligencia el formulario.', 'error');
    return;
  }
  $('fechaSolicitud').min = currentDay;
  $('fechaSolicitud').max = currentDay;
});
$('fechaSolicitud').addEventListener('focus', lockRequestDateToToday);

lockRequestDateToToday();
forceUppercaseName();
forceUppercaseRector();
updateCargoOptions();
updateCauseSituations();
updateMode();
updateProfileFields();
restoreDraft();
