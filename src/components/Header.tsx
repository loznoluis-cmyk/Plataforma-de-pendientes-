import React, { useRef } from 'react';
import { Upload, Plus, FileSpreadsheet, Bell, AlertTriangle, LayoutDashboard, ListCheck, ShieldCheck, RefreshCw, Copy, Layers, Bot, Sparkles, User, Shield, Users, LogOut, KeyRound, Lock, Mail, Settings, Cloud, Download, FolderUp, CheckCircle, Trash2 } from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'table' | 'notifications' | 'bottlenecks' | 'duplicates' | 'chat';
  setActiveTab: (tab: 'dashboard' | 'table' | 'notifications' | 'bottlenecks' | 'duplicates' | 'chat') => void;
  onOpenUpload: () => void;
  onOpenCreate: () => void;
  onExport: () => void;
  notificationCount: number;
  duplicateCount: number;
  totalPendientes: number;
  openPendientes: number;
  onResetData?: () => void;
  onClearAllData?: () => void;
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
  onOpenUserManagement: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  cloudSyncStatus?: 'synced' | 'saving' | 'offline' | 'error';
  onForceSyncCloud?: () => void;
  onForcePullCloud?: () => void;
  onExportBackupJson?: () => void;
  onImportBackupJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  onOpenCreate,
  onExport,
  notificationCount,
  duplicateCount,
  totalPendientes,
  openPendientes,
  onResetData,
  onClearAllData,
  currentUser,
  onOpenLogin,
  onOpenUserManagement,
  onOpenProfile,
  onLogout,
  cloudSyncStatus = 'synced',
  onForceSyncCloud,
  onForcePullCloud,
  onExportBackupJson,
  onImportBackupJson
}) => {
  const isAdmin = currentUser?.rol === 'ADMIN';
  const emailNotifEnabled = currentUser?.notificacionesEmail?.enabled ?? false;
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-40 bg-[#121214]/90 backdrop-blur-2xl border-b border-white/10 text-white shadow-xl transition-all">
      {/* Top Banner with Institutional Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo and Institution Title */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="h-11 w-11 bg-gradient-to-br from-yellow-200/90 via-yellow-300/80 to-amber-400/70 text-slate-950 rounded-2xl flex items-center justify-center font-black text-lg shadow-[0_0_20px_rgba(250,204,21,0.25)] border border-yellow-200/50 shrink-0 backdrop-blur-md">
              <span className="tracking-tight">UPTC</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline font-normal tracking-tight">Universidad Pedagógica y Tecnológica de Colombia</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Gestión de Pendientes
                <span className="text-yellow-300/80 font-normal text-xs hidden lg:inline tracking-normal">| Vicerrectoría Académica</span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics Badge & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Cloud Sync Status Indicator Badge & Manual Cloud Controls */}
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : cloudSyncStatus === 'saving'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
                title={
                  cloudSyncStatus === 'synced'
                    ? '🟢 Verde = Nube Activa y Sincronizada: Todos los registros están guardados en la nube Firebase.'
                    : cloudSyncStatus === 'saving'
                    ? '🟡 Amarillo = Guardando / Subiendo cambios a la nube Firebase...'
                    : '🔴 Rojo = Modo Local / Error de Red: Presiona "Sincronizar a Nube" para reintentar.'
                }
              >
                <Cloud className={`w-3.5 h-3.5 ${cloudSyncStatus === 'saving' ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">
                  {cloudSyncStatus === 'synced' && 'Nube Activa'}
                  {cloudSyncStatus === 'saving' && 'Guardando Nube...'}
                  {(cloudSyncStatus === 'offline' || cloudSyncStatus === 'error') && 'Modo Local'}
                </span>
                <span className={`h-2 w-2 rounded-full ${
                  cloudSyncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : cloudSyncStatus === 'saving' ? 'bg-amber-400' : 'bg-rose-400'
                }`}></span>
              </div>

              {/* Manual Sync Cloud Push Button */}
              {onForceSyncCloud && (
                <button
                  onClick={onForceSyncCloud}
                  className="flex items-center gap-1 bg-yellow-300/15 hover:bg-yellow-300/25 text-yellow-300 border border-yellow-300/40 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Subir y guardar todos los registros actuales directamente a la Base de Datos Firebase en la Nube"
                >
                  <Cloud className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="hidden md:inline">Guardar en Nube</span>
                </button>
              )}

              {/* Manual Sync Cloud Pull Button */}
              {onForcePullCloud && (
                <button
                  onClick={onForcePullCloud}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 px-2 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Recargar y descargar los últimos datos almacenados en la Nube Firebase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${cloudSyncStatus === 'saving' ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline">Cargar de Nube</span>
                </button>
              )}

              {/* Vaciar / Dejar en 0 Button */}
              {onClearAllData && (
                <button
                  onClick={onClearAllData}
                  className="flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Vaciar toda la matriz y dejar la plataforma completamente limpia EN CEROS (0 pendientes)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  <span className="hidden xl:inline">Vaciar a 0</span>
                </button>
              )}
            </div>

            {/* Auth Profile Widget */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1.5 rounded-2xl text-xs backdrop-blur-xl shadow-inner">
                <div className="flex items-center gap-2 px-2 py-0.5">
                  <div className={`p-1 rounded-xl ${isAdmin ? 'bg-yellow-300/80 text-slate-950 border border-yellow-200' : 'bg-white/10 text-slate-200'}`}>
                    <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white leading-none tracking-tight">{currentUser.nombre}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isAdmin ? 'bg-yellow-300/90 text-slate-950' : 'bg-white/10 text-slate-300'}`}>
                        {isAdmin ? 'ADMINISTRADOR' : 'LECTOR'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight tracking-normal">{currentUser.username}</span>
                  </div>
                </div>

                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 p-1.5 hover:bg-white/10 text-yellow-300 rounded-xl transition-all cursor-pointer relative"
                  title="Perfil y Notificaciones por Correo Electrónico"
                >
                  <Mail className="w-4 h-4 text-yellow-300" />
                  {emailNotifEnabled && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 absolute top-1 right-1 ring-2 ring-[#121214] animate-pulse"></span>
                  )}
                </button>

                {isAdmin && (
                  <button
                    onClick={onOpenUserManagement}
                    className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Gestionar Usuarios y Accesos"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="p-1.5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                  title="Cerrar Sesión de Seguridad"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 bg-yellow-300/10 hover:bg-yellow-300/20 text-yellow-300 border border-yellow-300/30 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer backdrop-blur-md shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-yellow-300" />
                <span>Ingreso Administrador</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-3 bg-white/5 px-3 py-2 rounded-2xl border border-white/10 text-xs font-medium backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse"></span>
                <span className="text-slate-400">Pendientes:</span>
                <strong className="text-yellow-300 font-bold">{openPendientes}</strong>
                <span className="text-slate-500">/ {totalPendientes}</span>
              </div>
            </div>

            {/* Backup JSON Actions */}
            {onExportBackupJson && (
              <button
                onClick={onExportBackupJson}
                className="p-2 text-slate-300 hover:text-yellow-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all cursor-pointer backdrop-blur-md"
                title="Descargar copia de seguridad completa (.json)"
              >
                <Download className="w-3.5 h-3.5 text-yellow-300" />
              </button>
            )}

            {onImportBackupJson && (
              <>
                <input
                  type="file"
                  ref={jsonFileInputRef}
                  onChange={onImportBackupJson}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="p-2 text-slate-300 hover:text-yellow-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all cursor-pointer backdrop-blur-md"
                  title="Restaurar copia de seguridad desde archivo (.json)"
                >
                  <FolderUp className="w-3.5 h-3.5 text-yellow-300" />
                </button>
              </>
            )}

            <button
              id="btn-cargar-excel"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer backdrop-blur-md"
              title="Subir archivo Excel (.xlsx) o CSV"
            >
              <Upload className="w-3.5 h-3.5 text-yellow-300" />
              <span className="hidden sm:inline">Cargar Excel</span>
            </button>

            <button
              id="btn-exportar-excel"
              onClick={onExport}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer backdrop-blur-md"
              title="Exportar pendientes filtrados a Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-300" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              id="btn-crear-pendiente"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-300/90 to-amber-300/90 hover:from-yellow-200 hover:to-amber-200 text-slate-950 px-4 py-2 rounded-2xl text-xs font-bold shadow-[0_4px_15px_rgba(250,204,21,0.2)] border border-yellow-200/50 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Nuevo Pendiente</span>
            </button>

            {onResetData && (
              <button
                onClick={onResetData}
                className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all cursor-pointer backdrop-blur-md"
                title="Restablecer datos originales del PDF UPTC"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs - Apple Segmented Glass Bar Style */}
      <div className="bg-black/20 border-t border-white/10 py-1.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto p-1 bg-black/40 rounded-2xl border border-white/10 max-w-max scrollbar-none shadow-inner" aria-label="Navegación principal">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-yellow-300/90 text-slate-950 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-bold border border-yellow-200/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="tab-table"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-yellow-300/90 text-slate-950 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-bold border border-yellow-200/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListCheck className="w-3.5 h-3.5" />
              <span>Lista de Tareas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'table' ? 'bg-slate-950 text-yellow-300 font-bold' : 'bg-white/15 text-slate-300'
              }`}>
                {totalPendientes}
              </span>
            </button>

            <button
              id="tab-notifications"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap relative cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-yellow-300/90 text-slate-950 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-bold border border-yellow-200/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notificaciones</span>
              {notificationCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>

            <button
              id="tab-bottlenecks"
              onClick={() => setActiveTab('bottlenecks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'bottlenecks'
                  ? 'bg-yellow-300/90 text-slate-950 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-bold border border-yellow-200/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cuellos de Botella</span>
            </button>

            <button
              id="tab-duplicates"
              onClick={() => setActiveTab('duplicates')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'duplicates'
                  ? 'bg-yellow-300/90 text-slate-950 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-bold border border-yellow-200/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicados</span>
              {duplicateCount !== undefined && duplicateCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'duplicates' ? 'bg-slate-950 text-yellow-300 font-bold' : 'bg-white/15 text-yellow-300'
                }`}>
                  {duplicateCount}
                </span>
              )}
            </button>

            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-yellow-300/90 text-slate-950 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-bold border border-yellow-200/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Asistente IA</span>
              <span className="px-1.5 py-0.2 bg-white/10 border border-yellow-300/30 text-yellow-300 rounded-full text-[9px] font-black uppercase">
                Chatbot
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
