import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount, EmailNotificationSettings, PendienteItem } from '../types';
import { User, Mail, Bell, Shield, Calendar, AlertTriangle, Send, CheckCircle2, X, Clock, Sparkles, Building, Settings, Check, ExternalLink, LogIn, CheckCircle } from 'lucide-react';
import { loginWithGoogleForGmail, subscribeGoogleAuth, sendRealGmail, logoutGoogle } from '../lib/gmailService';
import { User as FirebaseUser } from 'firebase/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  items: PendienteItem[];
  onUpdateProfile: (updatedUser: UserAccount) => void;
  showToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  items,
  onUpdateProfile,
  showToast
}) => {
  if (!isOpen || !currentUser) return null;

  // Initial Email Settings State
  const initialSettings: EmailNotificationSettings = currentUser.notificacionesEmail || {
    enabled: true,
    diasAnticipacion: 7,
    prioridadFiltro: 'SOLO_ALTA',
    soloMisPendientes: false
  };

  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [diasAnticipacion, setDiasAnticipacion] = useState(initialSettings.diasAnticipacion);
  const [prioridadFiltro, setPrioridadFiltro] = useState<'SOLO_ALTA' | 'TODAS'>(initialSettings.prioridadFiltro);
  const [soloMisPendientes, setSoloMisPendientes] = useState(initialSettings.soloMisPendientes);

  // Profile Edit State
  const [nombre, setNombre] = useState(currentUser.nombre);
  const [email, setEmail] = useState(currentUser.email);
  const [cargo, setCargo] = useState(currentUser.cargo || '');
  const [dependencia, setDependencia] = useState(currentUser.dependencia || '');

  // Google Auth & Real Gmail Sending State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sendingRealEmail, setSendingRealEmail] = useState(false);
  const [lastSentResult, setLastSentResult] = useState<{ messageId: string; time: string } | null>(null);
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
      showToast(`Cuenta de Google conectada: ${res.user.email}`);
    } catch (err: any) {
      console.error('Error conectando con Google:', err);
      setAuthError(err.message || 'Error al autorizar la cuenta de Google con alcance Gmail.');
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleToken(null);
    showToast('Cuenta de Google desconectada.');
  };

  const handleSendRealGmailNotification = async () => {
    if (!email) {
      alert('Por favor ingrese una dirección de correo electrónico válida.');
      return;
    }

    if (!googleToken) {
      try {
        const res = await loginWithGoogleForGmail();
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        // Continue to send with retrieved token
        executeRealSend(res.accessToken);
      } catch (err: any) {
        setAuthError(err.message || 'Se requiere autenticar con Google para enviar el correo real.');
      }
      return;
    }

    executeRealSend(googleToken);
  };

  const executeRealSend = async (tokenToUse: string) => {
    setSendingRealEmail(true);
    setAuthError(null);

    const subject = `[ALERTA SIG UPTC] ${matchingAlertItems.length} Pendientes Institucionales Próximos a Vencer`;
    
    const itemsListHtml = matchingAlertItems.length > 0 
      ? matchingAlertItems.map(item => `
          <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-family: monospace; font-weight: bold; background: #0f172a; color: #facc15; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${item.id}</span>
              <span style="font-weight: bold; color: ${item.prioridad === 'ALTA' ? '#dc2626' : '#d97706'}; font-size: 11px;">PRIORIDAD ${item.prioridad}</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #0f172a;">${item.tarea}</h4>
            <p style="margin: 0; font-size: 11px; color: #475569;">
              <strong>Proceso SIG:</strong> ${item.procesoSig} | <strong>Responsable:</strong> ${item.responsable}<br>
              <strong>Entregable:</strong> ${item.entregable || 'Ver matriz'}<br>
              <strong style="color: #dc2626;">Vencimiento:</strong> ${item.fechaEstimada || item.temporalidad || 'Sin fecha'}
            </p>
          </div>
        `).join('')
      : '<p style="font-size: 12px; color: #64748b;">No hay tareas que requieran atención urgente en este momento.</p>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #121214; color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #facc15;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #ffffff;">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #facc15;">Vicerrectoría Académica • Sistema Integrado de Gestión UPTC</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.6;">
          <p style="margin-top: 0;">Estimado(a) <strong>${nombre}</strong> (${cargo || 'Funcionario UPTC'}),</p>
          <p>Le remitimos el reporte oficial de seguimiento a tareas y pendientes de la Vicerrectoría Académica. Según la configuración del sistema, existen <strong style="color: #dc2626;">${matchingAlertItems.length} actividad(es)</strong> próximas a su fecha límite:</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0;">
            ${itemsListHtml}
          </div>

          <p style="font-size: 12px; color: #475569;">📌 Para gestionar estos ítems, adjuntar evidencias de cumplimiento o actualizar el estado de avance, ingrese a la plataforma institucional de seguimiento SIG-UPTC.</p>
          
          <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            Universidad Pedagógica y Tecnológica de Colombia — Vicerrectoría Académica<br>
            Mensaje generado automáticamente mediante la API Oficial de Gmail para el SIG UPTC.
          </div>
        </div>
      </div>
    `;

    try {
      const res = await sendRealGmail({
        toEmail: email,
        subject,
        htmlContent,
        accessToken: tokenToUse
      });

      const nowStr = new Date().toLocaleString('es-CO');
      setLastSentResult({ messageId: res.id, time: nowStr });
      setSendingRealEmail(false);
      showToast(`¡Correo REAL enviado exitosamente a ${email} vía Gmail API!`);

      // Update last send timestamp
      const updatedUser: UserAccount = {
        ...currentUser,
        notificacionesEmail: {
          enabled,
          diasAnticipacion,
          prioridadFiltro,
          soloMisPendientes,
          ultimoEnvioSimulado: `Real: ${nowStr} (ID: ${res.id})`
        }
      };
      onUpdateProfile(updatedUser);
    } catch (err: any) {
      console.error('Error enviando correo real con Gmail API:', err);
      setSendingRealEmail(false);
      setAuthError(err.message || 'Error al enviar el correo con la API de Gmail. Verifica tus permisos de Google.');
    }
  };

  // Preview Email Modal State
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate matching items based on settings
  const matchingAlertItems = useMemo(() => {
    const now = new Date();
    
    return items.filter((item) => {
      // Must not be closed
      if (item.estado === 'CERRADO') return false;

      // Filter by Priority
      if (prioridadFiltro === 'SOLO_ALTA' && item.prioridad !== 'ALTA') {
        return false;
      }

      // Filter by Responsable if enabled
      if (soloMisPendientes) {
        const userTerm = currentUser.nombre.toLowerCase();
        const usernameTerm = currentUser.username.toLowerCase();
        const resp = (item.responsable || '').toLowerCase();
        const apoyo = (item.personalApoyo || '').toLowerCase();
        if (!resp.includes(userTerm) && !resp.includes(usernameTerm) && !apoyo.includes(userTerm)) {
          return false;
        }
      }

      // Check deadline proximity
      if (!item.fechaEstimada) return false;
      const targetDate = new Date(item.fechaEstimada);
      if (isNaN(targetDate.getTime())) return false;

      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Items due within configured threshold or already overdue
      return diffDays <= diasAnticipacion;
    });
  }, [items, diasAnticipacion, prioridadFiltro, soloMisPendientes, currentUser]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updatedUser: UserAccount = {
      ...currentUser,
      nombre: nombre.trim() || currentUser.nombre,
      email: email.trim() || currentUser.email,
      cargo: cargo.trim(),
      dependencia: dependencia.trim(),
      notificacionesEmail: {
        enabled,
        diasAnticipacion,
        prioridadFiltro,
        soloMisPendientes,
        ultimoEnvioSimulado: currentUser.notificacionesEmail?.ultimoEnvioSimulado
      }
    };

    onUpdateProfile(updatedUser);
    setTimeout(() => {
      setSaving(false);
      showToast('Preferencia de notificaciones por correo actualizada correctamente.');
      onClose();
    }, 400);
  };

  const handleSimulateEmailSend = () => {
    const timestamp = new Date().toLocaleString();
    const updatedUser: UserAccount = {
      ...currentUser,
      notificacionesEmail: {
        enabled,
        diasAnticipacion,
        prioridadFiltro,
        soloMisPendientes,
        ultimoEnvioSimulado: timestamp
      }
    };
    onUpdateProfile(updatedUser);
    setShowEmailPreview(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400/20 text-yellow-400 rounded-lg border border-yellow-400/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Perfil de Usuario UPTC</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${currentUser.rol === 'ADMIN' ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                  {currentUser.rol}
                </span>
              </div>
              <p className="text-xs text-slate-300">Configuración de cuenta y notificaciones por correo electrónico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveSettings} className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
          
          {/* User Account Details Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-800 font-bold">
              <Settings className="w-4 h-4 text-yellow-600" />
              <span>Información del Funcionario</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-yellow-500 outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Correo Electrónico Notificaciones:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-yellow-500 outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cargo / Responsabilidad:</label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ej: Coordinador SIG"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-yellow-500 outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Dependencia UPTC:</label>
                <input
                  type="text"
                  value={dependencia}
                  onChange={(e) => setDependencia(e.target.value)}
                  placeholder="Vicerrectoría Académica"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-yellow-500 outline-none text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Email Notifications Configuration Section */}
          <div className="border-2 border-yellow-500/30 rounded-xl p-4 bg-gradient-to-br from-yellow-50/50 via-white to-slate-50 space-y-4">
            
            <div className="flex items-center justify-between border-b border-yellow-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-yellow-400 text-slate-950 rounded-lg shadow-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Alertas por Correo Electrónico para Pendientes Críticos</h4>
                  <p className="text-[11px] text-slate-600">
                    Notificaciones automáticas para tareas de <strong>Prioridad ALTA</strong> próximas a vencer.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            {enabled ? (
              <div className="space-y-4 pt-1">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Days threshold select */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-yellow-600" />
                      <span>Anticipación de la Alerta:</span>
                    </label>
                    <select
                      value={diasAnticipacion}
                      onChange={(e) => setDiasAnticipacion(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-yellow-500 outline-none"
                    >
                      <option value={3}>3 Días antes del vencimiento (Urgente)</option>
                      <option value={5}>5 Días antes del vencimiento</option>
                      <option value={7}>7 Días (1 Semana de anticipación)</option>
                      <option value={10}>10 Días de anticipación</option>
                      <option value={15}>15 Días (2 Semanas de anticipación)</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Filtro de Prioridad de Tarea:</span>
                    </label>
                    <select
                      value={prioridadFiltro}
                      onChange={(e) => setPrioridadFiltro(e.target.value as 'SOLO_ALTA' | 'TODAS')}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-yellow-500 outline-none"
                    >
                      <option value="SOLO_ALTA">🔴 Exclusivamente Prioridad ALTA</option>
                      <option value="TODAS">🟡 Todas las prioridades (Alta, Media, Baja)</option>
                    </select>
                  </div>
                </div>

                {/* Specific Responsable Toggle */}
                <label className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={soloMisPendientes}
                    onChange={(e) => setSoloMisPendientes(e.target.checked)}
                    className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-400 border-slate-300"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Filtrar solo si figuro como Responsable o Personal de Apoyo
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Coincidirá si el nombre "{currentUser.nombre}" o usuario "{currentUser.username}" aparece en la tarea.
                    </span>
                  </div>
                </label>

                {/* Google Auth Connection Badge & Controls */}
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 border border-slate-800">
                  
                  {/* Connection Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-400/20 text-yellow-300 rounded-lg shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Servicio de Envío Real vía Gmail API</span>
                          {googleUser ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              Conectado
                            </span>
                          ) : (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                              Sin conectar
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {googleUser 
                            ? `Cuenta vinculada: ${googleUser.email}` 
                            : 'Conecte su cuenta de Google para enviar correos oficiales directamente a su bandeja de entrada.'}
                        </p>
                      </div>
                    </div>

                    {!googleUser ? (
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 border border-slate-300 shadow-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Conectar con Google</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDisconnectGoogle}
                        className="text-slate-400 hover:text-rose-300 text-[11px] font-semibold underline cursor-pointer shrink-0"
                      >
                        Desconectar
                      </button>
                    )}
                  </div>

                  {/* Auth Error Banner */}
                  {authError && (
                    <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-lg text-[11px] font-medium">
                      ⚠️ {authError}
                    </div>
                  )}

                  {/* Sent Confirmation Banner */}
                  {lastSentResult && (
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-lg text-[11px] font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Correo real enviado exitosamente a <strong>{email}</strong>
                      </span>
                      <span className="font-mono text-[10px] text-slate-300">ID: {lastSentResult.messageId.substring(0, 8)}...</span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div>
                      <span className="text-xs font-bold text-yellow-300 block">
                        {matchingAlertItems.length} Pendiente(s) requieren notificación
                      </span>
                      <span className="text-[10px] text-slate-300">
                        Destinatario oficial: <strong>{email}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={handleSimulateEmailSend}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition-all cursor-pointer"
                      >
                        Vista Previa HTML
                      </button>

                      <button
                        type="button"
                        onClick={handleSendRealGmailNotification}
                        disabled={sendingRealEmail}
                        className="px-4 py-2 bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-950" />
                        <span>{sendingRealEmail ? 'Enviando con Gmail...' : '✉️ Enviar Correo REAL'}</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Las notificaciones por correo electrónico se encuentran desactivadas actualmente para este perfil.</span>
              </div>
            )}

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{saving ? 'Guardando...' : 'Guardar Preferencias'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Simulated Email Preview Modal */}
      {showEmailPreview && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
            
            {/* Email Client Top Bar */}
            <div className="bg-slate-900 text-slate-200 px-6 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold font-mono">Simulador de Correo Institucional UPTC</span>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                Cerrar Vista Previa [X]
              </button>
            </div>

            {/* Email Header Metadata */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-1.5 text-xs font-sans">
              <div>
                <span className="font-bold text-slate-500">De:</span>{' '}
                <span className="font-semibold text-slate-800">notificaciones.sig@uptc.edu.co</span> (Sistema Integrado de Gestión UPTC)
              </div>
              <div>
                <span className="font-bold text-slate-500">Para:</span>{' '}
                <span className="font-semibold text-slate-800">{email}</span> ({nombre})
              </div>
              <div>
                <span className="font-bold text-slate-500">Asunto:</span>{' '}
                <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  [ALERTA URGENTE SIG UPTC] {matchingAlertItems.length} Pendiente(s) de Prioridad ALTA próximos a vencer
                </span>
              </div>
            </div>

            {/* Email Body HTML Representation */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 font-sans text-xs text-slate-800 bg-white">
              <div className="border-b-2 border-yellow-500 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-950 text-yellow-400 font-black px-2.5 py-1 rounded text-sm tracking-wider">
                    UPTC
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm leading-tight">Universidad Pedagógica y Tecnológica de Colombia</h4>
                    <p className="text-[10px] text-slate-500">Vicerrectoría Académica • Sistema Integrado de Gestión</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-700">
                Estimado(a) <strong>{nombre}</strong> ({cargo || 'Funcionario UPTC'}),
              </p>

              <p className="text-xs leading-relaxed text-slate-700">
                Le informamos que de acuerdo con su configuración de notificaciones institucionales, existen{' '}
                <strong className="text-rose-700">{matchingAlertItems.length} tarea(s) pendientes de Prioridad ALTA</strong>{' '}
                con fecha de entrega dentro del umbral de <strong>{diasAnticipacion} días</strong> de anticipación:
              </p>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 bg-slate-50">
                {matchingAlertItems.length > 0 ? (
                  matchingAlertItems.map((item) => (
                    <div key={item.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] bg-slate-900 text-yellow-400 px-1.5 py-0.5 rounded font-bold">
                          {item.id}
                        </span>
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          🔴 PRIORIDAD ALTA
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-900 text-xs">{item.tarea}</h5>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                        <span><strong>Proceso:</strong> {item.procesoSig}</span>
                        <span><strong>Responsable:</strong> {item.responsable}</span>
                        <span className="text-rose-700 font-bold">
                          <strong>Vencimiento:</strong> {item.fechaEstimada || 'Sin fecha'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 font-medium">
                    No existen pendientes de prioridad ALTA que venzan en los próximos {diasAnticipacion} días.
                  </div>
                )}
              </div>

              <div className="bg-slate-100 p-3 rounded-xl text-[11px] text-slate-600 border border-slate-200">
                📌 Para realizar la actualización de avances, adjuntar evidencia o modificar el estado de estas tareas, ingrese a la plataforma web del Sistema Integrado de Gestión UPTC.
              </div>

              <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 flex justify-between">
                <span>Mensaje generado automáticamente por el SIG UPTC.</span>
                <span>Vicerrectoría Académica</span>
              </div>
            </div>

            {/* Email Preview Footer */}
            <div className="bg-slate-100 px-6 py-3 flex items-center justify-between border-t border-slate-200">
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Simulación de envío realizada exitosamente a {email}
              </span>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="px-4 py-1.5 bg-slate-900 text-yellow-400 hover:bg-slate-800 font-bold rounded-lg text-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
