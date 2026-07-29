import * as XLSX from 'xlsx';
import { PendienteItem } from '../types';

export function exportToExcel(pendientes: PendienteItem[], filename = 'Pendientes_UPTC_Vicerrectoria_Academica.xlsx') {
  const exportData = pendientes.map((p) => ({
    'ID': p.id,
    'LÍNEA QUE CREA EL PENDIENTE': p.lineaCrea,
    'FUENTE': p.fuente,
    'PROCESO SIG / LÍNEA MISIONAL': p.procesoSig,
    'LÍNEA EJECUTORA / SUBPROCESOS': p.lineaEjecutora,
    'TÓPICO': p.topico,
    'TAREA / ACCIÓN': p.tarea,
    'DESCRIPCIÓN GENERAL': p.descripcionGeneral || '',
    'ESTADO': p.estado,
    'REDUNDANCIA': p.redundancia,
    'RESPONSABLE EJECUCIÓN': p.responsable,
    'PERSONAL ASISTENTES / APOYO': p.personalApoyo || '',
    'ACCIONES / DETALLE': p.acciones || '',
    'PROYECCIÓN': p.proyeccion || '',
    'ENTREGABLE': p.entregable || '',
    'INSUMO': p.insumo || '',
    'PRIORIZACIÓN': p.prioridad,
    'TEMPORALIDAD (TRIMESTRE)': p.temporalidad,
    'MES FINALIZACIÓN': p.mesFinalizacion,
    'FECHA ESTIMADA ENTREGA': p.fechaEstimada,
    'NORMA / PROCEDIMIENTO': p.normaProcedimiento || '',
    'CREADO POR': p.creadoPor || '',
    'FECHA CREACIÓN': new Date(p.fechaCreacion).toLocaleDateString(),
    'ÚLTIMA ACTUALIZACIÓN': new Date(p.ultimaActualizacion).toLocaleDateString(),
    'OBSERVACIONES': p.observaciones || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendientes UPTC');

  // Adjust column widths
  const max_cols = Object.keys(exportData[0] || {}).length;
  worksheet['!cols'] = Array(max_cols).fill({ wch: 22 });

  XLSX.writeFile(workbook, filename);
}
