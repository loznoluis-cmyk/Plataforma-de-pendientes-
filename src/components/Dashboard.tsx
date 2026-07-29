import React from 'react';
import { PendienteItem, FilterState } from '../types';
import { 
  CheckCircle2, Clock, AlertCircle, Users, ArrowUpRight, BarChart3, Filter, ShieldAlert, Sparkles, PieChart, Layers
} from 'lucide-react';

interface DashboardProps {
  items: PendienteItem[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onNavigateToTable: (applyFilter?: Partial<FilterState>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  items,
  filters,
  setFilters,
  onNavigateToTable
}) => {
  // Calculated stats
  const total = items.length;
  const abiertos = items.filter(i => i.estado === 'ABIERTO').length;
  const enProceso = items.filter(i => i.estado === 'EN_PROCESO').length;
  const pendientes = items.filter(i => i.estado === 'PENDIENTE').length;
  const cerrados = items.filter(i => i.estado === 'CERRADO').length;
  
  const activosTotal = abiertos + enProceso + pendientes;
  const pctCerrados = total > 0 ? Math.round((cerrados / total) * 100) : 0;
  
  const prioridadAlta = items.filter(i => i.prioridad === 'ALTA' && i.estado !== 'CERRADO').length;
  const duplicados = items.filter(i => i.redundancia === 'DUPLICADO').length;

  // Breakdown by Responsable
  const respMap: { [key: string]: { total: number; activos: number; cerrados: number } } = {};
  items.forEach(item => {
    const r = item.responsable || 'Sin Asignar';
    if (!respMap[r]) respMap[r] = { total: 0, activos: 0, cerrados: 0 };
    respMap[r].total++;
    if (item.estado === 'CERRADO') respMap[r].cerrados++;
    else respMap[r].activos++;
  });

  const sortedResponsables = Object.entries(respMap)
    .sort((a, b) => b[1].activos - a[1].activos)
    .slice(0, 8);

  // Breakdown by Proceso SIG
  const procMap: { [key: string]: number } = {};
  items.forEach(i => {
    const p = i.procesoSig || 'GENERAL';
    procMap[p] = (procMap[p] || 0) + 1;
  });

  const topProcesos = Object.entries(procMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Top Lineas Creadoras
  const creaMap: { [key: string]: number } = {};
  items.forEach(i => {
    const l = i.lineaCrea || 'OTRA';
    creaMap[l] = (creaMap[l] || 0) + 1;
  });

  const topCreadoras = Object.entries(creaMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner - Apple Liquid Glass Dark Style */}
      <div className="liquid-glass-dark rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-gradient-to-br from-yellow-300/20 via-amber-200/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Universidad Pedagógica y Tecnológica de Colombia</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Panel de Control de Pendientes
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl font-normal leading-relaxed">
              Monitoree en tiempo real el flujo de trabajo, asignación de responsables y estado de tareas de la Vicerrectoría Académica con la máxima precisión.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToTable({ estado: 'PENDIENTE' })}
              className="bg-yellow-300 hover:bg-yellow-200 text-slate-950 px-5 py-3 rounded-2xl font-bold text-xs shadow-[0_4px_15px_rgba(250,204,21,0.25)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 border border-yellow-200/50"
            >
              <span>Ver Tareas Pendientes ({pendientes})</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid with Apple Style rounded-2xl cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Registrados */}
        <div
          onClick={() => onNavigateToTable({ estado: 'TODOS' })}
          className="apple-card p-5 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 tracking-tight">Total Actividades</p>
            <div className="p-1.5 bg-yellow-300/20 text-yellow-800 rounded-xl border border-yellow-300/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{total}</p>
          <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
            Matriz institucional UPTC
          </p>
        </div>

        {/* Card 2: Pendientes Críticas / Urgentes */}
        <div
          onClick={() => onNavigateToTable({ prioridad: 'ALTA' })}
          className="apple-card p-5 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 tracking-tight">Pendientes Críticas</p>
            <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{prioridadAlta}</p>
          <p className="text-[11px] text-rose-600 mt-2 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Atención prioritaria requerida
          </p>
        </div>

        {/* Card 3: Completadas / Cerrados */}
        <div
          onClick={() => onNavigateToTable({ estado: 'CERRADO' })}
          className="apple-card p-5 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 tracking-tight">Completadas</p>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{cerrados}</p>
          <p className="text-[11px] text-emerald-600 mt-2 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {pctCerrados}% Tasa de Eficiencia
          </p>
        </div>

        {/* Card 4: Pendientes Activas / Responsables */}
        <div
          onClick={() => onNavigateToTable({ estado: 'PENDIENTE' })}
          className="apple-card p-5 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 tracking-tight">En Ejecución Activa</p>
            <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{activosTotal}</p>
          <p className="text-[11px] text-blue-600 mt-2 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {sortedResponsables.length} Responsables asignados
          </p>
        </div>

