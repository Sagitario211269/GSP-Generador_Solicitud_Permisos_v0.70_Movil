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
const signatureBtn = $('signatureBtn');
const signatureInfo = $('signatureInfo');
const removeSignature = $('removeSignature');
const dateFieldIds = ['fechaDia1','fechaDia2','fechaDia3'];



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
  const preschool = level === 'PREESCOLAR';
  const primary = level === 'PRIMARIA';
  const secondary = ['SECUNDARIA', 'MEDIA'].includes(level);
  $('gradoWrap').classList.toggle('hidden', !(preschool || primary));
  $('grupoWrap').classList.toggle('hidden', !(preschool || primary));
  $('grado').required = tipoPersonal.value === 'DOCENTE' && (preschool || primary);
  $('grupo').required = tipoPersonal.value === 'DOCENTE' && (preschool || primary);
  const grade=$('grado'), previous=grade.value;
  grade.innerHTML = '<option value="">Seleccione grado...</option>' + (preschool ? '<option>PREJARDÍN</option><option>JARDÍN</option><option>TRANSICIÓN</option>' : '<option value="1°">1°</option><option value="2°">2°</option><option value="3°">3°</option><option value="4°">4°</option><option value="5°">5°</option>');
  if ([...grade.options].some(o=>o.value===previous)) grade.value=previous;
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
  const byDays=modalidad()==='POR DÍAS'; diasFields.classList.toggle('hidden',!byDays); horasFields.classList.toggle('hidden',byDays);
  dateFieldIds.forEach((id,i)=>{$(id).required=byDays&&i===0;}); $('fechaHoras').required=!byDays; $('horaInicio').required=!byDays; $('horaFin').required=!byDays; updateDuration();
}
function getSelectedBusinessDates(){return dateFieldIds.map(id=>$(id).value).filter(Boolean);}
function formatDateForUi(v){const [y,m,d]=v.split('-');return `${d}/${m}/${y}`;}
function isWeekendDate(v){const d=new Date(`${v}T00:00:00Z`).getUTCDay();return d===0||d===6;}
function easterSunday(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;return new Date(Date.UTC(y,month-1,day));}
function isoDate(d){return d.toISOString().slice(0,10);}
function mondayOnOrAfter(d){const x=new Date(d),day=x.getUTCDay();if(day!==1)x.setUTCDate(x.getUTCDate()+((8-day)%7));return x;}
function isColombianHoliday(v){const y=Number(v.slice(0,4)),fixed=[[1,1,false],[1,6,true],[3,19,true],[5,1,false],[6,29,true],[7,20,false],[8,7,false],[8,15,true],[10,12,true],[11,1,true],[11,11,true],[12,8,false],[12,25,false]],h=new Set();fixed.forEach(([m,d,move])=>{const x=new Date(Date.UTC(y,m-1,d));h.add(isoDate(move?mondayOnOrAfter(x):x));});const e=easterSunday(y);[-3,-2].forEach(n=>{const x=new Date(e);x.setUTCDate(x.getUTCDate()+n);h.add(isoDate(x));});[39,60,68].forEach(n=>{const x=new Date(e);x.setUTCDate(x.getUTCDate()+n);h.add(isoDate(mondayOnOrAfter(x)));});return h.has(v);}
function isColombianBusinessDay(v){return !isWeekendDate(v)&&!isColombianHoliday(v);}
function updateDuration(){const notice=$('duracionAviso');notice.classList.add('hidden');notice.textContent='';if(modalidad()==='POR DÍAS'){const dates=getSelectedBusinessDates(),unique=[...new Set(dates)].sort(),invalid=unique.filter(d=>!isColombianBusinessDay(d));$('fechasSeleccionadas').textContent=unique.length?`Fechas seleccionadas: ${unique.map(formatDateForUi).join(' · ')}`:'';$('duration').textContent=unique.length?`Duración: ${unique.length} de 3 días hábiles`:'Duración: —';if(dates.length!==unique.length||invalid.length||unique.length>3){notice.textContent=dates.length!==unique.length?'No repita una misma fecha.':invalid.length?`${invalid.map(formatDateForUi).join(', ')}: fecha no hábil. No se admiten fines de semana ni festivos nacionales.`:'La solicitud supera el máximo permitido de tres días hábiles.';notice.classList.remove('hidden');}return;}const a=$('horaInicio').value,b=$('horaFin').value;if(!a||!b){$('duration').textContent='Duración: —';return;}const [h1,m1]=a.split(':').map(Number),[h2,m2]=b.split(':').map(Number),mins=h2*60+m2-h1*60-m1;$('duration').textContent=mins>0?`Duración: ${Math.floor(mins/60)} h ${mins%60} min`:'Duración: revise las horas';}

