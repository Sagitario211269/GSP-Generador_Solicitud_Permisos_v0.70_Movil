'use strict';

const ALLOWED_PERSONNEL = new Set(['DOCENTE', 'DIRECTIVO DOCENTE', 'ADMINISTRATIVO']);
const ALLOWED_SEDES = new Set(['ADMINISTRATIVA/PRINCIPAL', 'JORDÁN', 'MANANTIAL', 'NUEVA COLOMBIA', 'SAN ANTONIO DE PADUA', 'TOPACIO']);
const ALLOWED_CAUSES = new Set(['Asuntos médicos', 'Calamidad familiar', 'Asuntos judiciales', 'Diligencias ante autoridades públicas', 'Compensatorio', 'Permiso sindical', 'Otra causa justificada']);
const CARGOS_POR_TIPO = {
  'DOCENTE': new Set(['DOCENTE DE AULA', 'DOCENTE ORIENTADOR', 'DOCENTE DE APOYO', 'DOCENTE PTA']),
  'DIRECTIVO DOCENTE': new Set(['RECTOR', 'COORDINADOR ACADÉMICO', 'COORDINADOR DE CONVIVENCIA', 'COORDINADOR ACADÉMICO Y DE CONVIVENCIA']),
  'ADMINISTRATIVO': new Set(['SECRETARIO(A)', 'PAGADOR(A)', 'SECRETARIO(A) PAGADOR(A)', 'ARCHIVISTA', 'BIBLIOTECARIO(A) DIGITAL'])
};


function clean(value) {
  return String(value ?? '').trim();
}


function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}


function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Los datos de la solicitud no son válidos.');
  const required = [
    ['rector', 'Nombre del rector(a)'],
    ['tratamientoRector', 'Tratamiento del rector(a)'],
    ['cargoRectoria', 'Cargo de Rectoría'],
    ['nombre', 'Nombre completo'],
    ['documento', 'Número de documento'],
    ['tipoPersonal', 'Tipo de personal'],
    ['cargo', 'Cargo'],
    ['sede', 'Sede'],
    ['modalidad', 'Modalidad del permiso'],
    ['causa', 'Causa del permiso'],
    ['fechaSolicitud', 'Fecha de solicitud']
  ];

  for (const [key, label] of required) {
    if (!clean(data[key])) throw new Error(`Complete el campo: ${label}.`);
  }

  if (!/^[0-9A-Za-zÁÉÍÓÚáéíóúÑñ .-]{4,30}$/.test(clean(data.documento))) {
    throw new Error('El número de documento contiene caracteres no permitidos.');
  }

  if (!new Set(['Señor', 'Señora', 'Licenciado', 'Licenciada', 'Especialista', 'Magíster', 'Doctor', 'Doctora']).has(clean(data.tratamientoRector))) throw new Error('Seleccione un tratamiento válido para Rectoría.');
  if (!new Set(['RECTOR', 'RECTORA']).has(clean(data.cargoRectoria))) throw new Error('Seleccione Rector o Rectora como cargo de Rectoría.');

  if (data.cargo === 'RECTOR' && !clean(data.destinatario)) throw new Error('Indique la autoridad jerárquica competente a quien se dirige la solicitud de Rectoría.');

  const fieldLimits = {
    rector: 100,
    tratamientoRector: 30,
    cargoRectoria: 20,
    destinatario: 140,
    nombre: 100,
    documento: 30,
    tipoPersonal: 50,
    cargo: 100,
    sede: 100,
    causa: 150,
    observaciones: 500
  };
  for (const [key, limit] of Object.entries(fieldLimits)) {
    if (clean(data[key]).length > limit) {
      throw new Error(`El campo ${key} no puede superar ${limit} caracteres.`);
    }
  }

  if (!isValidISODate(data.fechaSolicitud)) throw new Error('La fecha de solicitud no es válida.');

  if (!ALLOWED_PERSONNEL.has(data.tipoPersonal)) {
    throw new Error('Seleccione un tipo de personal válido.');
  }
  const selectedSedes = clean(data.sede).split(',').map(value => value.trim()).filter(Boolean);
  if (!selectedSedes.length || selectedSedes.some(value => !ALLOWED_SEDES.has(value))) {
    throw new Error('Seleccione una o varias sedes institucionales válidas.');
  }
  if (data.tipoPersonal === 'DOCENTE' && selectedSedes.length !== 1) throw new Error('El personal docente debe seleccionar exactamente una sede.');
  if (data.cargo && data.cargo.startsWith('COORDINADOR') && selectedSedes.length < 1) throw new Error('Seleccione al menos una sede para coordinación.');
  if (!ALLOWED_CAUSES.has(data.causa)) {
    throw new Error('Seleccione una causa de permiso válida.');
  }
  if (!clean(data.situacion)) throw new Error('Seleccione la situación específica asociada a la causa.');
  if (/^(Otra situación|Otra calamidad|Otra diligencia|Otro motivo|Otra causa)/i.test(clean(data.situacion)) && !clean(data.justificacion)) {
    throw new Error('Describa la situación seleccionada como «Otra situación…».');
  }
  if (!CARGOS_POR_TIPO[data.tipoPersonal]?.has(data.cargo)) {
    throw new Error('El cargo seleccionado no corresponde al tipo de personal.');
  }
  if (!['POR DÍAS', 'POR HORAS'].includes(data.modalidad)) {
    throw new Error('Seleccione una modalidad de permiso válida.');
  }

  if (data.modalidad === 'POR DÍAS') {
    if (!clean(data.fechaInicio) || !clean(data.fechaFin)) {
      throw new Error('Complete la fecha de inicio y la fecha de finalización.');
    }
    if (!isValidISODate(data.fechaInicio) || !isValidISODate(data.fechaFin)) throw new Error('Las fechas del permiso no son válidas.');
    if (data.fechaFin < data.fechaInicio) {
      throw new Error('La fecha de finalización no puede ser anterior a la fecha de inicio.');
    }
  } else {
    if (!clean(data.fechaInicio)) throw new Error('Seleccione la fecha del permiso.');
    if (!isValidISODate(data.fechaInicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.horaInicio || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.horaFin || '')) {
      throw new Error('La fecha o las horas del permiso no son válidas.');
    }
    if (!clean(data.horaInicio) || !clean(data.horaFin)) {
      throw new Error('Complete la hora de inicio y la hora de finalización.');
    }
    if (data.horaFin <= data.horaInicio) {
      throw new Error('La hora de finalización debe ser posterior a la hora de inicio.');
    }
  }
}


module.exports = { validate, isValidISODate };
