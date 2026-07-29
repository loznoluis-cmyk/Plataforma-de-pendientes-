import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { Users, UserPlus, Shield, KeyRound, Trash2, Edit2, CheckCircle2, X, AlertCircle, Building, Mail, UserCheck } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  users: UserAccount[];
  onAddUser: (newUser: UserAccount) => void;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // New User Form State
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    username: '',
    password: '',
    rol: 'ADMIN' as UserRole,
    cargo: '',
    dependencia: 'Vicerrectoría Académica UPTC'
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const nombre = formData.nombre.trim();
    const email = formData.email.trim();
    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();

    if (!nombre || !email || !username || !password) {
      setFormError('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    // Check duplicate username or email
    const exists = users.some(
      (u) => u.username.toLowerCase() === username || u.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      setFormError('Ya existe un usuario con este nombre de usuario o correo electrónico.');
      return;
    }

    const newUser: UserAccount = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      nombre,
      email,
      username,
      passwordHash: password,
      rol: formData.rol,
      cargo: formData.cargo.trim() || 'Funcionario / Administrador',
      dependencia: formData.dependencia.trim() || 'Vicerrectoría Académica',
      fechaCreacion: new Date().toISOString(),
      notificacionesEmail: {
        enabled: true,
        diasAnticipacion: 7,
        prioridadFiltro: 'SOLO_ALTA',
        soloMisPendientes: false
      }
    };

    onAddUser(newUser);
    setSuccessMsg(`Usuario "${nombre}" creado exitosamente con rol ${formData.rol}.`);
    setFormData({
      nombre: '',
      email: '',
      username: '',
      password: '',
      rol: 'ADMIN',
      cargo: '',
      dependencia: 'Vicerrectoría Académica UPTC'
    });
    setTimeout(() => {
      setSuccessMsg(null);
      setActiveTab('list');
    }, 1800);
  };

  const handleSavePasswordChange = (user: UserAccount) => {
    if (!newPassword.trim()) return;
    const updated = {
      ...user,
      passwordHash: newPassword.trim()
    };
    onUpdateUser(updated);
    setEditingUserId(null);
    setNewPassword('');
  };

  const handleToggleRole = (user: UserAccount) => {
    const adminCount = users.filter((u) => u.rol === 'ADMIN').length;
    if (user.rol === 'ADMIN' && adminCount <= 1) {
      alert('No se puede cambiar el rol del único Administrador activo del sistema.');
      return;
    }

    const updated: UserAccount = {
      ...user,
      rol: user.rol === 'ADMIN' ? 'LECTOR' : 'ADMIN'
    };
    onUpdateUser(updated);
  };

  const handleDelete = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (targetUser.rol === 'ADMIN') {
      const adminCount = users.filter((u) => u.rol === 'ADMIN').length;
      if (adminCount <= 1) {
        alert('Operación no permitida: Debe existir al menos un usuario Administrador en la plataforma.');
        return;
      }
    }

    if (confirm(`¿Está seguro de eliminar al usuario "${targetUser.nombre}" (${targetUser.username})?`)) {
      onDeleteUser(userId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
        
        {/* Header */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400/20 text-yellow-400 rounded-lg border border-yellow-400/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gestión de Usuarios y Accesos UPTC</h3>
              <p className="text-xs text-slate-300">Administración de credenciales de seguridad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-slate-950 text-yellow-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios Registrados ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-slate-950 text-yellow-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Crear Nuevo Usuario</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto text-xs">
          
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-300 p-3 rounded-xl text-yellow-950">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-700 shrink-0" />
                  <span className="text-xs font-semibold">
                    Solo los usuarios con perfil <strong>Administrador</strong> tienen permisos para crear, editar o eliminar información en la plataforma.
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {users.map((user) => (
                  <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{user.nombre}</span>
                        {user.rol === 'ADMIN' ? (
                          <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] uppercase border border-yellow-500/40">
                            ADMINISTRADOR
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase border border-slate-300">
                            LECTOR / CONSULTOR
                          </span>
                        )}
                        {currentUser?.id === user.id && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            (Sesión Actual)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <strong>Usuario:</strong> {user.username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {user.email}
                        </span>
                        {user.cargo && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {user.cargo}
                          </span>
                        )}
                      </div>

                      {/* Password Edit Box */}
                      {editingUserId === user.id && (
                        <div className="mt-2 p-2 bg-slate-100 rounded-lg flex items-center gap-2 border border-slate-300">
                          <input
                            type="password"
                            placeholder="Nueva contraseña"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-white p-1.5 rounded border border-slate-300 text-xs font-mono w-48 outline-none"
                          />
                          <button
                            onClick={() => handleSavePasswordChange(user)}
                            className="px-2.5 py-1 bg-yellow-400 text-slate-950 font-bold rounded text-xs hover:bg-yellow-300 transition-colors"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="text-slate-500 hover:text-slate-800 text-xs px-2"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleToggleRole(user)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded border transition-colors bg-white hover:bg-slate-100 text-slate-800 border-slate-300 cursor-pointer"
                        title="Cambiar entre Administrador y Lector"
                      >
                        Rol: {user.rol}
                      </button>

                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setNewPassword('');
                        }}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                        title="Cambiar Contraseña"
                      >
                        <KeyRound className="w-4 h-4 text-slate-700" />
                      </button>

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Ing. María Fernández"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Correo Institucional <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="maria.fernandez@uptc.edu.co"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Nombre de Usuario (Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="mfernandez"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Contraseña de Acceso <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Perfil de Seguridad / Permisos <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none font-bold bg-white"
                  >
                    <option value="ADMIN">ADMINISTRADOR (Edición y Control Total)</option>
                    <option value="LECTOR">CONSULTOR / LECTOR (Solo Lectura y Exportación)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Cargo u Ocupación
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ej: Profesional de Apoyo SIG"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Dependencia UPTC
                </label>
                <input
                  type="text"
                  value={formData.dependencia}
                  onChange={(e) => setFormData({ ...formData, dependencia: e.target.value })}
                  placeholder="Vicerrectoría Académica"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-slate-950" />
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
