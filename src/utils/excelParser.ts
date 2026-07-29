import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnMapping, EstadoPendiente, PendienteItem, Prioridad, Redundancia } from '../types';

export const TARGET_COLUMNS = [
  { key: 'lineaCrea', label: 'Línea que crea el pendiente', keywords: ['crea', 'linea_crea', 'linea que crea', 'creador', 'generador'] },
  { key: 'fuente', label: 'Fuente', keywords: ['fuente', 'origen', 'bitacora', 'pendientes-'] },
  { key: 'procesoSig', label: 'Proceso SIG / Línea Misional', keywords: ['misional', 'proceso sig', 'proceso', 'sig'] },
  { key: 'lineaEjecutora', label: 'Línea Ejecutora / Subprocesos', keywords: ['ejecutora', 'sub procesos', 'subproceso', 'para linea'] },
  { key: 'topico', label: 'Tópico / Asunto', keywords: ['topico', 'tópico', 'asunto', 'tema', 'categoria'] },
  { key: 'tarea', label: 'Tarea / Nombre del Pendiente', keywords: ['tarea', 'actividad', 'pendiente', 'asunto'] },
  { key: 'descripcionGeneral', label: 'Descripción General', keywords: ['descripcion general', 'descripción general', 'detalle general', 'alcance', 'descripcion de la actividad', 'descripción'] },
  { key: 'estado', label: 'Estado (Abierto, Pendiente, En Proceso, Cerrado)', keywords: ['estado', 'status', 'situacion', 'condicion'] },
  { key: 'redundancia', label: 'Redundancia (Único, Duplicado, Bitácora)', keywords: ['redundancia', 'duplicado', 'unico', 'único'] },
  { key: 'responsable', label: 'Responsable de Ejecución', keywords: ['responsable', 'ejecucion', 'reponsable', 'asignado', 'encargado', 'personal'] },
  { key: 'personalApoyo', label: 'Personal de Asistentes / Apoyo', keywords: ['apoyo', 'asistente', 'asistentes', 'colaboradores'] },
  { key: 'acciones', label: 'Acciones / Detalle de la actividad', keywords: ['acciones', 'accion', 'acciones_realizadas', 'acciones / tarea', 'acciones/tarea', 'acciones y tarea', 'tarea / accion', 'detalle'] },
  { key: 'observaciones', label: 'Observaciones / Historial', keywords: ['observaciones', 'observacion', 'bitacora', 'seguimiento', 'notas', 'anotaciones', 'realizado'] },
  { key: 'proyeccion', label: 'Proyección / Resultado', keywords: ['proyeccion', 'proyección', 'resultado', 'meta'] },
  { key: 'entregable', label: 'Entregable', keywords: ['entregable', 'producto', 'documento'] },
  { key: 'insumo', label: 'Insumo', keywords: ['insumo', 'base', 'requerimiento'] },
  { key: 'prioridad', label: 'Priorización', keywords: ['prioridad', 'priorización', 'priorizacion', 'urgencia'] },
  { key: 'temporalidad', label: 'Temporalidad (Trimestre)', keywords: ['temporalidad', 'trimestre', 'periodo', 'cuatrimestre'] },
  { key: 'mesFinalizacion', label: 'Mes Finalización', keywords: ['mes', 'mes finalización', 'mes finalizacion'] },
  { key: 'fechaEstimada', label: 'Fecha Estimada de Entrega', keywords: ['fecha', 'entrega', 'limite', 'plazo', 'vencimiento'] },
  { key: 'normaProcedimiento', label: 'Norma / Procedimiento', keywords: ['norma', 'procedimiento', 'reglamento', 'acuerdo'] }
];

export function autoDetectMapping(uploadedHeaders: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  uploadedHeaders.forEach(header => {
    const cleanHeader = header.toLowerCase().trim();
    for (const target of TARGET_COLUMNS) {
      if (mapping[target.key as keyof ColumnMapping]) continue;

      const isMatch = target.keywords.some(kw => cleanHeader.includes(kw));
      if (isMatch) {
        mapping[target.key as keyof ColumnMapping] = header;
        break;
      }
    }
  });

  return mapping;
}

