'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, isValidISODate } = require('../src/validation');

function validDaysRequest(overrides = {}) {
  return {
    rector: 'RECTORA DE PRUEBA',
    tratamientoRector: 'Doctora',
    cargoRectoria: 'RECTORA',
    nombre: 'PERSONA DE PRUEBA',
    documento: '12345678',
    tipoPersonal: 'DOCENTE',
    cargo: 'DOCENTE DE AULA',
    sede: 'MANANTIAL',
    modalidad: 'POR DÍAS',
    causa: 'Asuntos médicos',
    situacion: 'Cita médica',
    fechaSolicitud: '2026-10-27',
    fechaInicio: '2026-11-02',
    fechaFin: '2026-11-03',
    observaciones: '',
    ...overrides
  };
}

test('acepta fechas ISO reales y rechaza fechas imposibles', () => {
  assert.equal(isValidISODate('2024-02-29'), true);
  assert.equal(isValidISODate('2026-02-29'), false);
  assert.equal(isValidISODate('2026-02-31'), false);
  assert.equal(isValidISODate('27/10/2026'), false);
});

test('acepta una solicitud válida por días', () => {
  assert.doesNotThrow(() => validate(validDaysRequest()));
});

test('rechaza campos obligatorios vacíos y documento inválido', () => {
  assert.throws(() => validate(validDaysRequest({ nombre: ' ' })), /Complete el campo/);
  assert.throws(() => validate(validDaysRequest({ documento: '12/34' })), /caracteres no permitidos/);
});

test('rechaza fecha final anterior a fecha inicial', () => {
  assert.throws(() => validate(validDaysRequest({ fechaInicio: '2026-11-04', fechaFin: '2026-11-03' })), /no puede ser anterior/);
});

test('rechaza cargo incompatible con tipo de personal', () => {
  assert.throws(() => validate(validDaysRequest({ tipoPersonal: 'DOCENTE', cargo: 'RECTOR(A)' })), /no corresponde/);
});

test('acepta permiso por horas con intervalo válido', () => {
  assert.doesNotThrow(() => validate(validDaysRequest({
    modalidad: 'POR HORAS', fechaInicio: '2026-11-02', fechaFin: '2026-11-02', horaInicio: '08:00', horaFin: '09:30'
  })));
});

test('rechaza permiso por horas con intervalo invertido o formato inválido', () => {
  assert.throws(() => validate(validDaysRequest({ modalidad: 'POR HORAS', fechaInicio: '2026-11-02', horaInicio: '10:00', horaFin: '09:00' })), /posterior/);
  assert.throws(() => validate(validDaysRequest({ modalidad: 'POR HORAS', fechaInicio: '2026-11-02', horaInicio: '25:00', horaFin: '26:00' })), /no son válidas/);
});

test('rechaza observaciones que superan el límite', () => {
  assert.throws(() => validate(validDaysRequest({ observaciones: 'x'.repeat(501) })), /no puede superar 500/);
});


test('rechaza estructuras de datos que no sean objetos de solicitud', () => {
  assert.throws(() => validate(null), /no son válidos/);
  assert.throws(() => validate([]), /no son válidos/);
});

test('rechaza sede y causa fuera del catálogo institucional', () => {
  assert.throws(() => validate(validDaysRequest({ sede: 'SEDE INVENTADA' })), /sedes institucionales válidas/);
  assert.throws(() => validate(validDaysRequest({ causa: 'Causa inventada' })), /causa de permiso válida/);
});

test('rechaza fechas de solicitud imposibles y campos que exceden el límite', () => {
  assert.throws(() => validate(validDaysRequest({ fechaSolicitud: '2026-02-31' })), /fecha de solicitud no es válida/);
  assert.throws(() => validate(validDaysRequest({ nombre: 'N'.repeat(101) })), /nombre no puede superar 100/);
});


test('exige destinatario jerárquico para solicitudes de Rectoría', () => {
  const request = validDaysRequest({ tipoPersonal: 'DIRECTIVO DOCENTE', cargo: 'RECTOR', destinatario: '' });
  assert.throws(() => validate(request), /autoridad jerárquica competente/);
  assert.doesNotThrow(() => validate({ ...request, destinatario: 'SECRETARÍA DE EDUCACIÓN MUNICIPAL' }));
});

test('la sede ADMINISTRATIVA/PRINCIPAL está disponible para todos los tipos de personal', () => {
  assert.doesNotThrow(() => validate(validDaysRequest({ tipoPersonal: 'DOCENTE', cargo: 'DOCENTE DE AULA', sede: 'ADMINISTRATIVA/PRINCIPAL' })));
  assert.doesNotThrow(() => validate(validDaysRequest({ tipoPersonal: 'ADMINISTRATIVO', cargo: 'SECRETARIO(A)', sede: 'ADMINISTRATIVA/PRINCIPAL' })));
  assert.doesNotThrow(() => validate(validDaysRequest({ tipoPersonal: 'DIRECTIVO DOCENTE', cargo: 'COORDINADOR ACADÉMICO', sede: 'MANANTIAL, ADMINISTRATIVA/PRINCIPAL' })));
});

test('exige fecha y horas válidas para permisos por horas', () => {
  assert.throws(() => validate(validDaysRequest({ modalidad: 'POR HORAS', fechaInicio: '2026-11-02', horaInicio: '', horaFin: '09:00' })), /no son válidas/);
  assert.throws(() => validate(validDaysRequest({ modalidad: 'POR HORAS', fechaInicio: '2026-11-02', horaInicio: '08:00', horaFin: '08:00' })), /posterior/);
});


test('acepta el permiso sindical con reunión o asamblea sindical', () => {
  assert.doesNotThrow(() => validate(validDaysRequest({ causa: 'Permiso sindical', situacion: 'Reunión o asamblea sindical' })));
});

test('exige describir las situaciones seleccionadas como otra situación', () => {
  assert.throws(() => validate(validDaysRequest({ situacion: 'Otra situación médica', justificacion: '' })), /Describa la situación/);
  assert.doesNotThrow(() => validate(validDaysRequest({ situacion: 'Otra situación médica', justificacion: 'Situación de prueba' })));
});

test('no reconoce la causa eliminada situación familiar urgente', () => {
  assert.throws(() => validate(validDaysRequest({ causa: 'Situación familiar urgente' })), /causa de permiso válida/);
});
