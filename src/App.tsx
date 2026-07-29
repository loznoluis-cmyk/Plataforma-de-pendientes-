import React, { useState, useEffect, useMemo } from 'react';
import { PendienteItem, FilterState, EstadoPendiente, AdjuntoFile, UserAccount } from './types';
import { INITIAL_PENDIENTES } from './data/initialData';
import { INITIAL_USERS } from './data/initialUsers';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PendientesTable } from './components/PendientesTable';
import { FileUploadModal } from './components/FileUploadModal';
import { PendienteFormModal } from './components/PendienteFormModal';
import { NotificationsView } from './components/NotificationsView';
import { BottlenecksView } from './components/BottlenecksView';
import { DuplicatesView } from './components/DuplicatesView';
import { ChatView } from './components/ChatView';
import { ChatFloatingWidget } from './components/ChatFloatingWidget';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { UserProfileModal } from './components/UserProfileModal';
import { findDuplicatePairs } from './utils/duplicateDetector';
import { exportToExcel } from './utils/exportUtils';
import { CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import {
  subscribePendientesCloud,
  subscribeUsersCloud,
  savePendienteCloud,
  deletePendienteCloud,
  saveAllPendientesCloud,
  saveUserCloud,
  saveAllUsersCloud,
  fetchAllPendientesCloud
} from './lib/firebase';

const LOCAL_STORAGE_KEY = 'uptc_pendientes_v1_data';
const LOCAL_USERS_KEY = 'uptc_usuarios_v1_data';
const LOCAL_SESSION_KEY = 'uptc_session_user';

export default function App() {
  // Cloud Sync Status ('synced' | 'saving' | 'offline' | 'error')
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'error'>('synced');

  // Pendientes Data
  const [items, setItems] = useState<PendienteItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading local storage data:', e);
    }
    return INITIAL_PENDIENTES;
  });

  // Registered Users Data
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
    return INITIAL_USERS;
  });

  // Current Logged-in User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading session user:', e);
    }
    return INITIAL_USERS[0];
  });

  const isAdmin = currentUser?.rol === 'ADMIN';

  // Real-Time Cloud Firestore Sync Subscriptions
  useEffect(() => {
    setCloudSyncStatus('saving');
    
    // Subscribe to cloud pendientes
    const unsubscribePendientes = subscribePendientesCloud(
      (cloudItems) => {
        if (cloudItems) {
          setItems(cloudItems);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudItems));
          } catch (e) {}
        }
        setCloudSyncStatus('synced');
      },
      (error) => {
        console.warn('Firebase sync offline fallback active for pendientes:', error);
        setCloudSyncStatus('offline');
      },
      []
    );

    // Subscribe to cloud users
    const unsubscribeUsers = subscribeUsersCloud(
      (cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsers(cloudUsers);
          try {
            localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(cloudUsers));
          } catch (e) {}
        }
      },
      (error) => {
        console.warn('Firebase sync offline fallback active for users:', error);
      },
      INITIAL_USERS
    );

    return () => {
      unsubscribePendientes();
      unsubscribeUsers();
    };
  }, []);

  // Modal States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'notifications' | 'bottlenecks' | 'duplicates' | 'chat'>('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [targetActionReason, setTargetActionReason] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [editingItem, setEditingItem] = useState<PendienteItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    estado: 'TODOS',
    lineaCrea: 'TODOS',
    responsable: 'TODOS',
    procesoSig: 'TODOS',
    topico: 'TODOS',
    prioridad: 'TODOS',
    temporalidad: 'TODOS'
  });

  // Save items to localStorage as instantaneous local cache
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items:', e);
    }
  }, [items]);

  // Save users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users:', e);
    }
  }, [users]);

  // Save current user session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(LOCAL_SESSION_KEY);
      }
    } catch (e) {
      console.error('Failed to save session user:', e);
    }
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Guard Helper: verifies Admin rights before performing restricted actions
  const requireAdminPermission = (reason: string, action?: () => void) => {
    if (isAdmin) {
      if (action) action();
    } else {
      setTargetActionReason(reason);
      setPendingAction(() => action || null);
      setIsLoginOpen(true);
      showToast('Acción restringida: Se requiere perfil de Administrador.');
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setTargetActionReason(null);
    showToast(`Sesión iniciada como ${user.nombre} (${user.rol})`);
    
    // Execute pending action if authorized
    if (user.rol === 'ADMIN' && pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Sesión cerrada. Ha ingresado en Modo Lectura (Invitado).');
  };

  const handleAddUser = (newUser: UserAccount) => {
    setUsers((prev) => [...prev, newUser]);
    saveUserCloud(newUser).catch((e) => console.warn('Could not sync new user to cloud:', e));
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    saveUserCloud(updatedUser).catch((e) => console.warn('Could not sync updated user to cloud:', e));
    showToast(`Usuario "${updatedUser.nombre}" actualizado.`);
  };

  const handleDeleteUser = (userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    saveAllUsersCloud(updated).catch((e) => console.warn('Could not sync deleted user to cloud:', e));
    showToast('Usuario eliminado del sistema.');
  };

  // Status Change Handler
  const handleStatusChange = async (id: string, newStatus: EstadoPendiente) => {
    let updatedItem: PendienteItem | null = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            estado: newStatus,
            ultimaActualizacion: new Date().toISOString()
          };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      setCloudSyncStatus('saving');
      try {
        await savePendienteCloud(updatedItem);
        setCloudSyncStatus('synced');
        showToast(`Estado actualizado a ${newStatus} en la nube.`);
      } catch (e) {
        setCloudSyncStatus('error');
        showToast(`Estado cambiado localmente. Error al guardar en la nube.`);
      }
    }
  };

  // Save observations and attachments for item
  const handleSaveObservations = async (id: string, newObservaciones: string, updatedAdjuntos?: AdjuntoFile[]) => {
    let updatedItem: PendienteItem | null = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            observaciones: newObservaciones,
            adjuntos: updatedAdjuntos !== undefined ? updatedAdjuntos : item.adjuntos,
            ultimaActualizacion: new Date().toISOString()
          };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      setCloudSyncStatus('saving');
      try {
        await savePendienteCloud(updatedItem);
        setCloudSyncStatus('synced');
        showToast('Observación y adjuntos guardados en la nube.');
      } catch (e) {
        setCloudSyncStatus('error');
        showToast('Guardado localmente. Error al sincronizar con la nube.');
      }
    }
  };

  // Save single item (Create / Edit)
  const handleSaveItem = async (savedItem: PendienteItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === savedItem.id);
      if (exists) {
        return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      } else {
        return [savedItem, ...prev];
      }
    });
    setEditingItem(null);
    setCloudSyncStatus('saving');
    try {
      await savePendienteCloud(savedItem);
      setCloudSyncStatus('synced');
      showToast(editingItem ? 'Pendiente actualizado con éxito en la nube.' : 'Nuevo pendiente registrado en la nube.');
    } catch (e) {
      setCloudSyncStatus('error');
      showToast('Guardado localmente. Error al sincronizar con la nube.');
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este pendiente de la matriz?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setCloudSyncStatus('saving');
      try {
        await deletePendienteCloud(id);
        setCloudSyncStatus('synced');
        showToast('Registro eliminado de la lista y de la nube.');
      } catch (e) {
        setCloudSyncStatus('error');
        showToast('Eliminado en local. Error al sincronizar con la nube.');
      }
    }
  };

  // Import bulk items from file
  const handleImportSuccess = async (newItems: PendienteItem[], mode: 'replace' | 'append') => {
    setCloudSyncStatus('saving');
    try {
      if (mode === 'replace') {
        setItems(newItems);
        showToast(`Subiendo ${newItems.length} registros a la Nube Firebase...`);
        await saveAllPendientesCloud(newItems, true, (current, total) => {
          showToast(`Guardando en Nube Firebase: ${current} de ${total} pendientes...`);
        });
        showToast(`Matriz reemplazada con ${newItems.length} registros sincronizados en la nube.`);
      } else {
        const combined = [...newItems, ...items];
        setItems(combined);
        showToast(`Subiendo ${newItems.length} nuevos registros a la Nube Firebase...`);
        await saveAllPendientesCloud(combined, false, (current, total) => {
          showToast(`Guardando en Nube Firebase: ${current} de ${total} pendientes...`);
        });
        showToast(`Se anexaron ${newItems.length} nuevos pendientes a la nube.`);
      }
      setCloudSyncStatus('synced');
    } catch (e: any) {
      console.error('Error sincronizando archivo Excel con la nube Firebase:', e);
      setCloudSyncStatus('error');
      showToast(`Cargado localmente. Error al guardar en la nube: ${e?.message || String(e)}`);
    }
    setActiveTab('table');
  };

  // Reset to initial dataset
  const handleResetData = () => {
    requireAdminPermission('Para restablecer la matriz de pendientes debe ingresar como Administrador.', async () => {
      if (window.confirm('¿Desea restablecer la lista de pendientes con la versión original del documento UPTC?')) {
        setItems(INITIAL_PENDIENTES);
        setCloudSyncStatus('saving');
        try {
          await saveAllPendientesCloud(INITIAL_PENDIENTES, true);
          setCloudSyncStatus('synced');
          showToast('Datos originales de la UPTC restablecidos en la nube.');
        } catch (e) {
          setCloudSyncStatus('error');
          showToast('Restablecido localmente. Error en la nube.');
        }
      }
    });
  };

  // Clear all data (Leave at 0 pendientes)
  const handleClearAllData = () => {
    requireAdminPermission('Para vaciar la matriz de pendientes debe ingresar como Administrador.', async () => {
      if (window.confirm('¿Está seguro de que desea vaciar la matriz y dejarla COMPLETAMENTE EN CEROS (0 pendientes)? Todos los registros actuales se eliminarán tanto localmente como de la nube Firebase.')) {
        setItems([]);
        setCloudSyncStatus('saving');
        try {
          await saveAllPendientesCloud([], true);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setCloudSyncStatus('synced');
          showToast('¡Matriz vaciada con éxito! La plataforma está ahora en CEROS (0 pendientes).');
        } catch (e: any) {
          setCloudSyncStatus('error');
          showToast(`Vaciado localmente. Error en la nube: ${e?.message || String(e)}`);
        }
      }
    });
  };

  // Force manual cloud push (saves all current local items to cloud)
  const handleForceSyncCloud = async () => {
    setCloudSyncStatus('saving');
    try {
      showToast(`Iniciando guardado de ${items.length} pendientes en la Nube Firebase...`);
      await saveAllPendientesCloud(items, true, (current, total) => {
        showToast(`Sincronizando en Nube Firebase: ${current} de ${total} pendientes...`);
      });
      setCloudSyncStatus('synced');
      showToast(`¡Éxito! ${items.length} pendientes guardados y protegidos en la Nube Firebase.`);
    } catch (e: any) {
      console.error('Error al guardar en la nube:', e);
      setCloudSyncStatus('error');
      showToast(`Error al guardar en la nube: ${e?.message || String(e)}`);
    }
  };

  // Force manual cloud pull (downloads latest data from cloud)
  const handleForcePullCloud = async () => {
    setCloudSyncStatus('saving');
    try {
      showToast('Descargando pendientes desde la nube Firebase...');
      const cloudItems = await fetchAllPendientesCloud();
      if (cloudItems && cloudItems.length > 0) {
        setItems(cloudItems);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudItems));
        setCloudSyncStatus('synced');
        showToast(`¡Sincronizado! Se descargaron ${cloudItems.length} pendientes desde la Nube.`);
      } else {
        setCloudSyncStatus('synced');
        showToast('No se encontraron registros en la nube para descargar.');
      }
    } catch (e: any) {
      console.error('Error al descargar de la nube:', e);
      setCloudSyncStatus('error');
      showToast(`Error al cargar datos de la nube: ${e?.message || String(e)}`);
    }
  };

  // Export Database Backup JSON
  const handleExportBackupJson = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      app: 'UPTC-Gestion-Pendientes',
      totalPendientes: items.length,
      totalUsuarios: users.length,
      pendientes: items,
      usuarios: users
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const fileName = `copia_seguridad_uptc_${new Date().toISOString().split('T')[0]}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Copia de seguridad JSON descargada correctamente.');
  };

  // Import / Restore Database Backup JSON
  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.pendientes)) {
          const restoredItems: PendienteItem[] = parsed.pendientes;
          const restoredUsers: UserAccount[] = Array.isArray(parsed.usuarios) ? parsed.usuarios : users;

          setItems(restoredItems);
          setUsers(restoredUsers);

          // Save to localStorage
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(restoredItems));
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(restoredUsers));

          // Save to Cloud Firestore
          saveAllPendientesCloud(restoredItems).catch((err) => console.warn('Cloud sync error on backup restore:', err));
          saveAllUsersCloud(restoredUsers).catch((err) => console.warn('Cloud sync error on backup restore:', err));

          showToast(`Copia de seguridad restaurada exitosamente (${restoredItems.length} pendientes).`);
        } else {
          alert('El archivo JSON no tiene un formato válido de copia de seguridad UPTC.');
        }
      } catch (err) {
        alert('Error al leer el archivo de copia de seguridad JSON.');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Export to Excel
  const handleExport = () => {
    exportToExcel(items);
    showToast('Archivo Excel descargado exitosamente.');
  };

  // Navigate to table with predefined filters
  const handleNavigateToTableWithFilter = (applyFilter?: Partial<FilterState>) => {
    if (applyFilter) {
      setFilters((prev) => ({
        ...prev,
        ...applyFilter
      }));
    }
    setActiveTab('table');
  };

  // Counters
  const totalCount = items.length;
  const openCount = items.filter((i) => i.estado !== 'CERRADO').length;
  const notificationCount = items.filter(
    (i) => (i.estado === 'PENDIENTE' || i.estado === 'ABIERTO') && i.prioridad === 'ALTA'
  ).length;

  const duplicatePairsCount = useMemo(() => {
    return findDuplicatePairs(items, 60).length;
  }, [items]);

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans flex flex-col selection:bg-yellow-300 selection:text-slate-950 relative overflow-x-hidden">
      
      {/* Liquid Glass Ambient Background Glows */}
      <div className="fixed top-[-100px] left-[15%] w-[500px] h-[500px] bg-gradient-to-br from-yellow-200/25 via-amber-100/15 to-transparent rounded-full blur-[120px] pointer-events-none animate-liquid-glow z-0"></div>
      <div className="fixed bottom-[-100px] right-[10%] w-[600px] h-[600px] bg-gradient-to-tl from-amber-200/15 via-yellow-100/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Toast Alert - Apple Glass Pill */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121214]/90 text-white px-5 py-3.5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.3)] border border-white/15 flex items-center gap-3 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-yellow-300 shrink-0" />
          <span className="text-xs font-semibold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => requireAdminPermission('Para cargar archivos Excel o CSV debe ingresar como Administrador.', () => setIsUploadOpen(true))}
        onOpenCreate={() => requireAdminPermission('Para crear un nuevo pendiente debe ingresar como Administrador.', () => {
          setEditingItem(null);
          setIsCreateOpen(true);
        })}
        onExport={handleExport}
        notificationCount={notificationCount}
        duplicateCount={duplicatePairsCount}
        totalPendientes={totalCount}
        openPendientes={openCount}
        onResetData={handleResetData}
        onClearAllData={handleClearAllData}
        currentUser={currentUser}
        onOpenLogin={() => {
          setTargetActionReason(null);
          setIsLoginOpen(true);
        }}
        onOpenUserManagement={() => {
          if (isAdmin) setIsUserMgmtOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        cloudSyncStatus={cloudSyncStatus}
        onForceSyncCloud={handleForceSyncCloud}
        onForcePullCloud={handleForcePullCloud}
        onExportBackupJson={handleExportBackupJson}
        onImportBackupJson={handleImportBackupJson}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            items={items}
            filters={filters}
            setFilters={setFilters}
            onNavigateToTable={handleNavigateToTableWithFilter}
          />
        )}

        {activeTab === 'table' && (
          <PendientesTable
            items={items}
            filters={filters}
            setFilters={setFilters}
            isAdmin={isAdmin}
            onRequireAdmin={requireAdminPermission}
            onEditItem={(item) => {
              requireAdminPermission('Para editar los datos de este pendiente debe ingresar como Administrador.', () => {
                setEditingItem(item);
                setIsCreateOpen(true);
              });
            }}
            onDeleteItem={(id) => {
              requireAdminPermission('Para eliminar un pendiente de la matriz debe ingresar como Administrador.', () => {
                handleDeleteItem(id);
              });
            }}
            onStatusChange={(id, newStatus) => {
              requireAdminPermission('Para cambiar el estado de ejecución debe ingresar como Administrador.', () => {
                handleStatusChange(id, newStatus);
              });
            }}
            onSaveObservations={handleSaveObservations}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            items={items}
            onStatusChange={(id, newStatus) => {
              requireAdminPermission('Para cambiar el estado del pendiente debe ingresar como Administrador.', () => {
                handleStatusChange(id, newStatus);
              });
            }}
          />
        )}

        {activeTab === 'bottlenecks' && (
          <BottlenecksView
            items={items}
            onStatusChange={(id, newStatus) => {
              requireAdminPermission('Para actualizar estado en el cuello de botella debe ingresar como Administrador.', () => {
                handleStatusChange(id, newStatus);
              });
            }}
            onNavigateToTableWithFilter={handleNavigateToTableWithFilter}
          />
        )}

        {activeTab === 'duplicates' && (
          <DuplicatesView
            items={items}
            onSaveItem={(saved) => {
              requireAdminPermission('Para fusionar o modificar duplicados debe ingresar como Administrador.', () => {
                handleSaveItem(saved);
              });
            }}
            onDeleteItem={(id) => {
              requireAdminPermission('Para descartar registros duplicados debe ingresar como Administrador.', () => {
                handleDeleteItem(id);
              });
            }}
            onStatusChange={(id, newStatus) => {
              requireAdminPermission('Para cambiar estado debe ingresar como Administrador.', () => {
                handleStatusChange(id, newStatus);
              });
            }}
            onEditItem={(item) => {
              requireAdminPermission('Para editar el registro debe ingresar como Administrador.', () => {
                setEditingItem(item);
                setIsCreateOpen(true);
              });
            }}
            showToastMessage={showToast}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            items={items}
            onNavigateToTable={handleNavigateToTableWithFilter}
            onSelectItemDetail={(item) => {
              setEditingItem(item);
              setIsCreateOpen(true);
            }}
          />
        )}

      </main>

      {/* Floating AI Assistant Widget (available across non-chat tabs) */}
      {activeTab !== 'chat' && (
        <ChatFloatingWidget
          items={items}
          onNavigateToTable={handleNavigateToTableWithFilter}
          onSelectItemDetail={(item) => {
            setEditingItem(item);
            setIsCreateOpen(true);
          }}
        />
      )}

      {/* Institutional Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-yellow-400">UPTC</span>
            <span>- Universidad Pedagógica y Tecnológica de Colombia • Vicerrectoría Académica</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Sistema Integrado de Gestión (SIG) - Control de compromisos con Autenticación de Seguridad.
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setTargetActionReason(null);
        }}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        targetActionReason={targetActionReason}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
        currentUser={currentUser}
        users={users}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* User Profile & Email Notifications Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        items={items}
        onUpdateProfile={handleUpdateUser}
        showToast={showToast}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Task Create/Edit Modal */}
      <PendienteFormModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
      />

    </div>
  );
}
