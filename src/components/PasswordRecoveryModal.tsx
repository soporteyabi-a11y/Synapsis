/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Mail, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle,
  Sparkles,
  Send
} from 'lucide-react';
import { User } from '../types';
import { avatarColor, avatarLetter } from '../lib/db';
import { bioCosmicSynth } from '../lib/audioEngine';
import { saveDocToFirestore, sendFirebasePasswordReset, findUserInFirestore } from '../lib/firebase';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onPasswordRestored: (updatedUser: User, newPass: string) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  initialIdentifier?: string;
}

type RecoveryStep = 'identify' | 'verify' | 'new_password' | 'success';

export default function PasswordRecoveryModal({
  isOpen,
  onClose,
  users,
  onPasswordRestored,
  toast,
  initialIdentifier = '',
}: PasswordRecoveryModalProps) {
  const [step, setStep] = useState<RecoveryStep>('identify');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [isSearching, setIsSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Verification step state
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<'cedula' | 'email' | 'firebase'>('cedula');
  const [isSendingFirebase, setIsSendingFirebase] = useState(false);

  // New password step state
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('identify');
      setIdentifier(initialIdentifier);
      setTargetUser(null);
      setVerifyInput('');
      setNewPass('');
      setConfirmPass('');
      setCopied(false);
    }
  }, [isOpen, initialIdentifier]);

  if (!isOpen) return null;

  // Mask email for privacy (e.g., c***s@synapsis.edu)
  const maskEmail = (email: string) => {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  };

  // Step 1: Search user solidly across local state and Cloud Firestore
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      toast('Ingresa tu correo, código de usuario o cédula', 'warning');
      return;
    }

    setIsSearching(true);

    try {
      // 1. Search in local state users
      let found = users.find(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uCode = (u.codigo || u.id.substring(0, 4)).trim().toLowerCase();
        const uCedula = (u.cedula || '').trim().toLowerCase();
        return uEmail === cleanId || uCode === cleanId || uCedula === cleanId;
      });

      // 2. If not found in memory, query directly from Cloud Firestore
      if (!found) {
        found = await findUserInFirestore(cleanId) || undefined;
      }

      if (found) {
        setTargetUser(found);
        // Default verification method based on available user data
        if (found.cedula) {
          setVerifyMethod('cedula');
        } else {
          setVerifyMethod('email');
        }
        setStep('verify');
        bioCosmicSynth.play('tap');
      } else {
        toast('No se encontró ningún usuario con ese correo, código o cédula', 'error');
      }
    } catch (err) {
      console.error('Error finding user:', err);
      toast('Error al buscar usuario. Intenta nuevamente.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Step 2: Verify identity
  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    const cleanInput = verifyInput.trim().toLowerCase();

    if (verifyMethod === 'cedula') {
      const userCedula = (targetUser.cedula || '').trim().toLowerCase();
      if (!userCedula) {
        // If user didn't have cedula registered, bypass to email confirmation
        setVerifyMethod('email');
        toast('Este usuario no tiene cédula registrada. Confirma tu correo.', 'info');
        return;
      }
      if (cleanInput === userCedula) {
        bioCosmicSynth.play('success');
        setStep('new_password');
        toast('Identidad verificada correctamente', 'success');
      } else {
        toast('El número de cédula o documento no coincide', 'error');
      }
    } else if (verifyMethod === 'email') {
      const userEmail = (targetUser.email || '').trim().toLowerCase();
      if (cleanInput === userEmail) {
        bioCosmicSynth.play('success');
        setStep('new_password');
        toast('Correo confirmado correctamente', 'success');
      } else {
        toast('El correo electrónico no coincide con el registrado', 'error');
      }
    }
  };

  // Send Firebase Auth email reset
  const handleSendFirebaseReset = async () => {
    if (!targetUser || !targetUser.email) return;
    setIsSendingFirebase(true);
    try {
      const res = await sendFirebasePasswordReset(targetUser.email);
      if (res.success) {
        toast(res.message, 'success');
        bioCosmicSynth.play('success');
      } else {
        toast(res.message, 'warning');
      }
    } catch (e) {
      toast('No se pudo enviar el correo de recuperación', 'error');
    } finally {
      setIsSendingFirebase(false);
    }
  };

  // Generate a random secure temporary password
  const handleGenerateRandomPass = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(pass);
    setConfirmPass(pass);
    setShowNewPass(true);
    toast('Contraseña segura generada automáticamente', 'info');
  };

  // Step 3: Save new password to Cloud Firestore & App State
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    const cleanPass = newPass.trim();
    if (cleanPass.length < 4) {
      toast('La contraseña debe tener al menos 4 caracteres', 'warning');
      return;
    }
    if (cleanPass !== confirmPass.trim()) {
      toast('Las contraseñas no coinciden', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...targetUser,
        pass: cleanPass,
      };

      // 1. Direct cloud persistence in Firestore
      await saveDocToFirestore('users', updatedUser);

      // 2. Propagate to parent state and localStorage
      onPasswordRestored(updatedUser, cleanPass);

      setTargetUser(updatedUser);
      setStep('success');
      bioCosmicSynth.play('success');
      toast('¡Contraseña restablecida y guardada con éxito en la nube!', 'success');
    } catch (err) {
      console.error('Error saving restored password:', err);
      toast('Error al guardar la nueva contraseña en Firestore', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!targetUser) return;
    const msg = `Credenciales de acceso a Synapsis:\n• Usuario/Correo: ${targetUser.email}\n• Código: ${targetUser.codigo || '—'}\n• Nueva contraseña: ${newPass}`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    toast('Credenciales copiadas al portapapeles', 'info');
    setTimeout(() => setCopied(false), 3000);
  };

  const roleBadge = (rol: User['rol']) => {
    switch (rol) {
      case 'admin':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Administrador</span>;
      case 'docente':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Docente</span>;
      case 'estudiante':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Estudiante</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[250] p-4 text-left select-none animate-fade-in">
      <div 
        className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-200 relative flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle ambient gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Restablecer Contraseña
              </h3>
              <p className="text-xs text-slate-400">
                Recuperación sólida y universal para todos los usuarios
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-[11px] font-semibold text-center select-none">
          <div className={`py-2 border-b-2 transition-colors ${step === 'identify' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500'}`}>
            1. Identificar
          </div>
          <div className={`py-2 border-b-2 transition-colors ${step === 'verify' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500'}`}>
            2. Verificar
          </div>
          <div className={`py-2 border-b-2 transition-colors ${step === 'new_password' || step === 'success' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500'}`}>
            3. Restablecer
          </div>
        </div>

        {/* STEP 1: IDENTIFY USER */}
        {step === 'identify' && (
          <form onSubmit={handleSearchUser} className="p-5 space-y-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              Ingresa el <strong>correo institucional</strong>, <strong>código de usuario/estudiante</strong> o <strong>cédula</strong> de la cuenta que deseas recuperar:
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Correo, Código o Cédula
              </label>
              <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Ej: maria.estudiante@synapsis.edu o EST-101"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                El sistema verificará de forma segura el registro en la base de datos local y en la nube de Firebase Firestore.
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSearching}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <span>Buscar Cuenta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY IDENTITY */}
        {step === 'verify' && targetUser && (
          <form onSubmit={handleVerifyIdentity} className="p-5 space-y-4">
            {/* User identification card */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                style={{ backgroundColor: avatarColor(targetUser.nombre) }}
              >
                {avatarLetter(targetUser.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{targetUser.nombre}</span>
                  {roleBadge(targetUser.rol)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5 truncate">
                  <span>{maskEmail(targetUser.email)}</span>
                  {targetUser.codigo && (
                    <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded">
                      {targetUser.codigo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Method selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Método de confirmación de identidad
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {targetUser.cedula && (
                  <button
                    type="button"
                    onClick={() => { setVerifyMethod('cedula'); setVerifyInput(''); }}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition ${verifyMethod === 'cedula' ? 'border-indigo-500 bg-indigo-500/10 text-white font-semibold' : 'border-slate-800 bg-slate-900/50 text-slate-400'}`}
                  >
                    Por Cédula / Doc.
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setVerifyMethod('email'); setVerifyInput(''); }}
                  className={`p-2 rounded-xl border text-left cursor-pointer transition ${verifyMethod === 'email' ? 'border-indigo-500 bg-indigo-500/10 text-white font-semibold' : 'border-slate-800 bg-slate-900/50 text-slate-400'}`}
                >
                  Por Correo Completo
                </button>
              </div>
            </div>

            {/* Verification input based on method */}
            {verifyMethod === 'cedula' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Ingresa tu número de Cédula o Documento registrado:
                </label>
                <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500">
                  <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={verifyInput}
                    onChange={e => setVerifyInput(e.target.value)}
                    placeholder="Número de cédula registrado"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>
            )}

            {verifyMethod === 'email' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Confirma tu correo electrónico completo:
                </label>
                <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={verifyInput}
                    onChange={e => setVerifyInput(e.target.value)}
                    placeholder="tu.correo@synapsis.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Alternative: Firebase Auth Email Reset */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSendingFirebase}
                onClick={handleSendFirebaseReset}
                className="w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 text-indigo-300 hover:text-indigo-200 text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isSendingFirebase ? 'Enviando enlace...' : 'Enviar enlace oficial por correo (Firebase Auth)'}</span>
              </button>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('identify')}
                className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Atrás</span>
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Verificar y Continuar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === 'new_password' && targetUser && (
          <form onSubmit={handleSaveNewPassword} className="p-5 space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Identidad comprobada para <strong>{targetUser.nombre}</strong>.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Nueva Contraseña
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomPass}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generar clave segura</span>
                </button>
              </div>
              <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  autoFocus
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Mínimo 4-6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium font-mono"
                />
              </div>
            </div>

            {/* Quick validation hints */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Mínimo 4 caracteres</span>
              {newPass && confirmPass && (
                <span className={newPass === confirmPass ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {newPass === confirmPass ? '✓ Coinciden' : '✕ No coinciden'}
                </span>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Atrás</span>
              </button>
              <button
                type="submit"
                disabled={isSaving || !newPass || newPass !== confirmPass}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en Firestore...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Guardar y Restablecer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 'success' && targetUser && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">¡Contraseña Actualizada!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Las credenciales de <strong>{targetUser.nombre}</strong> han sido actualizadas y sincronizadas en Firebase Firestore.
              </p>
            </div>

            {/* Access details card */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Usuario / Correo:</span>
                <span className="font-mono text-white font-bold">{targetUser.email}</span>
              </div>
              {targetUser.codigo && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Código de Acceso:</span>
                  <span className="font-mono text-indigo-400 font-bold">{targetUser.codigo}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nueva Contraseña:</span>
                <span className="font-mono text-emerald-400 font-bold">{newPass}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar credenciales'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acceder Ahora con la Nueva Clave</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
