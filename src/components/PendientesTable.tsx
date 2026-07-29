import React, { useState, useMemo } from 'react';
import { PendienteItem, FilterState, EstadoPendiente, AdjuntoFile } from '../types';
import { 
  Search, Filter, Edit3, Trash2, Eye, CheckCircle2, Clock, AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight, User, Tag, Calendar, Sparkles, AlertTriangle, MessageSquare, Paperclip, FileText, Save, Mail
} from 'lucide-react';
import { OPCIONES_LINEA_CREA, OPCIONES_PROCESO_SIG, OPCIONES_RESPONSABLE } from '../data/initialData';
import { ObservationsModal } from './ObservationsModal';
import { SinglePendienteEmailModal } from './SinglePendienteEmailModal';

interface PendientesTableProps {
  items: PendienteItem[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onEditItem: (item: PendienteItem) => void;
  onDeleteItem: (id: string) => void;
  onStatusChange: (id: string, newStatus: EstadoPendiente) => void;
  onSaveObservations?: (id: string, newObservaciones: string, updatedAdjuntos?: AdjuntoFile[]) => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string, action?: () => void) => void;
}

export const PendientesTable: React.FC<PendientesTableProps> = ({
  items,
  filters,
  setFilters,
  onEditItem,
  onDeleteItem,
  onStatusChange,
  onSaveObservations,
  isAdmin = true,
  onRequireAdmin
}) => {
  const [selectedDetailItem, setSelectedDetailItem] = useState<PendienteItem | null>(null);
  const [selectedObservationItem, setSelectedObservationItem] = useState<PendienteItem | null>(null);
  const [singleEmailItem, setSingleEmailItem] = useState<PendienteItem | null>(null);
  const [editingDescItem, setEditingDescItem] = useState<PendienteItem | null>(null);
  const [editingDescText, setEditingDescText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Filter items logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Free text search
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesText =
          item.tarea.toLowerCase().includes(q) ||
          (item.descripcionGeneral && item.descripcionGeneral.toLowerCase().includes(q)) ||
          item.topico.toLowerCase().includes(q) ||
          item.lineaCrea.toLowerCase().includes(q) ||
          item.responsable.toLowerCase().includes(q) ||
          item.procesoSig.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          (item.acciones && item.acciones.toLowerCase().includes(q)) ||
          (item.entregable && item.entregable.toLowerCase().includes(q)) ||
          (item.observaciones && item.observaciones.toLowerCase().includes(q));

        if (!matchesText) return false;
      }

      // Filter by Estado
      if (filters.estado !== 'TODOS' && item.estado !== filters.estado) {
        return false;
      }

      // Filter by Responsable
      if (filters.responsable !== 'TODOS' && item.responsable !== filters.responsable) {
        return false;
      }

      // Filter by Linea Creadora
      if (filters.lineaCrea !== 'TODOS' && item.lineaCrea !== filters.lineaCrea) {
        return false;
      }

      // Filter by Proceso SIG
      if (filters.procesoSig !== 'TODOS' && item.procesoSig !== filters.procesoSig) {
        return false;
      }

      // Filter by Prioridad
      if (filters.prioridad !== 'TODOS' && item.prioridad !== filters.prioridad) {
        return false;
      }

      return true;
    });
  }, [items, filters]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      estado: 'TODOS',
      lineaCrea: 'TODOS',
      responsable: 'TODOS',
      procesoSig: 'TODOS',
      topico: 'TODOS',
      prioridad: 'TODOS',
      temporalidad: 'TODOS'
    });
    setCurrentPage(1);
  };

  const getStatusBadge = (estado: EstadoPendiente) => {
    switch (estado) {
      case 'CERRADO':
        return (
          <span className="bg-green-100 text-[#006b3f] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#006b3f]" /> CERRADO
          </span>
        );
      case 'EN_PROCESO':
        return (
          <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> EN PROCESO
          </span>
        );
      case 'ABIERTO':
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-700" /> ABIERTO
          </span>
        );
      case 'PENDIENTE':
      default:
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-yellow-700" /> PENDIENTE
          </span>
        );
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'ALTA':
        return <span className="bg-rose-100/90 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">🔴 CRÍTICA / ALTA</span>;
      case 'MEDIA':
        return <span className="bg-yellow-100/90 text-yellow-900 border border-yellow-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">🟡 MEDIA</span>;
      case 'BAJA':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">⚪ BAJA</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">{p}</span>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Multi-Filter Controls Bar - Apple Liquid Glass Style */}
      <div className="apple-card p-5 space-y-3">
        
        {/* Top Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-pendientes"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Buscar por tarea, responsable, código, tópico o palabra clave..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-100/70 border border-slate-200/80 rounded-2xl text-xs focus:ring-2 focus:ring-yellow-400 focus:bg-white outline-none font-medium transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-900 font-bold">{filteredItems.length}</strong> de {items.length} pendientes
            </span>
            {(filters.estado !== 'TODOS' || filters.responsable !== 'TODOS' || filters.lineaCrea !== 'TODOS' || filters.procesoSig !== 'TODOS' || filters.prioridad !== 'TODOS' || filters.searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full border border-rose-200 transition-colors cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
          
          {/* Filter: Estado */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, estado: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="ABIERTO">ABIERTO</option>
              <option value="EN_PROCESO">EN PROCESO</option>
              <option value="CERRADO">CERRADO</option>
            </select>
          </div>

          {/* Filter: Responsable */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsable</label>
            <select
              value={filters.responsable}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, responsable: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="TODOS">Todos los Responsables</option>
              {OPCIONES_RESPONSABLE.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filter: Linea Creadora */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Línea Creadora</label>
            <select
              value={filters.lineaCrea}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, lineaCrea: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="TODOS">Todas las Líneas</option>
              {OPCIONES_LINEA_CREA.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Filter: Proceso SIG */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proceso SIG</label>
            <select
              value={filters.procesoSig}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, procesoSig: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="TODOS">Todos los Procesos</option>
              {OPCIONES_PROCESO_SIG.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Filter: Prioridad */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prioridad</label>
            <select
              value={filters.prioridad}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, prioridad: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="TODOS">Todas las Prioridades</option>
              <option value="ALTA">ALTA</option>
              <option value="MEDIA">MEDIA</option>
              <option value="BAJA">BAJA</option>
              <option value="TRANSVERSAL">TRANSVERSAL</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-white border-b-2 border-yellow-500">
              <tr>
                <th className="p-3 font-bold">Línea Creadora / Fuente</th>
                <th className="p-3 font-bold">Proceso SIG / Tópico</th>
                <th className="p-3 font-bold min-w-[260px]">Tarea y Descripción General</th>
                <th className="p-3 font-bold text-center">Estado</th>
                <th className="p-3 font-bold">Responsable / Apoyo</th>
                <th className="p-3 font-bold text-center">Prioridad</th>
                <th className="p-3 font-bold">Entrega / Trimestre</th>
                <th className="p-3 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">No se encontraron pendientes con los filtros aplicados.</p>
                    <p className="text-xs text-slate-400 mt-1">Pruebe ajustando los criterios de búsqueda o cargue un nuevo archivo.</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                    
                    {/* Línea Creadora & Fuente */}
                    <td className="p-3 align-top">
                      <span className="font-bold text-slate-900 block max-w-[160px] truncate" title={item.lineaCrea}>
                        {item.lineaCrea}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block max-w-[160px] truncate" title={item.fuente}>
                        {item.fuente}
                      </span>
                    </td>

                    {/* Proceso SIG & Tópico */}
                    <td className="p-3 align-top">
                      <span className="font-semibold text-slate-800 block max-w-[160px] truncate" title={item.procesoSig}>
                        {item.procesoSig}
                      </span>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                        {item.topico}
                      </span>
                    </td>

                    {/* Tarea / Descripción General & Acciones / Observaciones */}
                    <td className="p-3 align-top min-w-[260px]">
                      <div className="font-bold text-slate-900 leading-snug" title={item.tarea}>
                        {item.tarea}
                      </div>

                      {(() => {
                        const descText = item.descripcionGeneral || item.acciones || '';
                        if (descText) {
                          return (
                            <div className="bg-amber-50/90 p-2 rounded-lg border border-amber-200 mt-1 text-xs">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[9px] font-extrabold uppercase text-amber-900 tracking-wider flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-amber-700" />
                                  Descripción / Actividad:
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingDescItem(item);
                                    setEditingDescText(descText);
                                  }}
                                  className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer hover:bg-amber-100 px-1 rounded transition-colors shrink-0"
                                  title="Editar o leer la descripción de la actividad"
                                >
                                  Ver / Editar
                                </button>
                              </div>
                              <p className="line-clamp-2 text-[11px] text-slate-800 leading-relaxed font-normal">
                                {descText}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <button
                            onClick={() => {
                              setEditingDescItem(item);
                              setEditingDescText('');
                            }}
                            className="text-[10px] text-slate-500 hover:text-amber-900 bg-slate-50 hover:bg-amber-50 px-2 py-1 rounded border border-dashed border-slate-300 hover:border-amber-300 mt-1 font-semibold transition-colors cursor-pointer flex items-center gap-1 w-full justify-between"
                          >
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>+ Agregar descripción de la actividad</span>
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-400" />
                          </button>
                        );
                      })()}

                      {item.acciones && item.descripcionGeneral && item.acciones !== item.descripcionGeneral && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 font-medium line-clamp-1" title={item.acciones}>
                          <strong className="font-bold">Acciones Adicionales:</strong> {item.acciones}
                        </p>
                      )}
                      {item.observaciones && (
                        <p className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 font-normal line-clamp-1" title={item.observaciones}>
                          <strong className="font-bold text-slate-600">Obs:</strong> {item.observaciones}
                        </p>
                      )}
                    </td>

                    {/* Estado & Quick Status Switcher */}
                    <td className="p-3 align-top text-center">
                      <div className="inline-block">
                        <select
                          value={item.estado}
                          onChange={(e) => {
                            const newStatus = e.target.value as EstadoPendiente;
                            if (!isAdmin) {
                              onRequireAdmin?.('Para cambiar el estado de un pendiente debe ingresar como Administrador.', () => onStatusChange(item.id, newStatus));
                              return;
                            }
                            onStatusChange(item.id, newStatus);
                          }}
                          className="text-[11px] font-bold rounded-lg p-1 bg-white border border-slate-300 shadow-2xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                        >
                          <option value="ABIERTO">🟣 ABIERTO</option>
                          <option value="EN_PROCESO">🔵 EN PROCESO</option>
                          <option value="PENDIENTE">🟡 PENDIENTE</option>
                          <option value="CERRADO">🟢 CERRADO</option>
                        </select>
                      </div>
                      {item.redundancia === 'DUPLICADO' && (
                        <span className="block mt-1 text-[9px] text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                          DUPLICADO
                        </span>
                      )}
                    </td>

                    {/* Responsable de Ejecución */}
                    <td className="p-3 align-top">
                      <span className="font-extrabold text-amber-950 block">{item.responsable}</span>
                      {item.personalApoyo && (
                        <span className="text-[10px] text-slate-500 block truncate max-w-[140px]" title={item.personalApoyo}>
                          Apoyo: {item.personalApoyo}
                        </span>
                      )}
                    </td>

                    {/* Priorización */}
                    <td className="p-3 align-top text-center">
                      {getPriorityBadge(item.prioridad)}
                    </td>

                    {/* Temporalidad y Fecha */}
                    <td className="p-3 align-top">
                      <span className="font-bold text-slate-700 block text-[11px]">{item.temporalidad}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {item.fechaEstimada ? new Date(item.fechaEstimada).toLocaleDateString('es-CO') : 'Sin Fecha'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="p-3 align-top text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedObservationItem(item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer relative flex items-center gap-1 ${
                            item.observaciones || (item.adjuntos && item.adjuntos.length > 0)
                              ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 font-bold'
                              : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={
                            item.adjuntos && item.adjuntos.length > 0
                              ? `Observaciones y ${item.adjuntos.length} archivo(s) adjunto(s)`
                              : item.observaciones
                              ? 'Ver / Gestionar Bitácora de Observaciones'
                              : 'Agregar Observación o Adjuntos'
                          }
                        >
                          <MessageSquare className="w-4 h-4" />
                          {item.adjuntos && item.adjuntos.length > 0 && (
                            <Paperclip className="w-3.5 h-3.5 text-emerald-800" />
                          )}
                          {(item.observaciones || (item.adjuntos && item.adjuntos.length > 0)) && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-600 rounded-full border-2 border-white" />
                          )}
                        </button>

                        <button
                          onClick={() => setSelectedDetailItem(item)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSingleEmailItem(item)}
                          className="p-1.5 text-amber-800 hover:text-slate-950 bg-yellow-100/80 hover:bg-yellow-300/80 border border-yellow-300 rounded-lg transition-colors cursor-pointer"
                          title="Enviar correo de seguimiento a responsable (Gmail API)"
                        >
                          <Mail className="w-4 h-4 text-amber-900" />
                        </button>

                        <button
                          onClick={() => {
                            if (!isAdmin) {
                              onRequireAdmin?.('Para editar la información de este pendiente debe ingresar como Administrador.', () => onEditItem(item));
                            } else {
                              onEditItem(item);
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar pendiente"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (!isAdmin) {
                              onRequireAdmin?.('Para eliminar un registro de la matriz debe ingresar como Administrador.', () => onDeleteItem(item.id));
                            } else {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar pendiente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">
              Página <strong className="text-slate-900">{currentPage}</strong> de <strong className="text-slate-900">{totalPages}</strong> ({filteredItems.length} registros)
            </span>
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-300 pl-3">
              <span className="text-slate-500 font-medium">Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg text-xs px-2 py-1 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
              >
                <option value={15}>15 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={250}>250 por página</option>
                <option value={500}>500 por página</option>
                <option value={999999}>Mostrar TODOS los {filteredItems.length} pendientes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 font-bold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 font-bold"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Task Detail View Modal */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-500">
              <div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  {selectedDetailItem.id}
                </span>
                <h3 className="text-base font-bold mt-1">Detalle del Pendiente UPTC</h3>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Nombre / Asunto Principal:</span>
                <p className="text-sm font-bold text-slate-900 mt-1 leading-snug bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedDetailItem.tarea}
                </p>
              </div>

              {/* Descripción General Completa */}
              <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-950 font-extrabold text-[11px] uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    Descripción General del Pendiente
                  </span>
                  <button
                    onClick={() => {
                      setEditingDescItem(selectedDetailItem);
                      setEditingDescText(selectedDetailItem.descripcionGeneral || '');
                    }}
                    className="text-[10px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3 text-amber-800" />
                    <span>Editar Descripción</span>
                  </button>
                </div>
                <p className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed font-normal pt-1">
                  {selectedDetailItem.descripcionGeneral || 'Sin descripción general registrada. Haga clic en Editar para agregar un detalle completo.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Responsable Principal:</span>
                  <span className="text-amber-950 font-extrabold text-sm">{selectedDetailItem.responsable}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Personal de Apoyo:</span>
                  <span className="text-slate-800 font-semibold">{selectedDetailItem.personalApoyo || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Línea Creadora:</span>
                  <span className="text-slate-800 font-bold">{selectedDetailItem.lineaCrea}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Fuente / Bitácora:</span>
                  <span className="text-slate-800 font-medium">{selectedDetailItem.fuente}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Proceso SIG:</span>
                  <span className="text-slate-800 font-bold">{selectedDetailItem.procesoSig}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Estado Actual:</span>
                  {getStatusBadge(selectedDetailItem.estado)}
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Prioridad:</span>
                  {getPriorityBadge(selectedDetailItem.prioridad)}
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Temporalidad:</span>
                  <span className="font-bold text-slate-800">{selectedDetailItem.temporalidad}</span>
                </div>
              </div>

              {selectedDetailItem.entregable && (
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Entregable Esperado:</span>
                  <p className="font-medium text-slate-800">{selectedDetailItem.entregable}</p>
                </div>
              )}

              {selectedDetailItem.acciones && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold text-[11px] uppercase block">Acciones (Actividad Realizada / a Realizar):</span>
                  <p className="font-semibold text-slate-900 mt-1">{selectedDetailItem.acciones}</p>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-bold text-[11px] uppercase block">Observaciones / Bitácora de lo Realizado:</span>
                <p className="font-normal text-slate-800 mt-1 whitespace-pre-wrap">
                  {selectedDetailItem.observaciones || 'Sin observaciones de seguimiento registradas.'}
                </p>
              </div>

              {selectedDetailItem.normaProcedimiento && (
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block">Norma o Procedimiento que lo solicita:</span>
                  <p className="font-medium text-slate-800">{selectedDetailItem.normaProcedimiento}</p>
                </div>
              )}

            </div>

            <div className="bg-slate-100 px-6 py-3 flex flex-wrap justify-between items-center gap-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = selectedDetailItem;
                    setSelectedDetailItem(null);
                    setSelectedObservationItem(target);
                  }}
                  className="px-3.5 py-2 bg-[#006b3f] text-yellow-300 font-bold rounded-lg hover:bg-[#005432] transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Gestionar Observaciones</span>
                </button>

                <button
                  onClick={() => {
                    const target = selectedDetailItem;
                    setSelectedDetailItem(null);
                    setSingleEmailItem(target);
                  }}
                  className="px-3.5 py-2 bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-extrabold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer border border-yellow-200"
                >
                  <Mail className="w-4 h-4 text-slate-950" />
                  <span>Enviar Correo por Gmail API</span>
                </button>

                <button
                  onClick={() => {
                    onEditItem(selectedDetailItem);
                    setSelectedDetailItem(null);
                  }}
                  className="px-4 py-2 bg-slate-900 text-amber-400 font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Registro</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 bg-white border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-200 text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Observations Modal */}
      <ObservationsModal
        isOpen={Boolean(selectedObservationItem)}
        item={selectedObservationItem}
        onClose={() => setSelectedObservationItem(null)}
        isAdmin={isAdmin}
        onRequireAdmin={onRequireAdmin}
        onSaveObservations={(itemId, newObservacionesText, updatedAdjuntos) => {
          if (onSaveObservations) {
            onSaveObservations(itemId, newObservacionesText, updatedAdjuntos);
          }
          // Update local state if selectedObservationItem is open
          setSelectedObservationItem((prev) =>
            prev && prev.id === itemId
              ? { ...prev, observaciones: newObservacionesText, adjuntos: updatedAdjuntos !== undefined ? updatedAdjuntos : prev.adjuntos }
              : prev
          );
        }}
      />

      {/* Quick Edit Description Modal */}
      {editingDescItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-500">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-800 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">
                      {editingDescItem.id}
                    </span>
                    <h3 className="text-base font-bold">Descripción / Actividad</h3>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                    {editingDescItem.tarea}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingDescItem(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {!isAdmin && (
                <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-950 font-medium text-xs">
                  Modo Lectura: Para editar la descripción de la actividad debe ingresar como Administrador.
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Detalle y Alcance Completo de la Tarea / Pendiente:
                </label>
                <textarea
                  rows={6}
                  readOnly={!isAdmin}
                  value={editingDescText}
                  onChange={(e) => setEditingDescText(e.target.value)}
                  placeholder="Escriba aquí la descripción general detallada del pendiente UPTC..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setEditingDescItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      const updated = {
                        ...editingDescItem,
                        descripcionGeneral: editingDescText.trim(),
                        acciones: editingDescText.trim() || editingDescItem.acciones,
                        ultimaActualizacion: new Date().toISOString()
                      };
                      onEditItem(updated);
                      // Also update selectedDetailItem if open
                      if (selectedDetailItem && selectedDetailItem.id === editingDescItem.id) {
                        setSelectedDetailItem(updated);
                      }
                      setEditingDescItem(null);
                    }}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Guardar Descripción</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Pendiente Real Email Modal */}
      <SinglePendienteEmailModal
        isOpen={Boolean(singleEmailItem)}
        item={singleEmailItem}
        onClose={() => setSingleEmailItem(null)}
      />

    </div>
  );
};
