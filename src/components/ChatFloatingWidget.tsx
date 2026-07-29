import React, { useState } from 'react';
import { PendienteItem, FilterState } from '../types';
import { ChatView } from './ChatView';
import { Sparkles, X, MessageSquare, Bot } from 'lucide-react';

interface ChatFloatingWidgetProps {
  items: PendienteItem[];
  onNavigateToTable?: (filters?: Partial<FilterState>) => void;
  onSelectItemDetail?: (item: PendienteItem) => void;
}

export const ChatFloatingWidget: React.FC<ChatFloatingWidgetProps> = ({
  items,
  onNavigateToTable,
  onSelectItemDetail
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Toggle Button - Liquid Glass Pill */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 bg-[#121214]/90 hover:bg-[#121214] text-white px-4 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-2xl group"
            title="Abrir Asistente IA de Pendientes UPTC"
          >
            <div className="relative flex items-center justify-center p-1 bg-yellow-300/20 rounded-full border border-yellow-300/30">
              <Sparkles className="w-4 h-4 text-yellow-300 stroke-[2.5] animate-pulse" />
            </div>
            <span className="font-bold text-xs tracking-tight pr-1">Asistente IA UPTC</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(false)}
            className="p-3 bg-[#121214]/90 hover:bg-[#121214] text-white rounded-full shadow-2xl border border-white/20 hover:scale-105 transition-all cursor-pointer backdrop-blur-2xl"
            title="Cerrar asistente"
          >
            <X className="w-5 h-5 text-yellow-300" />
          </button>
        )}
      </div>

      {/* Floating Popover Window - Liquid Glass Sheet */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 w-[92vw] sm:w-[480px] md:w-[540px] h-[600px] max-h-[80vh] shadow-[0_25px_60px_rgba(0,0,0,0.25)] rounded-3xl border border-white/60 overflow-hidden liquid-glass backdrop-blur-2xl animate-in slide-in-from-bottom-5 fade-in duration-200">
          <ChatView
            items={items}
            onNavigateToTable={(filters) => {
              setIsOpen(false);
              if (onNavigateToTable) onNavigateToTable(filters);
            }}
            onSelectItemDetail={(item) => {
              setIsOpen(false);
              if (onSelectItemDetail) onSelectItemDetail(item);
            }}
          />
        </div>
      )}
    </>
  );
};
