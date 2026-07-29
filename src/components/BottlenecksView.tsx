import React from 'react';
import { PendienteItem, EstadoPendiente } from '../types';
import { 
  AlertTriangle, CheckCircle2, RefreshCw, Zap, TrendingUp, ShieldAlert, ArrowRight, Layers, HelpCircle
} from 'lucide-react';

interface BottlenecksViewProps {
  items: PendienteItem[];
  onStatusChange: (id: string, newStatus: EstadoPendiente) => void;
  onNavigateToTableWithFilter: (filter: { responsable?: string; estado?: string; redundancia?: string }) => void;
}

export const BottlenecksView: React.FC<BottlenecksViewProps> = ({
  items,
  onStatusChange,
  onNavigateToTableWithFilter
}) => {
  // 1. Calculate bottlenecks by Responsible
  const respBottlenecks: { [key: string]: { total: number; pendientes: number; altaPriority: number } } = {};

  items.forEach(i => {
    const r = i.responsable || 'Sin Asignar';
    if (!respBottlenecks[r]) respBottlenecks[r] = { total: 0, pendientes: 0, altaPriority: 0 };
    respBottlenecks[r].total++;
    if (i.estado !== 'CERRADO') {
      respBottlenecks[r].pendientes++;
      if (i.prioridad === 'ALTA') respBottlenecks[r].altaPriority++;
    }
  });

  const topOverloaded = Object.entries(respBottlenecks)
    .sort((a, b) => b[1].pendientes - a[1].pendientes)
    .filter(([_, stats]) => stats.pendientes > 0);

  // 2. Redundancy & Duplicates analysis
  const duplicatesList = items.filter(i => i.redundancia === 'DUPLICADO');

  // 3. Stage Kanban counts
  const stageAbierto = items.filter(i => i.estado === 'ABIERTO');
  const stageEnProceso = items.filter(i => i.estado === 'EN_PROCESO');
  const stagePendiente = items.filter(i => i.estado === 'PENDIENTE');
  const stageCerrado = items.filter(i => i.estado === 'CERRADO');

  return (
    <div className="space-y-6">
      
      {/* Banner Header */}
      <div className="bg-[#006b3f] rounded-xl p-6 text-white border-l-8 border-yellow-500 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>Optimización del Flujo de Trabajo UPTC</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Identificador de Cuellos de Botella y Carga Operativa
            </h2>
            <p className="text-green-100 text-sm mt-1">
              Análisis inteligente para redistribuir cargas, eliminar tareas duplicadas y acelerar la entrega de compromisos en la Vicerrectoría.
            </p>
          </div>
        </div>
      </div>

      {/* Operational Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Overloaded Responsibles */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Puntos de Alta Sobrecarga</span>
          </div>
          <span className="text-2xl font-black text-slate-900">{topOverloaded.length} Funcionarios</span>
          <p className="text-xs text-slate-500 mt-1">
            Presentan acumulación de pendientes activos sin finalizar.
          </p>
        </div>

        {/* Card 2: Duplicates */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Redundancias / Duplicados</span>
          </div>
          <span className="text-2xl font-black text-rose-600">{duplicatesList.length} Registros</span>
          <p className="text-xs text-slate-500 mt-1">
            Tareas repetidas detectadas entre Bitácoras y Fuente Andrea.
          </p>
        </div>

        {/* Card 3: Priority Bottlenecks */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Flujo en Ejecución</span>
          </div>
          <span className="text-2xl font-black text-blue-600">{stageEnProceso.length} En Proceso</span>
          <p className="text-xs text-slate-500 mt-1">
            Actividades en desarrollo activo que requieren seguimiento.
          </p>
        </div>

      </div>

      {/* Interactive Kanban Board / Stage Flow View */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-600" />
          <span>Tablero de Flujo de Trabajo (Kanban Visual)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Column 1: ABIERTO */}
          <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-200">
            <div className="flex items-center justify-between font-bold text-purple-900 text-xs mb-3 pb-2 border-b border-purple-200">
              <span>🟣 ABIERTOS ({stageAbierto.length})</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {stageAbierto.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">{item.tarea}</span>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    <span className="font-bold text-amber-900">👤 {item.responsable}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'EN_PROCESO')}
                      className="text-purple-700 hover:underline font-bold"
                    >
                      Mover →
                    </button>
                  </div>
                </div>
              ))}
              {stageAbierto.length === 0 && <p className="text-[11px] text-slate-400 italic text-center py-4">Sin tareas abiertas</p>}
            </div>
          </div>

          {/* Column 2: EN PROCESO */}
          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200">
            <div className="flex items-center justify-between font-bold text-blue-900 text-xs mb-3 pb-2 border-b border-blue-200">
              <span>🔵 EN PROCESO ({stageEnProceso.length})</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {stageEnProceso.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">{item.tarea}</span>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    <span className="font-bold text-amber-900">👤 {item.responsable}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'CERRADO')}
                      className="text-blue-700 hover:underline font-bold"
                    >
                      Cerrar ✓
                    </button>
                  </div>
                </div>
              ))}
              {stageEnProceso.length === 0 && <p className="text-[11px] text-slate-400 italic text-center py-4">Sin tareas en proceso</p>}
            </div>
          </div>

          {/* Column 3: PENDIENTE */}
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200">
            <div className="flex items-center justify-between font-bold text-amber-900 text-xs mb-3 pb-2 border-b border-amber-200">
              <span>🟡 PENDIENTES ({stagePendiente.length})</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {stagePendiente.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-2xs text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">{item.tarea}</span>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    <span className="font-bold text-amber-900">👤 {item.responsable}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'EN_PROCESO')}
                      className="text-amber-700 hover:underline font-bold"
                    >
                      Atender →
                    </button>
                  </div>
                </div>
              ))}
              {stagePendiente.length === 0 && <p className="text-[11px] text-slate-400 italic text-center py-4">Sin tareas pendientes</p>}
            </div>
          </div>

          {/* Column 4: CERRADO */}
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200">
            <div className="flex items-center justify-between font-bold text-emerald-900 text-xs mb-3 pb-2 border-b border-emerald-200">
              <span>🟢 CERRADOS ({stageCerrado.length})</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {stageCerrado.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs text-xs space-y-1 opacity-75">
                  <span className="font-semibold text-slate-700 block line-through">{item.tarea}</span>
                  <span className="text-[10px] text-emerald-700 font-bold block">👤 {item.responsable}</span>
                </div>
              ))}
              {stageCerrado.length === 0 && <p className="text-[11px] text-slate-400 italic text-center py-4">Sin tareas cerradas</p>}
            </div>
          </div>

        </div>
      </div>

      {/* Ranking of Bottlenecks by Responsible */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Ranking de Sobrecarga por Funcionario Responsable</span>
        </h3>

        <div className="divide-y divide-slate-100">
          {topOverloaded.map(([name, stat], index) => (
            <div key={name} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                <div>
                  <span className="font-extrabold text-slate-900 text-sm block">{name}</span>
                  <span className="text-slate-500 text-[11px]">
                    {stat.total} tareas totales asignadas en la matriz
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {stat.altaPriority > 0 && (
                  <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-bold text-[10px]">
                    {stat.altaPriority} Alta Prioridad
                  </span>
                )}
                <span className="bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-lg">
                  {stat.pendientes} pendientes activos
                </span>
                <button
                  onClick={() => onNavigateToTableWithFilter({ responsable: name })}
                  className="bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                  Filtrar Tareas
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
