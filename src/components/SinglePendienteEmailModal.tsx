import React, { useState, useEffect } from 'react';
import { PendienteItem } from '../types';
import { Mail, Send, X, CheckCircle2, AlertTriangle, FileText, User, Sparkles, Building, Calendar, Check, ExternalLink, ShieldCheck, ExternalLink as ExternalLinkIcon, Smartphone } from 'lucide-react';
import { loginWithGoogleForGmail, subscribeGoogleAuth, sendRealGmail, logoutGoogle, getGmailWebComposeUrl, getMailtoUrl } from '../lib/gmailService';
import { User as FirebaseUser } from 'firebase/auth';

interface SinglePendienteEmailModalProps {
  isOpen: boolean;
  item: PendienteItem | null;
  onClose: () => void;
  currentUserEmail?: string;
}

export const SinglePendienteEmailModal: React.FC<SinglePendienteEmailModalProps> = ({
  isOpen,
  item,
  onClose,
  currentUserEmail
}) => {
  if (!isOpen || !item) return null;

  // Google OAuth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState<{ messageId: string; time: string; recipient: string } | null>(null);

  // Form Fields
  const defaultRecipient = currentUserEmail || 'luisalberto.lozano@uptc.edu.co';
  const [recipientEmail, setRecipientEmail] = useState<string>(defaultRecipient);
  const [customSubject, setCustomSubject] = useState<string>(
    `[SOLICITUD ESTADO PENDIENTE UPTC] ${item.id} - ${item.tarea.substring(0, 60)}...`
  );
  const [customMessage, setCustomMessage] = useState<string>(
    `Estimado(a) ${item.responsable},\n\nCon el propósito de realizar el seguimiento institucional a las tareas y compromisos de la Vicerrectoría Académica dentro del Sistema Integrado de Gestión (SIG UPTC), me dirijo a usted para solicitar un informe del estado de avance actual, las acciones ejecutadas hasta la fecha y los próximos requerimientos de la siguiente actividad:`
  );

  const [copied, setCopied] = useState(false);

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
      const errMsg = err.message || '';
      if (errMsg.includes('400') || errMsg.includes('popup') || errMsg.includes('closed') || errMsg.includes('formato')) {
        setAuthError('Google Workspace restringió la ventana flotante en este dispositivo (Error 400). ¡No te preocupes! Usa los botones "Abrir en App de Correo" o "Gmail Web" para enviar el correo pre-redactado de inmediato.');
      } else {
        setAuthError(errMsg || 'Error al conectar la cuenta de Google con permisos de Gmail.');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('Por favor especifique un correo electrónico de destinatario válido.');
      return;
    }

    let tokenToUse = googleToken;

    if (!tokenToUse) {
      try {
        const res = await loginWithGoogleForGmail();
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        tokenToUse = res.accessToken;
      } catch (err: any) {
        const errMsg = err.message || '';
        if (errMsg.includes('400') || errMsg.includes('popup') || errMsg.includes('closed') || errMsg.includes('formato')) {
          setAuthError('Google Workspace bloqueó la autenticación en ventana flotante (Error 400). Usa los botones directos "Abrir en App de Correo" o "Abrir en Gmail Web" para enviar sin errores.');
        } else {
          setAuthError(errMsg || 'Debe autenticarse con su cuenta institucional de Google para enviar el correo.');
        }
        return;
      }
    }

    setSending(true);
    setAuthError(null);

    const formattedMessageParagraphs = customMessage
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        
        <!-- Header UPTC -->
        <div style="background: #121214; color: #ffffff; padding: 24px; text-align: center; border-bottom: 4px solid #facc15;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: bold; color: #facc15;">Vicerrectoría Académica • Sistema Integrado de Gestión (SIG UPTC)</p>
          <span style="display: inline-block; margin-top: 8px; font-size: 10px; background: rgba(250,204,21,0.15); color: #fde047; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(250,204,21,0.3); font-weight: bold;">COMUNICADO OFICIAL DE SEGUIMIENTO</span>
        </div>

        <div style="padding: 28px; color: #1e293b; font-size: 13px; line-height: 1.6;">
          
          <!-- Custom Message Body -->
          <div style="background: #f8fafc; border-left: 4px solid #facc15; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px; color: #0f172a; font-size: 13.5px;">
            ${formattedMessageParagraphs}
          </div>

          <!-- Ficha Técnica del Pendiente -->
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; background: #ffffff;">
            
            <div style="background: #0f172a; color: #ffffff; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; font-size: 12px; color: #facc15;">
                📋 FICHA TÉCNICA DEL PENDIENTE REGISTRADO
              </span>
              <span style="font-family: monospace; font-size: 12px; font-weight: bold; background: #1e293b; color: #ffffff; padding: 3px 8px; border-radius: 6px; border: 1px solid #334155;">
                CÓDIGO: ${item.id}
              </span>
            </div>

            <div style="padding: 18px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 1px border-dashed #cbd5e1; padding-bottom: 8px;">
                ${item.tarea}
              </h3>

              <div style="margin-bottom: 14px; background: #fffbe2; border: 1px solid #fef08a; padding: 12px; border-radius: 8px;">
                <strong style="color: #854d0e; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px;">DESCRIPCIÓN GENERAL DE LA ACTIVIDAD:</strong>
                <p style="margin: 0; font-size: 12.5px; color: #1e293b; white-space: pre-line;">
                  ${item.descripcionGeneral || item.acciones || 'Sin descripción adicional en la matriz.'}
                </p>
              </div>

              <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 35%;">Responsable Principal:</td>
                  <td style="padding: 6px 0; font-weight: 800; color: #0f172a;">${item.responsable}</td>
                </tr>
                ${item.personalApoyo ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Personal de Apoyo:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #334155;">${item.personalApoyo}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Proceso SIG:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #1e293b;">${item.procesoSig}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Línea Creadora / Fuente:</td>
                  <td style="padding: 6px 0; color: #334155;">${item.lineaCrea} (${item.fuente})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Estado Actual:</td>
                  <td style="padding: 6px 0;">
                    <span style="font-weight: bold; font-size: 11px; padding: 2px 8px; border-radius: 12px; background: ${item.estado === 'CERRADO' ? '#dcfce7; color: #166534;' : item.estado === 'EN_PROCESO' ? '#dbeafe; color: #1e40af;' : '#fef9c3; color: #854d0e;'}">
                      ${item.estado}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Prioridad:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: ${item.prioridad === 'ALTA' ? '#dc2626' : item.prioridad === 'MEDIA' ? '#d97706' : '#166534'};">
                    PRIORIDAD ${item.prioridad}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Fecha / Límite Estimado:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">
                    ${item.temporalidad} ${item.fechaEstimada ? `(${item.fechaEstimada})` : ''}
                  </td>
                </tr>
                ${item.entregable ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Entregable Requerido:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${item.entregable}</td>
                </tr>` : ''}
              </table>

              ${item.observaciones ? `
              <div style="background: #f1f5f9; padding: 10px 12px; border-radius: 8px; font-size: 11.5px; border-left: 3px solid #64748b;">
                <strong style="color: #334155;">Bitácora de Observaciones Registradas:</strong><br>
                <span style="color: #475569;">${item.observaciones}</span>
              </div>` : ''}

            </div>
          </div>

          <!-- Call to Action -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px 18px; border-radius: 10px; color: #1e40af; font-size: 12px; margin-bottom: 20px;">
            📌 <strong>Acción Requerida:</strong> Por favor responda a este correo indicando el estado de avance actual, las acciones ejecutadas y remita o adjunte los soportes o evidencias correspondientes a la Vicerrectoría Académica UPTC.
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
            Universidad Pedagógica y Tecnológica de Colombia — Vicerrectoría Académica<br>
            Mensaje generado e instituido mediante el Sistema de Gestión de Pendientes UPTC.
          </div>

        </div>
      </div>
    `;

    try {
      const res = await sendRealGmail({
        toEmail: recipientEmail,
        subject: customSubject,
        htmlContent,
        accessToken: tokenToUse
      });

      const nowStr = new Date().toLocaleString('es-CO');
      setSentSuccess({
        messageId: res.id,
        time: nowStr,
        recipient: recipientEmail
      });
      setSending(false);
    } catch (err: any) {
      console.error('Error enviando correo con Gmail API:', err);
      setSending(false);
      setAuthError(err.message || 'Error al procesar el envío del correo vía Gmail API.');
    }
  };

  const handleCopyText = () => {
    const textToCopy = `[UPTC VICERRECTORÍA ACADÉMICA] SEGUIMIENTO A PENDIENTE ID: ${item.id}\n` +
      `Tarea: ${item.tarea}\n` +
      `Descripción: ${item.descripcionGeneral || item.acciones || 'N/A'}\n` +
      `Responsable: ${item.responsable}\n` +
      `Estado: ${item.estado} | Prioridad: ${item.prioridad}\n` +
      `Fecha Estimada: ${item.temporalidad}\n\n` +
      `${customMessage}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getPlainTextReport = () => {
    return `UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA
VICERRECTORÍA ACADÉMICA — SISTEMA INTEGRADO DE GESTIÓN (SIG UPTC)

ASUNTO: SEGUIMIENTO PENDIENTE INSTITUCIONAL [ID: ${item.id}]

Estimado(a) ${item.responsable || 'Responsable'}:

Cordial saludo.

${customMessage}

===================================================================
FICHA TÉCNICA DEL PENDIENTE REGISTRADO
===================================================================
• CÓDIGO ID: ${item.id}
• TAREA / COMPROMISO: ${item.tarea}
• DESCRIPCIÓN: ${item.descripcionGeneral || item.acciones || 'Sin descripción adicional'}
• RESPONSABLE PRINCIPAL: ${item.responsable}${item.personalApoyo ? `\n• PERSONAL DE APOYO: ${item.personalApoyo}` : ''}
• PROCESO SIG: ${item.procesoSig}
• LÍNEA CREA / FUENTE: ${item.lineaCrea} (${item.fuente})
• ESTADO ACTUAL: ${item.estado}
• PRIORIDAD: ${item.prioridad}
• FECHA ESTIMADA: ${item.temporalidad} ${item.fechaEstimada ? `(${item.fechaEstimada})` : ''}
• ENTREGABLE ESPERADO: ${item.entregable || 'N/A'}
===================================================================

Solicitamos atentamente responder a este mensaje adjuntando las evidencias o estado de avance correspondiente.

Atentamente,

VICERRECTORÍA ACADÉMICA
Universidad Pedagógica y Tecnológica de Colombia (UPTC)
Tunja, Boyacá, Colombia`;
  };

  const handleOpenNativeMail = () => {
    const body = getPlainTextReport();
    const mailtoUrl = getMailtoUrl(recipientEmail, customSubject, body);
    window.location.href = mailtoUrl;
  };

  const handleOpenInGmailWeb = () => {
    const body = getPlainTextReport();
    const url = getGmailWebComposeUrl(recipientEmail, customSubject, body);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#121214] text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-300/20 rounded-xl text-yellow-300 border border-yellow-300/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-yellow-300/20 text-yellow-300 border border-yellow-300/30 rounded-full uppercase tracking-wider">
                ID: {item.id}
              </span>
              <h3 className="text-base font-extrabold tracking-tight text-white mt-0.5">
                Enviar Notificación / Correo de Seguimiento
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">

          {/* Success Banner */}
          {sentSuccess && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>¡Notificación institucional preparada y abierta!</span>
              </div>
              <p className="text-xs text-emerald-700">
                Correo pre-redactado para <strong>{sentSuccess.recipient}</strong> con la ficha del pendiente <strong>{item.id}</strong>.
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-emerald-800 pt-1 border-t border-emerald-200">
                <span>Estado: Listo en la ventana de correo</span>
                <span>Hora: {sentSuccess.time}</span>
              </div>
            </div>
          )}

          {/* Recipient & Subject Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold text-[11px] mb-1">
                Correo Electrónico Destinatario:
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="ejemplo: vicerrectoria.academica@uptc.edu.co"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Responsable registrado: <strong>{item.responsable}</strong>
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-[11px] mb-1">
                Asunto del Correo:
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
          </div>

          {/* Custom Request Text Editor */}
          <div>
            <label className="block text-slate-800 font-bold text-[11px] mb-1 flex items-center justify-between">
              <span>Mensaje Institucional de Solicitud de Estado:</span>
              <span className="text-[10px] text-slate-400 font-normal">Puede editar el texto del saludo/solicitud</span>
            </label>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 focus:ring-2 focus:ring-yellow-400 outline-none leading-relaxed"
            />
          </div>

          {/* Ficha Preview Summary Card */}
          <div className="border border-amber-200 bg-yellow-50/50 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <span className="font-extrabold text-amber-950 text-xs uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" />
                Resumen de Ficha Adjunta en el Correo
              </span>
              <span className="font-mono text-xs font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">
                ID: {item.id}
              </span>
            </div>
            
            <p className="font-bold text-slate-900 text-xs">{item.tarea}</p>
            <p className="text-[11px] text-slate-700 line-clamp-2 italic">
              "{item.descripcionGeneral || item.acciones || 'Sin descripción detallada'}"
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
              <div><strong className="text-slate-500">Proceso:</strong> <span className="font-bold text-slate-800">{item.procesoSig}</span></div>
              <div><strong className="text-slate-500">Línea:</strong> <span className="font-bold text-slate-800">{item.lineaCrea}</span></div>
              <div><strong className="text-slate-500">Estado:</strong> <span className="font-bold text-amber-900">{item.estado}</span></div>
              <div><strong className="text-slate-500">Fecha:</strong> <span className="font-bold text-slate-800">{item.temporalidad}</span></div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleCopyText}
            type="button"
            className="text-slate-700 hover:text-slate-900 font-semibold text-xs flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">¡Texto Copiado!</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2.5 bg-white border border-slate-300 font-bold text-slate-700 rounded-xl hover:bg-slate-200 text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleSendEmail}
              disabled={sending}
              type="button"
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50 border border-yellow-300"
            >
              <Send className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>{sending ? 'Procesando...' : '✉️ Enviar Correo de Notificación'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
