'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_SUPPORT_BYTES = 25 * 1024 * 1024;
const ALLOWED_SUPPORT_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const MAX_SUPPORT_PDF_PAGES = 100;
const MAX_SUPPORT_IMAGE_PIXELS = 40_000_000;
const MAX_SUPPORT_IMAGE_DIMENSION = 12_000;

function validatePdfPageCount(pageCount) {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error('El soporte PDF no contiene páginas válidas.');
  }
  if (pageCount > MAX_SUPPORT_PDF_PAGES) {
    throw new Error(`El soporte PDF no puede superar ${MAX_SUPPORT_PDF_PAGES} páginas.`);
  }
  return pageCount;
}

function readImageDimensions(buffer, ext) {
  if (!Buffer.isBuffer(buffer)) throw new Error('No fue posible leer la imagen de soporte.');

  if (ext === '.png') {
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(pngSignature) || buffer.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error('El archivo PNG está dañado o no tiene una cabecera válida.');
    }
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      throw new Error('El archivo JPEG está dañado o no tiene una cabecera válida.');
    }
    const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
      if (offset >= buffer.length) break;
      const marker = buffer[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > buffer.length) break;
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
      if (sofMarkers.has(marker)) {
        if (segmentLength < 7) break;
        return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
      }
      offset += segmentLength;
    }
    throw new Error('No se pudieron determinar las dimensiones de la imagen JPEG.');
  }

  throw new Error('La imagen debe ser JPG, JPEG o PNG.');
}

function validateImageDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Las dimensiones de la imagen de soporte no son válidas.');
  }
  if (width > MAX_SUPPORT_IMAGE_DIMENSION || height > MAX_SUPPORT_IMAGE_DIMENSION ||
      width * height > MAX_SUPPORT_IMAGE_PIXELS) {
    throw new Error('La imagen de soporte tiene dimensiones demasiado grandes. Redúzcala antes de adjuntarla.');
  }
  return { width, height, pixels: width * height };
}

function validateSupportFile(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('Seleccione un archivo de soporte válido.');
  }

  const normalizedPath = path.resolve(filePath);
  const ext = path.extname(normalizedPath).toLowerCase();
  if (!ALLOWED_SUPPORT_EXTENSIONS.has(ext)) {
    throw new Error('El soporte debe ser PDF, JPG, JPEG o PNG.');
  }

  let stat;
  try {
    stat = fs.statSync(normalizedPath);
  } catch {
    throw new Error('El archivo de soporte no existe o no se puede leer.');
  }

  if (!stat.isFile()) throw new Error('El soporte seleccionado no es un archivo.');
  if (stat.size > MAX_SUPPORT_BYTES) throw new Error('El soporte no puede superar 25 MB.');

  return { path: normalizedPath, ext, size: stat.size };
}

module.exports = {
  validateSupportFile,
  validatePdfPageCount,
  validateImageDimensions,
  readImageDimensions,
  MAX_SUPPORT_BYTES,
  MAX_SUPPORT_PDF_PAGES,
  MAX_SUPPORT_IMAGE_PIXELS,
  MAX_SUPPORT_IMAGE_DIMENSION,
  ALLOWED_SUPPORT_EXTENSIONS
};