export function parseFileContent(file: File): Promise<{ headers: string[]; rawRows: any[] }> {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({ headers, rawRows: results.data });
        },
        error: (error) => reject(error)
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
          
          let headers: string[] = [];
          if (rawRows.length > 0) {
            headers = Object.keys(rawRows[0]);
          }

          resolve({ headers, rawRows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

function normalizeEstado(val: string): EstadoPendiente {
  if (!val) return 'PENDIENTE';
  const clean = val.toUpperCase().trim();
  if (clean.includes('CERRAD') || clean.includes('FINALIZAD') || clean.includes('COMPLETAD') || clean.includes('LISTO')) return 'CERRADO';
  if (clean.includes('PROCESO') || clean.includes('EN PROGRES')) return 'EN_PROCESO';
  if (clean.includes('ABIERTO') || clean.includes('INICIAD')) return 'ABIERTO';
  return 'PENDIENTE';
}

function normalizePrioridad(val: string): Prioridad {
  if (!val) return 'MEDIA';
  const clean = val.toUpperCase().trim();
  if (clean.includes('ALT') || clean.includes('CRITIC') || clean.includes('URGENT')) return 'ALTA';
  if (clean.includes('BAJ')) return 'BAJA';
  if (clean.includes('TRANSVERSAL')) return 'TRANSVERSAL';
  return 'MEDIA';
}

function normalizeRedundancia(val: string): Redundancia {
  if (!val) return 'UNICO';
  const clean = val.toUpperCase().trim();
  if (clean.includes('DUPLICAD')) return 'DUPLICADO';
  if (clean.includes('BITACORA')) return 'BITACORA';
  return 'UNICO';
}

export function convertRowsToPendientes(rawRows: any[], mapping: ColumnMapping): PendienteItem[] {
  const now = new Date().toISOString();

  return rawRows.map((row, idx) => {
    const getValue = (key: keyof ColumnMapping): string => {
      const headerName = mapping[key];
      if (!headerName || !row[headerName]) return '';
      return String(row[headerName]).trim();
    };

    const tarea = getValue('tarea') || `Pendiente importado #${idx + 1}`;
    const estadoRaw = getValue('estado');
    const prioridadRaw = getValue('prioridad');
    const redundanciaRaw = getValue('redundancia');
    const accionesVal = getValue('acciones');
    const descGeneralVal = getValue('descripcionGeneral');
    const finalDesc = descGeneralVal || accionesVal || '';

    return {
      id: `IMP-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
      lineaCrea: getValue('lineaCrea') || 'Carga Externa',
      fuente: getValue('fuente') || 'Archivo Subido',
      procesoSig: getValue('procesoSig') || 'GENERAL',
      lineaEjecutora: getValue('lineaEjecutora') || 'Línea de Gestión',
      topico: getValue('topico') || 'ASUNTO GENERAL',
      tarea: tarea,
      descripcionGeneral: finalDesc,
      estado: normalizeEstado(estadoRaw),
      redundancia: normalizeRedundancia(redundanciaRaw),
      responsable: getValue('responsable') || 'Por Asignar',
      personalApoyo: getValue('personalApoyo') || '',
      acciones: accionesVal || finalDesc,
      proyeccion: getValue('proyeccion') || '',
      entregable: getValue('entregable') || '',
      insumo: getValue('insumo') || '',
      prioridad: normalizePrioridad(prioridadRaw),
      temporalidad: getValue('temporalidad') || 'PRIMER TRIMESTRE',
      mesFinalizacion: getValue('mesFinalizacion') || 'PENDIENTE',
      fechaEstimada: getValue('fechaEstimada') || '2026-03-31',
      normaProcedimiento: getValue('normaProcedimiento') || 'Gestión Vicerrectoría Académica',
      creadoPor: 'Importación Masiva',
      fechaCreacion: now,
      ultimaActualizacion: now,
      observaciones: getValue('observaciones') || ''
    };
  });
}
