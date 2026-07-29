import React, { useState, useMemo } from 'react';
import { PendienteItem, EstadoPendiente } from '../types';
import {
  DuplicatePair,
  findDuplicatePairs,
  fetchAiSemanticDuplicates,
  mergeTwoPendientes
} from '../utils/duplicateDetector';
import {
  Copy,
  Sparkles,
  GitMerge,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Trash2,
  Edit3,
  Sliders,
  RefreshCw,
  Info,
  Check,
  Eye,
  Layers
} from 'lucide-react';
import { OPCIONES_LINEA_CREA, OPCIONES_RESPONSABLE } from '../data/initialData';

interface DuplicatesViewProps {
  items: PendienteItem[];
  onSaveItem: (savedItem: PendienteItem) => void;
  onDeleteItem: (id: string) => void;
  onStatusChange: (id: string, newStatus: EstadoPendiente) => void;
  onEditItem: (item: PendienteItem) => void;
  showToastMessage: (msg: string) => void;
}

export const DuplicatesView: React.FC<DuplicatesViewProps> = ({
  items,
  onSaveItem,
  onDeleteItem,
  onStatusChange,
  onEditItem,
  showToastMessage
}) => {
  const [minScore, setMinScore] = useState<number>(55);
  const [activeFilter, setActiveFilter] = useState<'TODOS' | 'EXACTOS' | 'ALTOS' | 'IA_SEMANTICA' | 'MARCADOS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterResponsable, setFilterResponsable] = useState<string>('TODOS');
  const [filterLinea, setFilterLinea] = useState<string>('TODOS');

  // Ignored pair IDs stored in local state
  const [ignoredPairIds, setIgnoredPairIds] = useState<Set<string>>(new Set());

  // AI Semantic scan states
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [aiPairs, setAiPairs] = useState<DuplicatePair[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Merge modal state
  const [mergeModalPair, setMergeModalPair] = useState<DuplicatePair | null>(null);
  const [masterChoice, setMasterChoice] = useState<'item1' | 'item2'>('item1');
  const [appendActions, setAppendActions] = useState<boolean>(true);
  const [appendNotes, setAppendNotes] = useState<boolean>(true);
  const [markAsClosed, setMarkAsClosed] = useState<boolean>(false);

  // Algorithmic lexical duplicate candidates
  const algorithmicPairs = useMemo(() => {
    return findDuplicatePairs(items, minScore, ignoredPairIds);
  }, [items, minScore, ignoredPairIds]);

  // Combined pairs (Algorithmic + AI Semantic)
  const allPairs = useMemo(() => {
    const pairMap = new Map<string, DuplicatePair>();

    // Add algorithmic pairs
    algorithmicPairs.forEach((pair) => pairMap.set(pair.id, pair));

    // Add or merge AI pairs
    aiPairs.forEach((aiPair) => {
      if (ignoredPairIds.has(aiPair.id)) return;

      if (pairMap.has(aiPair.id)) {
        const existing = pairMap.get(aiPair.id)!;
        pairMap.set(aiPair.id, {
          ...existing,
          matchType: 'IA_SEMANTICA',
          aiReason: aiPair.aiReason,
          reasons: Array.from(new Set([...existing.reasons, ...(aiPair.reasons || [])])),
          recommendation: aiPair.recommendation || existing.recommendation
        });
      } else {
        pairMap.set(aiPair.id, aiPair);
      }
    });

    return Array.from(pairMap.values()).sort((a, b) => b.similarityScore - a.similarityScore);
  }, [algorithmicPairs, aiPairs, ignoredPairIds]);

  // Filter pairs by search and criteria
  const filteredPairs = useMemo(() => {
    return allPairs.filter((pair) => {
      // Filter by type
      if (activeFilter === 'EXACTOS' && pair.similarityScore < 98) return false;
      if (activeFilter === 'ALTOS' && (pair.similarityScore < 75 || pair.similarityScore >= 98)) return false;
      if (activeFilter === 'IA_SEMANTICA' && pair.matchType !== 'IA_SEMANTICA') return false;
      if (activeFilter === 'MARCADOS' && pair.item1.redundancia !== 'DUPLICADO' && pair.item2.redundancia !== 'DUPLICADO') return false;

      // Filter by responsable
      if (filterResponsable !== 'TODOS') {
        const r1 = pair.item1.responsable;
        const r2 = pair.item2.responsable;
        if (r1 !== filterResponsable && r2 !== filterResponsable) return false;
      }

      // Filter by linea
      if (filterLinea !== 'TODOS') {
        const l1 = pair.item1.lineaCrea;
        const l2 = pair.item2.lineaCrea;
        if (l1 !== filterLinea && l2 !== filterLinea) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesText =
          pair.item1.tarea.toLowerCase().includes(q) ||
          pair.item2.tarea.toLowerCase().includes(q) ||
          pair.item1.id.toLowerCase().includes(q) ||
          pair.item2.id.toLowerCase().includes(q) ||
          pair.item1.topico.toLowerCase().includes(q) ||
          pair.item2.topico.toLowerCase().includes(q) ||
          (pair.item1.acciones && pair.item1.acciones.toLowerCase().includes(q)) ||
          (pair.item2.acciones && pair.item2.acciones.toLowerCase().includes(q)) ||
          (pair.item1.observaciones && pair.item1.observaciones.toLowerCase().includes(q)) ||
          (pair.item2.observaciones && pair.item2.observaciones.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      return true;
    });
  }, [allPairs, activeFilter, searchQuery, filterResponsable, filterLinea]);

  // Handle AI Semantic Scan trigger
  const handleRunAiSemanticScan = async () => {
    setIsAiScanning(true);
    setAiError(null);
    setAiSummary(null);

    try {
      const result = await fetchAiSemanticDuplicates(items);
      setAiPairs(result.aiPairs);
      setAiSummary(result.summary || `Se identificaron ${result.aiPairs.length} posibles coincidencias semánticas.`);
      showToastMessage(`Análisis de IA completado: ${result.aiPairs.length} pares con afinidad semántica.`);
      setActiveFilter('IA_SEMANTICA');
    } catch (err: any) {
      console.error('AI Scan error:', err);
      setAiError(err.message || 'No se pudo realizar el análisis semántico con IA.');
      showToastMessage('Error ejecutando análisis con Gemini AI.');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Mark single item as duplicate
  const handleMarkAsDuplicate = (targetItem: PendienteItem, masterItem: PendienteItem) => {
    const updated: PendienteItem = {
      ...targetItem,
      redundancia: 'DUPLICADO',
      observaciones: `${targetItem.observaciones || ''}\n[Sistema]: Marcado como DUPLICADO de ${masterItem.id} el ${new Date().toLocaleDateString('es-CO')}.`.trim(),
      ultimaActualizacion: new Date().toISOString()
    };
    onSaveItem(updated);
    showToastMessage(`Registro ${targetItem.id} marcado como "DUPLICADO" de ${masterItem.id}.`);
  };

  // Mark single item as UNICO (clear duplicate flag)
  const handleMarkAsUnico = (item: PendienteItem) => {
    const updated: PendienteItem = {
      ...item,
      redundancia: 'UNICO',
      ultimaActualizacion: new Date().toISOString()
    };
    onSaveItem(updated);
    showToastMessage(`Registro ${item.id} actualizado a "ÚNICO".`);
  };

  // Ignore pair from list
  const handleIgnorePair = (pairId: string) => {
    setIgnoredPairIds((prev) => new Set([...prev, pairId]));
    showToastMessage('Par omitido de la lista de duplicados.');
  };

  // Confirm Merge
  const handleConfirmMerge = () => {
    if (!mergeModalPair) return;

    const master = masterChoice === 'item1' ? mergeModalPair.item1 : mergeModalPair.item2;
    const secondary = masterChoice === 'item1' ? mergeModalPair.item2 : mergeModalPair.item1;

    const { updatedMaster, updatedDuplicate } = mergeTwoPendientes(master, secondary, {
      markDuplicateAsClosed: markAsClosed,
      appendActions,
      appendNotes
    });

    onSaveItem(updatedMaster);
    onSaveItem(updatedDuplicate);

    setMergeModalPair(null);
    showToastMessage(`Pendiente ${updatedDuplicate.id} fusionado con éxito en el registro principal ${updatedMaster.id}.`);
  };

  // Counts
  const totalInMatrizMarkedDuplicate = items.filter((i) => i.redundancia === 'DUPLICADO').length;
  const exactMatchesCount = allPairs.filter((p) => p.similarityScore >= 98).length;
  const highMatchesCount = allPairs.filter((p) => p.similarityScore >= 75 && p.similarityScore < 98).length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner & Overview Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-300 text-xs font-extrabold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> Módulo de Inteligencia de Duplicados UPTC
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Control e Identificación de Duplicados
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Detecta tareas duplicadas analizando prioritariamente la columna de <strong className="text-amber-400">Acciones</strong> (actividades realizadas/a realizar), patrones de texto o mediante el modelo de IA <strong className="text-yellow-400">Gemini 3.6 Flash</strong> para alineación semántica de actividades.
            </p>
          </div>

          {/* AI Scan Trigger Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleRunAiSemanticScan}
              disabled={isAiScanning}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-yellow-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              {isAiScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Analizando con Gemini IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>Escanear Semántica con IA</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Coincidencias Detectadas</span>
            <span className="text-2xl font-extrabold text-yellow-400">{allPairs.length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Pares candidatos a revisión</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">100% Exactos</span>
            <span className="text-2xl font-extrabold text-purple-400">{exactMatchesCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Texto completamente idéntico</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Alta Similitud (&gt;75%)</span>
            <span className="text-2xl font-extrabold text-amber-400">{highMatchesCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Redacción o tema muy cercano</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Clasificados como DUPLICADO</span>
            <span className="text-2xl font-extrabold text-rose-400">{totalInMatrizMarkedDuplicate}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Marcados en la redundancia</span>
          </div>
        </div>

      </div>

      {/* AI Summary Banner if executed */}
      {aiSummary && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-xs flex items-start gap-3 text-amber-950 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              Análisis Semántico Gemini AI Finalizado
            </h4>
            <p className="text-amber-800 font-medium leading-relaxed">{aiSummary}</p>
          </div>
          <button
            onClick={() => setAiSummary(null)}
            className="text-amber-700 hover:text-amber-950 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Error Alert */}
      {aiError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-4 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{aiError}</span>
          </div>
          <button onClick={() => setAiError(null)} className="text-rose-700 font-bold">
            Cerrar
          </button>
        </div>
      )}

      {/* Search, Threshold Slider and Category Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        
        {/* Top Filters Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveFilter('TODOS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'TODOS'
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({allPairs.length})
            </button>

            <button
              onClick={() => setActiveFilter('EXACTOS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'EXACTOS'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Exactos 100% ({exactMatchesCount})
            </button>

            <button
              onClick={() => setActiveFilter('ALTOS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'ALTOS'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Alta Similitud ({highMatchesCount})
            </button>

            <button
              onClick={() => setActiveFilter('IA_SEMANTICA')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'IA_SEMANTICA'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>IA Semántica ({aiPairs.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('MARCADOS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'MARCADOS'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Marcados Duplicado ({totalInMatrizMarkedDuplicate})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, tarea o tópico..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Sensitivity & Dropdown Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
          
          {/* Threshold Slider */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
            <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700 text-[11px]">Umbral de Similitud Léxica:</span>
                <strong className="text-amber-600">{minScore}%</strong>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Filter Responsable */}
          <div>
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="TODOS">Todos los Responsables</option>
              {OPCIONES_RESPONSABLE.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Linea */}
          <div>
            <select
              value={filterLinea}
              onChange={(e) => setFilterLinea(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="TODOS">Todas las Líneas Creadoras</option>
              {OPCIONES_LINEA_CREA.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Main Pairs List */}
      <div className="space-y-4">
        {filteredPairs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
            <h3 className="text-base font-bold text-slate-800">No se encontraron pares duplicados con estos filtros.</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pruebe reduciendo el umbral de similitud léxica o ejecute un <strong>Análisis Semántico con IA Gemini</strong> para buscar coincidencias conceptuales avanzadas.
            </p>
          </div>
        ) : (
          filteredPairs.map((pair) => (
            <div
              key={pair.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all space-y-0"
            >
              
              {/* Pair Header Bar */}
              <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-500">
                
                {/* Similarity Badge & Type */}
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950">
                    <span>{pair.similarityScore}% SIMILITUD</span>
                  </div>

                  {pair.matchType === 'IA_SEMANTICA' && (
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> IA Semántica Gemini
                    </span>
                  )}

                  {pair.matchType === 'EXACTO' && (
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      100% Exacto
                    </span>
                  )}

                  {pair.matchType === 'MARCADO_DUPLICADO' && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      Marca "DUPLICADO" en Matriz
                    </span>
                  )}
                </div>

                {/* Ignore / Dismiss Pair */}
                <button
                  onClick={() => handleIgnorePair(pair.id)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Omitir este par de la lista de duplicados"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Ignorar Par</span>
                </button>

              </div>

              {/* Reasons / Explanation Tags */}
              <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 text-xs flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-500 text-[10px] uppercase">Diagnóstico:</span>
                {pair.reasons.map((r, idx) => (
                  <span
                    key={idx}
                    className="bg-amber-100/80 text-amber-900 px-2.5 py-0.5 rounded-md text-[11px] font-medium border border-amber-200/80"
                  >
                    {r}
                  </span>
                ))}
              </div>

              {/* Side-by-Side Items Comparison */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-50/30">
                
                {/* ITEM 1 CARD */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  pair.item1.redundancia === 'DUPLICADO'
                    ? 'bg-rose-50/60 border-rose-200'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-900 text-xs bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {pair.item1.id}
                      </span>
                      {pair.item1.redundancia === 'DUPLICADO' ? (
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-extrabold uppercase">
                          DUPLICADO
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                          {pair.item1.redundancia}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onEditItem(pair.item1)}
                      className="text-slate-500 hover:text-blue-600 p-1 rounded-lg"
                      title="Editar registro 1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Acciones - Primary comparison field */}
                  <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
                    <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Acciones (Actividad Realizada / a Realizar):</span>
                    <p className="font-semibold text-slate-900 text-xs mt-0.5 leading-relaxed">
                      {pair.item1.acciones || 'Sin acciones registradas'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tarea / Título:</span>
                    <p className="font-medium text-slate-800 text-xs mt-0.5 leading-relaxed">
                      {pair.item1.tarea}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Responsable:</span>
                      <strong className="text-slate-800">{pair.item1.responsable}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Línea Creadora:</span>
                      <span className="text-slate-700 font-medium truncate block">{pair.item1.lineaCrea}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Tópico:</span>
                      <span className="text-slate-700 font-medium">{pair.item1.topico}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Estado:</span>
                      <span className="font-bold text-slate-800">{pair.item1.estado}</span>
                    </div>
                  </div>

                  {pair.item1.observaciones && (
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] uppercase block">Observaciones / Bitácora:</span>
                      <p className="text-slate-700 mt-0.5">{pair.item1.observaciones}</p>
                    </div>
                  )}
                </div>

                {/* ITEM 2 CARD */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  pair.item2.redundancia === 'DUPLICADO'
                    ? 'bg-rose-50/60 border-rose-200'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-900 text-xs bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {pair.item2.id}
                      </span>
                      {pair.item2.redundancia === 'DUPLICADO' ? (
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-extrabold uppercase">
                          DUPLICADO
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                          {pair.item2.redundancia}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onEditItem(pair.item2)}
                      className="text-slate-500 hover:text-blue-600 p-1 rounded-lg"
                      title="Editar registro 2"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Acciones - Primary comparison field */}
                  <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
                    <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Acciones (Actividad Realizada / a Realizar):</span>
                    <p className="font-semibold text-slate-900 text-xs mt-0.5 leading-relaxed">
                      {pair.item2.acciones || 'Sin acciones registradas'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tarea / Título:</span>
                    <p className="font-medium text-slate-800 text-xs mt-0.5 leading-relaxed">
                      {pair.item2.tarea}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Responsable:</span>
                      <strong className="text-slate-800">{pair.item2.responsable}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Línea Creadora:</span>
                      <span className="text-slate-700 font-medium truncate block">{pair.item2.lineaCrea}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Tópico:</span>
                      <span className="text-slate-700 font-medium">{pair.item2.topico}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block">Estado:</span>
                      <span className="font-bold text-slate-800">{pair.item2.estado}</span>
                    </div>
                  </div>

                  {pair.item2.observaciones && (
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] uppercase block">Observaciones / Bitácora:</span>
                      <p className="text-slate-700 mt-0.5">{pair.item2.observaciones}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Toolbar for Pair */}
              <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Acciones de Resolución:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Merge Button */}
                  <button
                    onClick={() => {
                      setMergeModalPair(pair);
                      setMasterChoice('item1');
                    }}
                    className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Fusionar Pendientes</span>
                  </button>

                  {/* Mark item 2 as DUPLICADO */}
                  {pair.item2.redundancia !== 'DUPLICADO' && (
                    <button
                      onClick={() => handleMarkAsDuplicate(pair.item2, pair.item1)}
                      className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Marcar {pair.item2.id} como DUPLICADO
                    </button>
                  )}

                  {/* Mark item 1 as DUPLICADO */}
                  {pair.item1.redundancia !== 'DUPLICADO' && (
                    <button
                      onClick={() => handleMarkAsDuplicate(pair.item1, pair.item2)}
                      className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Marcar {pair.item1.id} como DUPLICADO
                    </button>
                  )}

                  {/* Mark both as UNICO */}
                  {(pair.item1.redundancia === 'DUPLICADO' || pair.item2.redundancia === 'DUPLICADO') && (
                    <button
                      onClick={() => {
                        handleMarkAsUnico(pair.item1);
                        handleMarkAsUnico(pair.item2);
                      }}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Restablecer ambos a ÚNICO
                    </button>
                  )}

                  {/* Delete Item 2 directly */}
                  <button
                    onClick={() => onDeleteItem(pair.item2.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    title={`Eliminar definitivo de ${pair.item2.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>

            </div>
          ))
        )}
      </div>

      {/* Interactive Merge Modal */}
      {mergeModalPair && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-500">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Asistente de Fusión de Pendientes UPTC</h3>
              </div>
              <button
                onClick={() => setMergeModalPair(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              
              <p className="text-slate-600 font-medium">
                Seleccione el registro que prevalecerá como <strong>Pendiente Principal (Master)</strong>. El otro registro se actualizará automáticamente a <strong>DUPLICADO</strong> y sus anexos de acciones/observaciones se consolidarán en el principal.
              </p>

              {/* Master Choice Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Option 1 */}
                <div
                  onClick={() => setMasterChoice('item1')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    masterChoice === 'item1'
                      ? 'border-amber-500 bg-amber-50/50 shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-900 text-sm">{mergeModalPair.item1.id}</span>
                    <input
                      type="radio"
                      checked={masterChoice === 'item1'}
                      onChange={() => setMasterChoice('item1')}
                      className="accent-amber-500"
                    />
                  </div>
                  <p className="font-bold text-slate-800 line-clamp-2">{mergeModalPair.item1.tarea}</p>
                  <span className="text-[10px] text-slate-500 block mt-2 font-mono">
                    Responsable: {mergeModalPair.item1.responsable}
                  </span>
                </div>

                {/* Option 2 */}
                <div
                  onClick={() => setMasterChoice('item2')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    masterChoice === 'item2'
                      ? 'border-amber-500 bg-amber-50/50 shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-900 text-sm">{mergeModalPair.item2.id}</span>
                    <input
                      type="radio"
                      checked={masterChoice === 'item2'}
                      onChange={() => setMasterChoice('item2')}
                      className="accent-amber-500"
                    />
                  </div>
                  <p className="font-bold text-slate-800 line-clamp-2">{mergeModalPair.item2.tarea}</p>
                  <span className="text-[10px] text-slate-500 block mt-2 font-mono">
                    Responsable: {mergeModalPair.item2.responsable}
                  </span>
                </div>

              </div>

              {/* Merge Options Checkboxes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-700 block uppercase text-[10px]">Opciones de Consolidación:</span>
                
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={appendActions}
                    onChange={(e) => setAppendActions(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Anexar las acciones del registro duplicado al principal</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={appendNotes}
                    onChange={(e) => setAppendNotes(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Anexar observaciones y personal de apoyo del registro duplicado</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={markAsClosed}
                    onChange={(e) => setMarkAsClosed(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Marcar además el registro duplicado como <strong>CERRADO</strong></span>
                </label>
              </div>

            </div>

            <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-t border-slate-200">
              <button
                onClick={() => setMergeModalPair(null)}
                className="px-4 py-2 bg-white border border-slate-300 font-bold text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmMerge}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <GitMerge className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar y Fusionar</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