signatureBtn.addEventListener('click', async () => { try { const result=await window.solicitudPermiso.seleccionarFirma(); if(!result)return; signatureInfo.textContent=`Firma seleccionada: ${result.name}`; removeSignature.classList.remove('hidden'); setMessage('Firma digital importada y recortada automáticamente.', 'ok'); } catch(e){setMessage(e.message||'No fue posible importar la firma.','error');} });
removeSignature.addEventListener('click',()=>{window.solicitudPermiso.quitarFirma();signatureInfo.textContent='No se ha importado una firma.';removeSignature.classList.add('hidden');setMessage('');});

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
[...dateFieldIds,'fechaHoras','horaInicio','horaFin'].forEach(id=>$(id).addEventListener('input',updateDuration));

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
    fechasPermiso: byDays ? getSelectedBusinessDates() : [$('fechaHoras').value],
    fechaInicio: byDays ? getSelectedBusinessDates().sort()[0] || '' : $('fechaHoras').value,
    fechaFin: byDays ? getSelectedBusinessDates().sort().slice(-1)[0] || '' : $('fechaHoras').value,
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
      if (['PREESCOLAR','PRIMARIA'].includes(data.nivel) && (!data.grado || !data.grupo)) throw new Error('Seleccione el grado correspondiente y digite el grupo a cargo.');
      if (['SECUNDARIA', 'MEDIA'].includes(data.nivel) && !data.area) throw new Error('Indique el área o asignatura a cargo.');
    }
    if(data.modalidad==='POR DÍAS'){const dates=data.fechasPermiso;if(!dates.length)throw new Error('Seleccione al menos un día de permiso.');if(dates.length>3)throw new Error('No puede solicitar más de tres días hábiles, sean consecutivos o no.');if(new Set(dates).size!==dates.length)throw new Error('No repita una misma fecha en la solicitud.');for(const d of dates){if(d<today())throw new Error('No se puede solicitar un permiso para una fecha que ya pasó.');if(!isColombianBusinessDay(d))throw new Error(`${formatDateForUi(d)} no es un día hábil.`);}}else{if(data.fechaInicio<today())throw new Error('No se puede solicitar un permiso para una fecha que ya pasó.');if(!isColombianBusinessDay(data.fechaInicio))throw new Error('No se pueden solicitar permisos por horas en fines de semana ni festivos nacionales.');}
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
  window.solicitudPermiso.quitarFirma(); signatureInfo.textContent='No se ha importado una firma.'; removeSignature.classList.add('hidden');
  $('destinatario').value = '';
  supportInfo.textContent = 'No se han seleccionado soportes.';
  removeSupport.classList.add('hidden');
  setMessage('');
  updateCargoOptions();
  updateMode();
  updateProfileFields();
  $('otraCausaAviso').classList.add('hidden');
  $('grado').value = ''; $('grupo').value = ''; dateFieldIds.forEach(id=>$(id).value='');
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
$('fechaSolicitud').addEventListener('change',()=>{lockRequestDateToToday();window.alert('La fecha de solicitud corresponde únicamente al día en que se diligencia el formulario.');});
[...dateFieldIds,'fechaHoras'].forEach(id=>{ $(id).addEventListener('change',()=>{const field=$(id),v=field.value;if(v&&v<today()){field.value='';updateDuration();window.alert('No se puede solicitar un permiso para una fecha que ya pasó. Seleccione la fecha actual o una posterior.');return;}if(v&&!isColombianBusinessDay(v)){field.value='';updateDuration();window.alert(`La fecha ${formatDateForUi(v)} no está habilitada porque corresponde a ${isWeekendDate(v)?'sábado o domingo':'festivo nacional'}. Seleccione un día hábil.`);return;}updateDuration();});});
lockRequestDateToToday(); [...dateFieldIds,'fechaHoras'].forEach(id=>$(id).min=today());
forceUppercaseName();
forceUppercaseRector();
updateCargoOptions();
updateCauseSituations();
updateMode();
updateProfileFields();
restoreDraft();