      </div>

      {/* Progress Bar overall completion - Apple Clean Glass Card */}
      <div className="apple-card p-6">
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-800">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            Avance General de Cierre de Pendientes
          </span>
          <span className="text-slate-900 font-extrabold text-sm">{pctCerrados}% Completado</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex p-0.5 border border-slate-200/80">
          <div
            style={{ width: `${(cerrados / (total || 1)) * 100}%` }}
            className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
            title={`Cerrados: ${cerrados}`}
          ></div>
          <div
            style={{ width: `${(enProceso / (total || 1)) * 100}%` }}
            className="bg-blue-500 h-full transition-all duration-500"
            title={`En Proceso: ${enProceso}`}
          ></div>
          <div
            style={{ width: `${(pendientes / (total || 1)) * 100}%` }}
            className="bg-yellow-300 h-full transition-all duration-500"
            title={`Pendientes: ${pendientes}`}
          ></div>
          <div
            style={{ width: `${(abiertos / (total || 1)) * 100}%` }}
            className="bg-purple-500 h-full rounded-r-full transition-all duration-500"
            title={`Abiertos: ${abiertos}`}
          ></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Cerrados ({cerrados})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> En Proceso ({enProceso})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-300"></span> Pendientes ({pendientes})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Abiertos ({abiertos})</span>
          </div>
          {duplicados > 0 && (
            <span className="text-amber-900 bg-yellow-100/80 px-3 py-1 rounded-full border border-yellow-200 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
              <ShieldAlert className="w-3.5 h-3.5" />
              {duplicados} registros marcados como duplicados
            </span>
          )}
        </div>
      </div>

      {/* AI Semantic Duplicates Shortcut Banner - Liquid Glass Yellow */}
      <div className="liquid-glass-yellow p-5 rounded-3xl border border-yellow-300/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-950">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-yellow-300/40 border border-yellow-400/30 rounded-2xl shrink-0 backdrop-blur-md">
            <Sparkles className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-950 tracking-tight">
              Detección de Pendientes Duplicados y Similares con IA
            </h4>
            <p className="text-xs text-slate-700 font-medium">
              Revise y fusione tareas repetidas, equivalentes o redundantes con el motor de análisis léxico e inteligencia semántica Gemini.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTable()}
          className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-yellow-300 font-bold text-xs rounded-2xl shadow-md shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span>Auditar Duplicados</span>
          <ArrowUpRight className="w-4 h-4 text-yellow-300" />
        </button>
      </div>

      {/* Two Column Layout: Responsables Workload & Proceso SIG breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Workload per Responsible Person */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Carga de Trabajo por Responsable de Ejecución</h3>
              </div>
              <span className="text-xs text-slate-400">Top Responsables</span>
            </div>

            <div className="space-y-3">
              {sortedResponsables.map(([resp, stat]) => {
                const totalResp = stat.total;
                const pctActivo = Math.round((stat.activos / totalResp) * 100);

                return (
                  <div
                    key={resp}
                    onClick={() => onNavigateToTable({ responsable: resp })}
                    className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900">{resp}</span>
                      <span className="text-slate-600 font-semibold">
                        <strong className="text-amber-600">{stat.activos} activos</strong> / {totalResp} total
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${((totalResp - stat.activos) / totalResp) * 100}%` }}
                        className="bg-emerald-500 h-full"
                      ></div>
                      <div
                        style={{ width: `${pctActivo}%` }}
                        className="bg-amber-500 h-full"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <button
              onClick={() => onNavigateToTable({ estado: 'TODOS' })}
              className="text-xs text-amber-700 font-bold hover:text-amber-800 flex items-center gap-1 justify-end"
            >
              Ver todos en la tabla <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Procesos SIG / Lineas Misionales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Distribución por Proceso SIG / Línea Misional</h3>
              </div>
              <span className="text-xs text-slate-400">Distribución</span>
            </div>

            <div className="space-y-3">
              {topProcesos.map(([proc, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div
                    key={proc}
                    onClick={() => onNavigateToTable({ procesoSig: proc })}
                    className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800 truncate max-w-[280px]">{proc}</span>
                      <span className="font-bold text-slate-900">{count} tareas ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-slate-900 h-full rounded-full"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Filters Buttons */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2">Filtrar directamente por Creador:</span>
            <div className="flex flex-wrap gap-1.5">
              {topCreadoras.map(([crea]) => (
                <button
                  key={crea}
                  onClick={() => onNavigateToTable({ lineaCrea: crea })}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 rounded-lg text-[11px] font-medium transition-colors border border-slate-200 cursor-pointer truncate max-w-[180px]"
                >
                  {crea}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
