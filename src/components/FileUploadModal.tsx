import React, { useState } from 'react';
import { X, Upload, CheckCircle2, ArrowRight, Table, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { ColumnMapping, PendienteItem } from '../types';
import { TARGET_COLUMNS, autoDetectMapping, parseFileContent, convertRowsToPendientes } from '../utils/excelParser';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (items: PendienteItem[], mode: 'replace' | 'append') => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedPreview, setParsedPreview] = useState<PendienteItem[]>([]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      await processSelectedFile(selected);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      await processSelectedFile(dropped);
    }
  };

  const processSelectedFile = async (f: File) => {
    setLoading(true);
    setError(null);
    setFile(f);
    try {
      const { headers, rawRows } = await parseFileContent(f);
      if (!headers.length || !rawRows.length) {
        throw new Error('El archivo no contiene filas o columnas válidas.');
      }
      setUploadedHeaders(headers);
      setRawRows(rawRows);
      
      const detected = autoDetectMapping(headers);
      setMapping(detected);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo. Verifique el formato Excel o CSV.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (targetKey: string, sourceHeader: string) => {
    setMapping((prev) => ({
      ...prev,
      [targetKey]: sourceHeader === '__unmapped__' ? undefined : sourceHeader
    }));
  };

  const handleProceedToPreview = () => {
    const items = convertRowsToPendientes(rawRows, mapping);
    setParsedPreview(items);
    setStep('preview');
  };

  const handleExecuteImport = () => {
    onImportSuccess(parsedPreview, importMode);
    onClose();
    // Reset modal state
    setStep('upload');
    setFile(null);
    setRawRows([]);
    setUploadedHeaders([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Importar Archivo de Pendientes UPTC</h3>
              <p className="text-xs text-slate-300">Soporte para formatos Excel (.xlsx, .xls) y CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-amber-700 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 'upload' ? 'bg-amber-500 text-slate-950' : 'bg-slate-300 text-slate-700'}`}>1</span>
            <span>Seleccionar Archivo</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-amber-700 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 'mapping' ? 'bg-amber-500 text-slate-950' : 'bg-slate-300 text-slate-700'}`}>2</span>
            <span>Mapeo de Encabezados</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-amber-700 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 'preview' ? 'bg-amber-500 text-slate-950' : 'bg-slate-300 text-slate-700'}`}>3</span>
            <span>Confirmar Carga</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-8 text-center bg-slate-50 hover:bg-amber-50/30 transition-all cursor-pointer group"
            >
              <input
                id="file-input-excel"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-input-excel" className="cursor-pointer block">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">Arrastra tu archivo aquí o haz clic para examinar</h4>
                <p className="text-xs text-slate-500 mb-4">Admite Excel (.xlsx, .xls) y archivos CSV codificados en UTF-8</p>
                
                <span className="inline-flex items-center gap-2 bg-slate-900 text-amber-400 hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  Seleccionar Archivo
                </span>
              </label>

              {loading && (
                <div className="mt-4 text-xs text-amber-700 font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  Procesando hoja de cálculo...
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Header Mapping */}
          {step === 'mapping' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-800">Mapeo de Columnas Detectadas</h4>
                  <p className="text-xs text-slate-500">
                    Archivo: <strong className="text-slate-700">{file?.name}</strong> ({rawRows.length} registros encontrados)
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium underline"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold">Campo Destino en Sistema UPTC</th>
                      <th className="p-3 font-bold">Columna en tu Archivo Excel / CSV</th>
                      <th className="p-3 font-bold text-center">Estado Mapeo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {TARGET_COLUMNS.map((col) => {
                      const selectedVal = mapping[col.key as keyof ColumnMapping] || '__unmapped__';
                      const isMapped = selectedVal !== '__unmapped__';

                      return (
                        <tr key={col.key} className="hover:bg-slate-50">
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">{col.label}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{col.key}</span>
                          </td>
                          <td className="p-3">
                            <select
                              value={selectedVal}
                              onChange={(e) => handleMappingChange(col.key, e.target.value)}
                              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            >
                              <option value="__unmapped__">-- Ignorar / No mapear --</option>
                              {uploadedHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-center">
                            {isMapped ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Mapeado
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Opcional</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Confirm */}
          {step === 'preview' && (
            <div>
              <div className="mb-4">
                <h4 className="text-base font-bold text-slate-800">Vista Previa de Carga ({parsedPreview.length} Pendientes)</h4>
                <p className="text-xs text-slate-500">Revisa cómo se registrarán los datos antes de guardarlos en el sistema.</p>
              </div>

              {/* Mode Selector */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-amber-900 block">Modo de Importación:</span>
                  <span className="text-amber-800">Selecciona si deseas agregar o reemplazar los pendientes existentes.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportMode('append')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'append'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Anexar ({parsedPreview.length} nuevos)
                  </button>
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Reemplazar lista actual
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64 overflow-y-auto mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="p-2.5 font-bold">Línea Creadora</th>
                      <th className="p-2.5 font-bold">Proceso SIG</th>
                      <th className="p-2.5 font-bold">Tarea / Pendiente</th>
                      <th className="p-2.5 font-bold">Responsable</th>
                      <th className="p-2.5 font-bold">Estado</th>
                      <th className="p-2.5 font-bold">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedPreview.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-700 font-medium max-w-[150px] truncate">{item.lineaCrea}</td>
                        <td className="p-2.5 text-slate-600 max-w-[150px] truncate">{item.procesoSig}</td>
                        <td className="p-2.5 font-semibold text-slate-900 max-w-[200px] truncate">{item.tarea}</td>
                        <td className="p-2.5 text-amber-900 font-bold">{item.responsable}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-800' :
                            item.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                            item.estado === 'ABIERTO' ? 'bg-purple-100 text-purple-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-700">{item.prioridad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedPreview.length > 10 && (
                <p className="text-center text-xs text-slate-500 font-medium italic">
                  ... Y {parsedPreview.length - 10} registros adicionales listos para guardar.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            {step === 'mapping' && (
              <button
                onClick={handleProceedToPreview}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                <span>Continuar a Vista Previa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 'preview' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Volver a Mapeo
                </button>
                <button
                  id="btn-confirmar-importacion"
                  onClick={handleExecuteImport}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-lg text-xs shadow-md transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Importación ({parsedPreview.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
