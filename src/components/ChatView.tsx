import React, { useState, useRef, useEffect } from 'react';
import { PendienteItem, FilterState } from '../types';
import { Bot, User, Send, Sparkles, RefreshCw, Copy, Check, MessageSquare, ShieldCheck, CornerDownLeft, ExternalLink, AlertCircle, HelpCircle, FileText, Download } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface ChatViewProps {
  items: PendienteItem[];
  onNavigateToTable?: (filters?: Partial<FilterState>) => void;
  onSelectItemDetail?: (item: PendienteItem) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: '📊',
    label: 'Resumen Ejecutivo',
    prompt: 'Genera un resumen ejecutivo de la matriz de pendientes UPTC indicando avance general y alertas principales.'
  },
  {
    icon: '🚨',
    label: 'Prioridad Alta & Abiertos',
    prompt: '¿Cuáles son los pendientes con prioridad ALTA que se encuentran en estado ABIERTO o PENDIENTE?'
  },
  {
    icon: '👤',
    label: 'Carga por Responsable',
    prompt: '¿Cuántos y cuáles pendientes tiene asignados cada responsable en la Vicerrectoría Académica?'
  },
  {
    icon: '⏳',
    label: 'Cuellos de Botella',
    prompt: '¿Cuáles tareas o procesos presentan mayores retrasos o cuellos de botella para el seguimiento institucional?'
  },
  {
    icon: '🎯',
    label: 'Entregables Clave',
    prompt: 'Enumera los entregables principales asociados a las líneas misionales (Proceso SIG).'
  }
];

