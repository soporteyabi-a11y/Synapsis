/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  Mail,
  Smartphone,
  IdCard
} from 'lucide-react';
import { User } from '../types';
import { avatarColor, avatarLetter } from '../lib/db';
import { saveDocToFirestore } from '../lib/firebase';
import { bioCosmicSynth } from '../lib/audioEngine';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateCurrentUser: (updatedUser: User) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUser,
  toast,
}: UserProfileModalProps) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newPass.trim();
    if (cleanNew.length < 4) {
      toast('La nueva contraseña debe tener al menos 4 caracteres', 'warning');
      return;
    }
    if (cleanNew !== confirmPass.trim()) {
      toast('La confirmación de la nueva contraseña no coincide', 'error');
      return;
    }

    // If currentUser already had a pass, verify it
    if (currentUser.pass && currentPass.trim() && currentUser.pass !== currentPass.trim()) {
      toast('La contraseña actual ingresada es incorrecta', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...currentUser,
        pass: cleanNew,
      };

      await saveDocToFirestore('users', updatedUser);
      onUpdateCurrentUser(updatedUser);

      bioCosmicSynth.play('success');
      toast('Tu contraseña ha sido actualizada con éxito', 'success');
      onClose();
    } catch (err) {
      console.error('Error changing user password:', err);
      toast('Error al actualizar la contraseña', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = {
    admin: 'Administrador',
    docente: 'Docente',
    estudiante: 'Estudiante',
  }[currentUser.rol];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-left select-none animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 theme-bg-surface"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: avatarColor(currentUser.nombre) }}
            >
              {avatarLetter(currentUser.nombre)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {currentUser.nombre}
              </h3>
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">
                {roleLabel} {currentUser.codigo ? `• ${currentUser.codigo}` : ''}
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* User Details Summary */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={currentUser.email}>{currentUser.email}</span>
          </div>
          {currentUser.cedula && (
            <div className="flex items-center gap-2 text-slate-600">
              <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Cédula: {currentUser.cedula}</span>
            </div>
          )}
          {currentUser.celular && (
            <div className="flex items-center gap-2 text-slate-600">
              <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{currentUser.celular}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Cuenta protegida</span>
          </div>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="p-4.5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Cambiar mi Contraseña de Acceso</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Contraseña Actual (opcional para verificar)
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Ingresa tu clave actual"
                className="w-full pl-9 pr-9 py-2 text-xs outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Mínimo 4-6 caracteres"
                className="w-full pl-9 pr-9 py-2 text-xs outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full pl-9 pr-9 py-2 text-xs outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !newPass.trim()}
              className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Actualizar Contraseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
