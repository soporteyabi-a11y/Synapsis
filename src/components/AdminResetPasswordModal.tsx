/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Copy, 
  Check, 
  ShieldCheck, 
  RefreshCw,
  Send,
  UserCheck
} from 'lucide-react';
import { User } from '../types';
import { avatarColor, avatarLetter } from '../lib/db';
import { saveDocToFirestore } from '../lib/firebase';
import { bioCosmicSynth } from '../lib/audioEngine';

interface AdminResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User | null;
  onPasswordChanged: (updatedUser: User) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function AdminResetPasswordModal({
  isOpen,
  onClose,
  targetUser,
  onPasswordChanged,
  toast,
}: AdminResetPasswordModalProps) {
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && targetUser) {
      // Default to either student code or a clean default
      const defaultPass = targetUser.codigo || `${targetUser.rol}123`;
      setNewPass(defaultPass);
      setShowPass(true);
      setCopied(false);
    }
  }, [isOpen, targetUser]);

  if (!isOpen || !targetUser) return null;

  const handleGenerateRandom = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let p = '';
    for (let i = 0; i < 8; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(p);
    toast('Contraseña segura generada', 'info');
  };

  const handleUseCode = () => {
    if (targetUser.codigo) {
      setNewPass(targetUser.codigo);
      toast(`Contraseña configurada con el código: ${targetUser.codigo}`, 'info');
    } else {
      setNewPass(targetUser.id.substring(0, 6).toUpperCase());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPass.trim();
    if (!cleanPass) {
      toast('Ingresa una contraseña válida', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...targetUser,
        pass: cleanPass,
      };

      // Direct write to Cloud Firestore
      await saveDocToFirestore('users', updatedUser);

      // Trigger local state updates
      onPasswordChanged(updatedUser);

      bioCosmicSynth.play('success');
      toast(`Contraseña de ${targetUser.nombre} actualizada correctamente`, 'success');
      onClose();
    } catch (err) {
      console.error('Error in admin password reset:', err);
      toast('Error al guardar la contraseña en Firestore', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    const url = window.location.origin;
    const msg = `Hola ${targetUser.nombre},\n\nTu contraseña de acceso al portal Synapsis ha sido restablecida:\n\n• Usuario / Correo: ${targetUser.email}\n• Código institucional: ${targetUser.codigo || '—'}\n• Nueva contraseña: ${newPass}\n\nPuedes ingresar desde:\n${url}`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    toast('Mensaje con credenciales copiado al portapapeles', 'info');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[220] p-4 text-left select-none animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 theme-bg-surface"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Restablecer Contraseña
              </h3>
              <span className="text-[11px] text-slate-400">
                Gestión administrativa de credenciales
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

        {/* User Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0"
            style={{ backgroundColor: avatarColor(targetUser.nombre) }}
          >
            {avatarLetter(targetUser.nombre)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">
              {targetUser.nombre}
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              {targetUser.email}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                {targetUser.rol}
              </span>
              {targetUser.codigo && (
                <span className="text-[10px] font-mono font-bold text-indigo-600">
                  Código: {targetUser.codigo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-4.5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nueva Contraseña para el Usuario
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Nueva clave"
                className="w-full pl-9 pr-9 py-2 text-sm outline-none font-mono font-bold text-slate-900"
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

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-1.5">
            {targetUser.codigo && (
              <button
                type="button"
                onClick={handleUseCode}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
              >
                Usar código ({targetUser.codigo})
              </button>
            )}
            <button
              type="button"
              onClick={handleGenerateRandom}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Generar aleatoria</span>
            </button>
          </div>

          {/* Copy invitation action */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="text-[11px] text-slate-600">
              ¿Deseas enviar las credenciales al usuario?
            </div>
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? '¡Copiado!' : 'Copiar mensaje'}</span>
            </button>
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
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Guardar Contraseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
