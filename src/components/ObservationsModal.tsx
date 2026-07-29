import React, { useState, useRef } from 'react';
import { PendienteItem, AdjuntoFile } from '../types';
import { 
  X, MessageSquare, Plus, Calendar, User, Clock, FileText, CheckCircle2, 
  Copy, Check, Send, Tag, AlertCircle, Paperclip, FileSpreadsheet, 
  Image as ImageIcon, Archive, Download, Trash2, UploadCloud, Eye, ExternalLink
} from 'lucide-react';

interface ObservationsModalProps {
  isOpen: boolean;
  item: PendienteItem | null;
  onClose: () => void;
  onSaveObservations: (itemId: string, newObservacionesText: string, updatedAdjuntos?: AdjuntoFile[]) => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
}

const CATEGORY_TEMPLATES = [
  'Se solicitó concepto técnico a la facultad / dependencia.',
  'Se radicó proyecto de acuerdo / documento oficial.',
  'En espera de insumos por parte del equipo responsable.',
  'Mesa de trabajo realizada. Se definieron compromisos.',
  'Trámite completado satisfactoriamente conforme a norma.'
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileMeta = (fileName: string, fileType: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext) || fileType.includes('pdf')) {
    return { icon: FileText, color: 'text-red-600 bg-red-50 border-red-200', badge: 'PDF' };
  }
  if (['doc', 'docx'].includes(ext) || fileType.includes('word')) {
    return { icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200', badge: 'Word' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('excel')) {
    return { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', badge: 'Excel' };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || fileType.includes('image')) {
    return { icon: ImageIcon, color: 'text-purple-600 bg-purple-50 border-purple-200', badge: 'Imagen' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || fileType.includes('zip') || fileType.includes('compressed')) {
    return { icon: Archive, color: 'text-amber-600 bg-amber-50 border-amber-200', badge: 'Archivo' };
  }
  return { icon: Paperclip, color: 'text-slate-600 bg-slate-50 border-slate-200', badge: ext.toUpperCase() || 'Documento' };
};

export const ObservationsModal: React.FC<ObservationsModalProps> = ({
  isOpen,
  item,
  onClose,
  onSaveObservations,
  isAdmin = true,
  onRequireAdmin
}) => {
  if (!isOpen || !item) return null;

  const [newNote, setNewNote] = useState('');
  const [author, setAuthor] = useState('Usuario Vicerrectoría');
  const [category, setCategory] = useState('Avance de ejecución');
  const [copied, setCopied] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<AdjuntoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawText = item.observaciones || '';
  const currentAdjuntos: AdjuntoFile[] = item.adjuntos || [];

  // Split observations into parsed timeline entries
  const parsedEntries = rawText
    .split(/\n\n+/)
    .filter((e) => e.trim().length > 0);

  // File Upload Handler (supports ANY format)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      onRequireAdmin?.('Para adjuntar archivos a la bitácora debe ingresar con perfil Administrador.');
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAdjuntoList: AdjuntoFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        const newAdjunto: AdjuntoFile = {
          id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nombre: file.name,
          tamano: file.size,
          tamanoFormateado: formatFileSize(file.size),
          tipo: file.type || file.name.split('.').pop() || 'application/octet-stream',
          dataUrl,
          fechaSubida: new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          autor: author
        };

        newAdjuntoList.push(newAdjunto);
      } catch (err) {
        console.error('Error al procesar archivo adjunto:', err);
      }
    }

    setStagedFiles((prev) => [...prev, ...newAdjuntoList]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDeleteExistingAttachment = (adjuntoId: string) => {
    if (!isAdmin) {
      onRequireAdmin?.('Para eliminar adjuntos se requiere perfil de Administrador.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar este archivo adjunto del pendiente?')) {
      const updatedList = currentAdjuntos.filter((f) => f.id !== adjuntoId);
      onSaveObservations(item.id, rawText, updatedList);
    }
  };

  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.('Para agregar observaciones o adjuntos se requiere perfil de Administrador.');
      return;
    }
    if (!newNote.trim() && stagedFiles.length === 0) return;

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    let attachSummary = '';
    if (stagedFiles.length > 0) {
      attachSummary = `\n📎 Adjuntos (${stagedFiles.length}): ` + stagedFiles.map((f) => f.nombre).join(', ');
    }

    const noteBody = newNote.trim() || 'Se adjuntaron nuevos soportes/documentos al pendiente.';
    const formattedEntry = `📌 [${formattedDate} - ${author.trim() || 'Sistema'}] (${category}):\n${noteBody}${attachSummary}`;

    const updatedText = rawText.trim()
      ? `${formattedEntry}\n\n${rawText.trim()}`
      : formattedEntry;

    const updatedAdjuntos = [...currentAdjuntos, ...stagedFiles];

    onSaveObservations(item.id, updatedText, updatedAdjuntos);
    setNewNote('');
    setStagedFiles([]);
  };

  const handleCopyHistory = () => {
    navigator.clipboard.writeText(rawText || 'Sin observaciones.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-400/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold bg-slate-800 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-mono">
                  {item.id}
                </span>
                <h3 className="text-base font-bold">Bitácora u Observaciones & Adjuntos</h3>
              </div>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5" title={item.tarea}>
                {item.tarea}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Quick Item Summary Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Responsable:</span>
              <span className="font-bold text-slate-900 text-xs">{item.responsable}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado Actual:</span>
              <span className="font-extrabold text-xs text-emerald-800">{item.estado}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Proceso SIG:</span>
              <span className="font-semibold text-slate-800 truncate block">{item.procesoSig}</span>
            </div>
          </div>

          {/* Form to Add New Observation & Attach Files */}
          <form onSubmit={handleAddObservation} className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5 uppercase text-[11px]">
                <Plus className="w-4 h-4 text-amber-600" />
                Registrar Nueva Observación y/o Adjuntar Archivos
              </span>
              <span className="text-[10px] text-amber-800 font-medium">
                Admite cualquier formato de archivo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Categoría / Tipo de Nota:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Avance de ejecución">🟢 Avance de ejecución</option>
                  <option value="Soporte enviado">📄 Soporte enviado / Radicado</option>
                  <option value="Novedad / Bloqueo">🚨 Novedad / Bloqueo</option>
                  <option value="Sugerencia / Ajuste">💡 Sugerencia / Ajuste</option>
                  <option value="Nota general">📌 Nota general de seguimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Registrado Por:</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nombre de quien registra"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Detalle de la Observación / Actividad Adelantada:
              </label>
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escriba aquí los avances, comentarios, acuerdos o novedades relacionadas con este pendiente..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Quick Template Buttons */}
            <div>
              <span className="text-[10px] font-bold text-amber-900 block mb-1">Plantillas de texto rápido:</span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewNote((prev) => (prev ? `${prev} ${tmpl}` : tmpl))}
                    className="px-2 py-1 bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-950 rounded text-[10px] font-medium border border-amber-200 transition-colors cursor-pointer"
                  >
                    + {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Any Format File Attachment Uploader */}
            <div className="border-t border-amber-200/80 pt-3">
              <label className="block text-[10px] font-bold text-amber-950 uppercase mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-amber-700" />
                  Adjuntar Archivos / Soportes (PDF, Word, Excel, Imágenes, ZIP, etc.):
                </span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">Sin restricción de formato</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-amber-100/70 text-slate-800 font-bold rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer text-xs shrink-0"
                >
                  <UploadCloud className="w-4 h-4 text-amber-700" />
                  <span>{isUploading ? 'Procesando...' : 'Seleccionar Archivos de Cualquier Formato'}</span>
                </button>
                <span className="text-[11px] text-slate-500">
                  {stagedFiles.length > 0 ? `${stagedFiles.length} archivo(s) listo(s) para adjuntar` : 'Puede seleccionar uno o varios documentos.'}
                </span>
              </div>

              {/* Staged files pending submission */}
              {stagedFiles.length > 0 && (
                <div className="mt-2.5 space-y-1.5 bg-white p-2.5 rounded-lg border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 block mb-1">Archivos seleccionados para incluir en esta observación:</span>
                  {stagedFiles.map((f) => {
                    const meta = getFileMeta(f.nombre, f.tipo);
                    const IconComponent = meta.icon;
                    return (
                      <div key={f.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <span className={`p-1 rounded text-[10px] font-bold border shrink-0 ${meta.color}`}>
                            {meta.badge}
                          </span>
                          <span className="font-semibold text-slate-800 truncate" title={f.nombre}>{f.nombre}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({f.tamanoFormateado})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedFile(f.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                          title="Quitar de la lista"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!newNote.trim() && stagedFiles.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#006b3f] hover:bg-[#005432] disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5 text-yellow-300" />
                <span>Guardar Observación con Adjuntos</span>
              </button>
            </div>
          </form>

          {/* Section: Attached Files Repository for this Pendiente */}
          {currentAdjuntos.length > 0 && (
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#006b3f] uppercase text-[11px] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#006b3f]" />
                  Repositorio de Archivos Adjuntos del Pendiente ({currentAdjuntos.length})
                </span>
                <span className="text-[10px] text-emerald-800 font-medium">Archivos disponibles para descarga</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentAdjuntos.map((file) => {
                  const meta = getFileMeta(file.nombre, file.tipo);
                  const IconComponent = meta.icon;
                  return (
                    <div
                      key={file.id}
                      className="p-2.5 bg-white rounded-lg border border-emerald-200/90 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                        <div className={`p-2 rounded-lg border shrink-0 ${meta.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <a
                            href={file.dataUrl}
                            download={file.nombre}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-slate-900 hover:text-[#006b3f] truncate block text-xs"
                            title={file.nombre}
                          >
                            {file.nombre}
                          </a>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{file.tamanoFormateado}</span>
                            <span>•</span>
                            <span>{file.fechaSubida}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={file.dataUrl}
                          download={file.nombre}
                          className="p-1.5 text-slate-600 hover:text-[#006b3f] hover:bg-emerald-100 rounded transition-colors"
                          title="Descargar archivo"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingAttachment(file.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Eliminar archivo adjunto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline of Recorded Observations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                Historial de Observaciones Registradas ({parsedEntries.length})
              </span>

              {rawText && (
                <button
                  onClick={handleCopyHistory}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  title="Copiar todas las observaciones"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Bitácora</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {parsedEntries.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="font-bold text-slate-700">No hay observaciones registradas aún.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Utilice el formulario superior para añadir la primera observación o adjuntar documentos a este pendiente UPTC.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {parsedEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-normal">
                      {entry}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
