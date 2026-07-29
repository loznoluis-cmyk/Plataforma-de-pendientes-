import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Shield, KeyRound, User, Lock, X, AlertCircle, CheckCircle2, UserCheck, Key } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  targetActionReason?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  targetActionReason
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = usernameOrEmail.trim().toLowerCase();
    const pass = password.trim();

    if (!identifier || !pass) {
      setError('Por favor ingrese su usuario o correo y contraseña.');
      return;
    }

    const foundUser = users.find(
      (u) => (u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier) && u.passwordHash === pass
    );

    if (!foundUser) {
      setError('Usuario o contraseña incorrectos. Verifique sus credenciales.');
      return;
    }

    onLoginSuccess(foundUser);
    onClose();
  };

  const handleQuickLoginAdmin = () => {
    const adminUser = users.find((u) => u.rol === 'ADMIN');
    if (adminUser) {
      onLoginSuccess(adminUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1d1d1f] text-white rounded-3xl shadow-2xl border border-white/10 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#161617] px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400/10 text-yellow-400 rounded-2xl border border-yellow-400/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Autenticación de Seguridad</h3>
              <p className="text-xs text-slate-400">Perfil Administrativo UPTC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {targetActionReason && (
            <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-xl flex items-start gap-2 text-yellow-950">
              <AlertCircle className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-xs">Acción Protegida:</strong>
                <span className="text-[11px] leading-tight">{targetActionReason}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-yellow-400" />
              <span>Usuario o Correo Institucional:</span>
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Ej: admin o admin@uptc.edu.co"
              className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 outline-none text-xs font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-yellow-400" />
              <span>Contraseña de Seguridad:</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 outline-none text-xs font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 font-bold rounded-2xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <KeyRound className="w-4 h-4 text-slate-950" />
              <span>Ingresar</span>
            </button>
          </div>

          {/* Quick Demo Access Credentials */}
          <div className="mt-4 pt-4 border-t border-white/10 bg-white/5 p-3.5 rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-extrabold text-yellow-400 tracking-wider block">
              Credenciales por Defecto de Prueba:
            </span>
            <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/10 text-[11px]">
              <div>
                <span className="font-semibold text-slate-300">Administrador:</span>{' '}
                <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-yellow-300">admin</code> /{' '}
                <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-yellow-300">admin123</code>
              </div>
              <button
                type="button"
                onClick={handleQuickLoginAdmin}
                className="text-[10px] bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer shadow-sm"
              >
                Auto-ingresar
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