export const ChatView: React.FC<ChatViewProps> = ({ items, onNavigateToTable, onSelectItemDetail }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `¡Hola! Soy el **Asistente Virtual IA de la Vicerrectoría Académica UPTC**.\n\nTengo cargada en tiempo real la matriz institucional con **${items.length} pendientes y compromisos**. Puedes preguntarme sobre:\n\n* 📊 **Estadísticas e informes** por línea misional o responsable.\n* 🚨 **Tareas críticas** y prioridades altas.\n* ⏳ **Seguimiento de fechas de entrega** y cuellos de botella.\n* 🔍 **Detalles de tareas específicas** (ej. "Háblame del pendiente [UPTC-001]").\n\n¿En qué puedo ayudarte hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      // Build history for API
      const history = messages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content
        }));

      // Sanitize items payload to send light JSON over network
      const sanitizedItems = items.map((i) => ({
        id: i.id,
        tarea: (i.tarea || '').substring(0, 150),
        estado: i.estado || '',
        prioridad: i.prioridad || '',
        lineaCrea: i.lineaCrea || '',
        procesoSig: i.procesoSig || '',
        topico: i.topico || '',
        responsable: i.responsable || '',
        acciones: (i.acciones || '').substring(0, 150),
        entregable: (i.entregable || '').substring(0, 80),
        fechaEstimada: i.fechaEstimada || '',
        temporalidad: i.temporalidad || '',
        observaciones: (i.observaciones || '').substring(0, 80)
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history,
          items: sanitizedItems
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Non-JSON response from /api/chat:', responseText);
        throw new Error('El servidor devolvió un formato no esperado. Por favor reintente su consulta.');
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error al comunicarse con el asistente.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No se obtuvo respuesta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Ocurrió un inconveniente**: ${err.message || 'No fue posible conectar con el servicio de IA. Verifique que la clave GEMINI_API_KEY esté activa.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('¿Desea reiniciar la conversación con el asistente?')) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Conversación reiniciada. Matriz con **${items.length} pendientes** sincronizada. ¿Qué deseas consultar?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleCopyText = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadReport = () => {
    const reportText = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? '👤 Consulta Usuario' : '🤖 Asistente IA UPTC'} (${m.timestamp})\n\n${m.content}\n\n---\n`
      )
      .join('\n');

    const blob = new Blob([`# Reporte de Análisis de Pendientes UPTC\n\n${reportText}`], {
      type: 'text/markdown;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Informe_Asistente_UPTC_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render text with markdown and clickable UPTC task ID badges
  const renderFormattedText = (content: string) => {
    // Regex for matching [UPTC-XXX] or UPTC-XXX
    const taskRegex = /\[?(UPTC-\d{3,4})\]?/g;

    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Process bold tags **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);

          return (
            <div key={idx} className={line.startsWith('* ') || line.startsWith('- ') ? 'ml-3 flex items-start gap-2' : ''}>
              {(line.startsWith('* ') || line.startsWith('- ')) && (
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
              )}

              <span>
                {parts.map((part, pIdx) => {
                  let isBold = false;
                  let rawText = part;

                  if (part.startsWith('**') && part.endsWith('**')) {
                    isBold = true;
                    rawText = part.slice(2, -2);
                  }

                  // Process task ID tags within rawText
                  const taskMatches = Array.from(rawText.matchAll(taskRegex));

                  if (taskMatches.length === 0) {
                    return isBold ? <strong key={pIdx} className="font-semibold text-slate-900">{rawText}</strong> : rawText;
                  }

                  // Split by task regex
                  const taskParts = rawText.split(taskRegex);
                  return (
                    <span key={pIdx} className={isBold ? 'font-semibold text-slate-900' : ''}>
                      {taskParts.map((tPart, tIdx) => {
                        const isTaskId = /^UPTC-\d{3,4}$/.test(tPart);
                        if (isTaskId) {
                          const targetItem = items.find((i) => i.id === tPart);
                          return (
                            <button
                              key={tIdx}
                              onClick={() => {
                                if (targetItem && onSelectItemDetail) {
                                  onSelectItemDetail(targetItem);
                                } else if (onNavigateToTable) {
                                  onNavigateToTable({ searchQuery: tPart });
                                }
                              }}
                              className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-[#006b3f] font-mono text-xs font-bold border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                              title={targetItem ? `Ver pendiente: ${targetItem.tarea}` : `Filtrar por ${tPart}`}
                            >
                              <span>{tPart}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-emerald-700" />
                            </button>
                          );
                        }
                        return tPart;
                      })}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      
      {/* Header Bar */}
      <div className="bg-[#006b3f] text-white px-5 py-3.5 border-b-2 border-yellow-500 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-yellow-500 rounded-xl flex items-center justify-center text-slate-900 shadow-md border border-yellow-400 shrink-0">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Asistente IA Pendientes UPTC
              </h2>
              <span className="text-[10px] font-extrabold bg-emerald-800 text-yellow-300 border border-emerald-600 px-2 py-0.5 rounded uppercase tracking-wider">
                Gemini 3.6
              </span>
            </div>
            <p className="text-xs text-green-100/90 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
              <span>Sincronizado con {items.length} tareas de la Vicerrectoría Académica</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-xs font-medium text-green-100 border border-emerald-600/80 transition-colors cursor-pointer"
            title="Descargar informe actual del chat en formato Markdown"
          >
            <Download className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden sm:inline">Exportar Informe</span>
          </button>
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-xs font-medium text-green-100 border border-emerald-600/80 transition-colors cursor-pointer"
            title="Reiniciar conversación"
          >
            <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">Limpiar chat</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60">
        
        {/* Suggested Prompts Grid */}
        {messages.length <= 2 && (
          <div className="mb-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-[#006b3f]" />
              <span>Preguntas rápidas recomendadas:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SUGGESTED_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50/80 hover:border-emerald-300 text-left transition-all cursor-pointer group shadow-2xs"
                >
                  <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <div>
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-[#006b3f]">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.prompt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-amber-400 border-slate-700'
                  : msg.isError
                  ? 'bg-red-100 text-red-600 border-red-300'
                  : 'bg-[#006b3f] text-yellow-300 border-emerald-700'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm relative group ${
                msg.role === 'user'
                  ? 'bg-[#006b3f] text-white rounded-tr-xs'
                  : msg.isError
                  ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
              }`}
            >
              {/* Copy button for assistant responses */}
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleCopyText(msg.id, msg.content)}
                  className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Copiar respuesta"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <div className="mb-1 text-[10px] font-bold tracking-wider uppercase opacity-75 flex items-center gap-2">
                <span>{msg.role === 'user' ? 'Tú (Usuario)' : 'Asistente IA UPTC'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                renderFormattedText(msg.content)
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 bg-[#006b3f] text-yellow-300 rounded-xl flex items-center justify-center shrink-0 border border-emerald-700 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-sm flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-[#006b3f] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Analizando matriz de pendientes UPTC con Gemini...
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta sobre los pendientes (ej. 'Resumen de tareas de la Línea de Gestión', '¿Qué entregables faltan?')..."
              className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006b3f] focus:border-transparent resize-none placeholder:text-slate-400"
            />
            <span className="absolute right-3 bottom-3 text-[10px] text-slate-400 font-medium hidden sm:inline">
              Shift+Enter para salto de línea
            </span>
          </div>

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="h-11 px-4 bg-[#006b3f] hover:bg-[#005432] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4 text-yellow-300" />
            <span className="hidden sm:inline text-xs">Enviar</span>
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>IA contextualizada con {items.length} registros institucionales actualizados.</span>
          <span className="hidden sm:inline">UPTC • Vicerrectoría Académica</span>
        </div>
      </div>

    </div>
  );
};
