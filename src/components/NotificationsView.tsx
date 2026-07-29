import React, { useState, useEffect } from 'react';
import { PendienteItem, NotificationItem } from '../types';
import { 
  Bell, Mail, Send, CheckCircle2, AlertTriangle, Clock, Copy, UserCheck, Sparkles, Check, ChevronRight, CheckCircle, ExternalLink, Smartphone
} from 'lucide-react';
import { loginWithGoogleForGmail, subscribeGoogleAuth, sendRealGmail, getMailtoUrl, getGmailWebComposeUrl } from '../lib/gmailService';
import { User as FirebaseUser } from 'firebase/auth';

interface NotificationsViewProps {
  items: PendienteItem[];
  onStatusChange: (id: string, newStatus: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ items, onStatusChange }) => {
  const [selectedResponsable, setSelectedSelectedResponsable] = useState<string>('TODOS');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentSuccessMsg, setSentSuccessMsg] = useState<string | null>(null);
  
  // Google Gmail API State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sendingState, setSendingState] = useState<{ [key: string]: boolean }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGoogleAuth((u, t) => {
      setGoogleUser(u);
      if (t) setGoogleToken(t);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectGoogle = async () => {
    setAuthError(null);
    try {
      const res = await loginWithGoogleForGmail();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('popup') || msg.includes('closed') || msg.includes('formato')) {
        setAuthError('Google Workspace restringió la ventana flotante en este navegador/dispositivo (Error 400). Puedes usar las opciones directas "Abrir App de Correo" o "Abrir en Gmail Web" sin necesidad de autenticar.');
      } else {
        setAuthError(msg || 'Error autorizando la cuenta de Google con acceso a Gmail.');
      }
    }
  };

  // Generate automated notifications dynamically from items
  const activePendingItems = items.filter(i => i.estado === 'PENDIENTE' || i.estado === 'ABIERTO' || i.estado === 'EN_PROCESO');

  // Responsables list from active items
  const responsablesList: string[] = Array.from(new Set(activePendingItems.map(i => i.responsable))).filter((r): r is string => Boolean(r));

  const filteredByResponsable = selectedResponsable === 'TODOS'
    ? activePendingItems
    : activePendingItems.filter(i => i.responsable === selectedResponsable);

  const getDigestTextForResponsable = (respName: string) => {
    const respItems = items.filter(i => i.responsable === respName && i.estado !== 'CERRADO');
    return `UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA
VICERRECTORÍA ACADÉMICA — SISTEMA INTEGRADO DE GESTIÓN (SIG UPTC)

ASUNTO: NOTIFICACIÓN DE TAREAS Y COMPROMISOS ASIGNADOS

Estimado(a) ${respName}:

Cordial saludo.

En cumplimiento de las funciones institucionales de seguimiento de la Vicerrectoría Académica, informamos que actualmente registra (${respItems.length}) tareas y compromisos en estado activo dentro de la matriz de seguimiento del SIG:

===================================================================
DETALLE DE ACTIVIDADES Y PENDIENTES REGISTRADOS
===================================================================
${respItems.map((item, index) => `
${index + 1}. [CÓDIGO ID: ${item.id}] — ${item.tarea}
   • Descripción: ${item.descripcionGeneral || item.acciones || 'Sin observaciones'}
   • Proceso SIG: ${item.procesoSig} | Línea CREA: ${item.lineaCrea}
   • Estado: ${item.estado} | Prioridad: ${item.prioridad}
   • Fecha Estimada / Temporalidad: ${item.temporalidad} ${item.fechaEstimada ? `(${item.fechaEstimada})` : ''}
   • Entregable Requerido: ${item.entregable || 'N/A'}
`).join('')}
===================================================================

Solicitamos atentamente revisar el avance de estas actividades y responder a este comunicado adjuntando los soportes o informes correspondientes.

Atentamente,

VICERRECTORÍA ACADÉMICA
Universidad Pedagógica y Tecnológica de Colombia (UPTC)
Tunja, Boyacá, Colombia`;
  };

  const handleCopyDigest = (respName: string) => {
    const text = getDigestTextForResponsable(respName);
    navigator.clipboard.writeText(text);
    setCopiedId(respName);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleOpenNativeMailForResponsable = (respName: string) => {
    const respItems = activePendingItems.filter(i => i.responsable === respName);
    const subject = `[NOTIFICACIÓN OFICIAL UPTC] ${respItems.length} Tareas Pendientes Asignadas a ${respName}`;
    const body = getDigestTextForResponsable(respName);
    const destinationEmail = 'luisalberto.lozano@uptc.edu.co';
    const mailtoUrl = getMailtoUrl(destinationEmail, subject, body);
    window.location.href = mailtoUrl;
  };

  const handleOpenGmailWebForResponsable = (respName: string) => {
    const respItems = activePendingItems.filter(i => i.responsable === respName);
    const subject = `[NOTIFICACIÓN OFICIAL UPTC] ${respItems.length} Tareas Pendientes Asignadas a ${respName}`;
    const body = getDigestTextForResponsable(respName);
    const destinationEmail = 'luisalberto.lozano@uptc.edu.co';
    const url = getGmailWebComposeUrl(destinationEmail, subject, body);
    window.open(url, '_blank');
  };

  const handleSendRealGmailToResponsable = async (respName: string, targetEmail?: string) => {
    const destinationEmail = targetEmail || (googleUser?.email || 'luisalberto.lozano@uptc.edu.co');
    setSendingState(prev => ({ ...prev, [respName]: true }));
    setAuthError(null);

    const respItems = activePendingItems.filter(i => i.responsable === respName);
    const subject = `[NOTIFICACIÓN OFICIAL UPTC] ${respItems.length} Tareas Pendientes Asignadas a ${respName}`;

    if (googleToken) {
      try {
        const itemsHtml = respItems.map((item, idx) => `
          <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <strong style="background: #0f172a; color: #facc15; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${item.id}</strong>
              <strong style="color: ${item.prioridad === 'ALTA' ? '#dc2626' : '#d97706'};">${item.prioridad} PRIORIDAD</strong>
            </div>
            <h4 style="margin: 4px 0; font-size: 13px; color: #0f172a;">${idx + 1}. ${item.tarea}</h4>
            <p style="margin: 0; font-size: 11px; color: #475569;">
              <strong>Línea Creadora:</strong> ${item.lineaCrea} | <strong>Proceso:</strong> ${item.procesoSig}<br>
              <strong>Fecha Estimada:</strong> ${item.fechaEstimada || item.temporalidad || 'Pendiente'}<br>
              <strong>Entregable:</strong> ${item.entregable || 'No especificado'}
            </p>
          </div>
        `).join('');

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background: #121214; color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #facc15;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #ffffff;">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</h2>
              <p style="margin: 4px 0 0; font-size: 12px; color: #facc15;">Vicerrectoría Académica • Sistema Integrado de Gestión UPTC</p>
            </div>
            <div style="padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.6;">
              <p style="margin-top: 0;">Estimado(a) <strong>${respName}</strong>,</p>
              <p>Se le notifica que actualmente registra <strong>${respItems.length} actividad(es) pendientes o en proceso</strong> asignadas a su cargo dentro de la Matriz Institucional SIG UPTC:</p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0;">
                ${itemsHtml}
              </div>

              <p style="font-size: 12px; color: #475569;">Por favor actualice el estado de avance en el sistema o remita los soportes requeridos.</p>
              
              <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                Universidad Pedagógica Y Tecnológica de Colombia — Vicerrectoría Académica<br>
                Mensaje enviado mediante el Sistema de Gestión de Pendientes UPTC.
              </div>
            </div>
          </div>
        `;

        const res = await sendRealGmail({
          toEmail: destinationEmail,
          subject,
          htmlContent,
          accessToken: googleToken
        });

        setSendingState(prev => ({ ...prev, [respName]: false }));
        setSentSuccessMsg(`¡Correo oficial enviado exitosamente a ${destinationEmail}! (ID: ${res.id})`);
        setTimeout(() => setSentSuccessMsg(null), 7000);
        return;
      } catch (err) {
        console.warn('Gmail API error, falling back to web compose:', err);
      }
    }

    // Direct functional web email compose opening (100% reliable)
    const body = getDigestTextForResponsable(respName);
    const composeUrl = getGmailWebComposeUrl(destinationEmail, subject, body);
    window.open(composeUrl, '_blank');

    setSendingState(prev => ({ ...prev, [respName]: false }));
    setSentSuccessMsg(`¡Notificación institucional preparada y abierta en la ventana de correo para ${destinationEmail}!`);
    setTimeout(() => setSentSuccessMsg(null), 7000);
  };


  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#006b3f] rounded-xl p-6 text-white border-l-8 border-yellow-500 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs uppercase tracking-wider mb-1">
              <Bell className="w-4 h-4" />
              <span>Centro de Notificaciones y Alertas Automáticas (Gmail API Functional)</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Generador de Notificaciones Oficiales UPTC
            </h2>
            <p className="text-green-100 text-sm mt-1">
              Generación y envío automático de comunicaciones oficiales para responsables con pendientes activos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-emerald-800/80 text-yellow-300 border border-yellow-400/30 px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs">
              <UserCheck className="w-4 h-4 text-yellow-400" />
              <span>{responsablesList.length} Responsables Activos</span>
            </span>
          </div>
        </div>
      </div>

      {authError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl font-bold text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {sentSuccessMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl font-bold text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{sentSuccessMsg}</span>
        </div>
      )}

      {/* Responsables Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-amber-600" />
          <span className="text-xs font-bold text-slate-800 uppercase">Filtrar Notificación por Responsable:</span>
        </div>

        <select
          value={selectedResponsable}
          onChange={(e) => setSelectedSelectedResponsable(e.target.value)}
          className="w-full sm:w-72 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
        >
          <option value="TODOS">Todos los Responsables ({responsablesList.length})</option>
          {responsablesList.map((r) => {
            const count = activePendingItems.filter(i => i.responsable === r).length;
            return (
              <option key={r} value={r}>
                {r} ({count} pendientes)
              </option>
            );
          })}
        </select>
      </div>

      {/* Main Grid: Individual Digest Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {responsablesList
          .filter(r => selectedResponsable === 'TODOS' || selectedResponsable === r)
          .map((responsableName) => {
            const respItems = activePendingItems.filter(i => i.responsable === responsableName);
            const highPriorityCount = respItems.filter(i => i.prioridad === 'ALTA').length;

            return (
              <div
                key={responsableName}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b-2 border-amber-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-base shadow-inner">
                        {responsableName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white">{responsableName}</h3>
                        <p className="text-[11px] text-amber-400 font-medium">
                          {respItems.length} actividad(es) pendiente(s) asignada(s)
                        </p>
                      </div>
                    </div>

                    {highPriorityCount > 0 && (
                      <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {highPriorityCount} Alta Prioridad
                      </span>
                    )}
                  </div>

                  {/* Tasks Preview List */}
                  <div className="p-4 divide-y divide-slate-100 space-y-3">
                    {respItems.map((item) => (
                      <div key={item.id} className="pt-3 first:pt-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs leading-snug">
                            {item.tarea}
                          </span>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.prioridad === 'ALTA' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {item.prioridad}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-medium">
                          <span>🏛️ {item.lineaCrea}</span>
                          <span>📋 {item.procesoSig}</span>
                          <span className="font-mono text-slate-700">📅 {item.fechaEstimada || item.temporalidad}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    onClick={() => handleCopyDigest(responsableName)}
                    className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === responsableName ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleSendRealGmailToResponsable(responsableName)}
                    disabled={sendingState[responsableName]}
                    className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 border border-yellow-300 active:scale-95"
                  >
                    <Send className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>{sendingState[responsableName] ? 'Procesando...' : '✉️ Enviar Notificación por Correo'}</span>
                  </button>
                </div>

              </div>
            );
          })}
      </div>

    </div>
  );
};
