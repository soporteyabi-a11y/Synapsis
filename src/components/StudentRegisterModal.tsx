/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  GraduationCap, 
  Mail, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle,
  Sparkles,
  Phone,
  FileText,
  Calendar,
  X,
  ShieldCheck
} from 'lucide-react';
import { User, Semester } from '../types';
import { uid, now, generateStudentCode } from '../lib/db';
import { saveDocToFirestore, findUserInFirestore } from '../lib/firebase';

interface StudentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  semesters: Semester[];
  onRegisterSuccess: (newUser: User, autoLogin: boolean) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function StudentRegisterModal({
  isOpen,
  onClose,
  users,
  semesters,
  onRegisterSuccess,
  toast,
}: StudentRegisterModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewCode, setPreviewCode] = useState('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Generate code on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setNombre('');
      setCedula('');
      setEmail('');
      setCelular('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setRegisteredUser(null);
      setCopiedField(null);
      
      // Auto-assign first active semester if available
      const activeSem = semesters.find(s => s.estado === 'activo') || semesters[0];
      setSelectedSemester(activeSem ? activeSem.id : '');

      // Suggest unique student code preview
      const code = generateStudentCode(users);
      setPreviewCode(`EST-${code}`);
    }
  }, [isOpen, semesters, users]);

  if (!isOpen) return null;

  // Quick auto-generate institutional email if user wants suggestion
  const handleSuggestEmail = () => {
    if (!nombre.trim()) {
      toast('Ingresa primero tu nombre completo para sugerir el correo', 'warning');
      return;
    }
    const clean = nombre.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, ".");
    const parts = clean.split('.').filter(Boolean);
    const slug = parts.slice(0, 2).join('.');
    const randomNum = Math.floor(100 + Math.random() * 900);
    setEmail(`${slug || 'estudiante'}.${randomNum}@synapsis.edu`);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast(`${fieldName} copiado al portapapeles`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNombre = nombre.trim().toUpperCase();
    const cleanCedula = cedula.trim().toUpperCase();
    let cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Validations
    if (!cleanNombre || cleanNombre.length < 3) {
      toast('Por favor ingresa tu nombre y apellido completos', 'warning');
      return;
    }

    if (!cleanCedula) {
      toast('Por favor ingresa tu número de documento de identidad o cédula', 'warning');
      return;
    }

    if (!cleanEmail) {
      toast('Por favor ingresa tu correo electrónico', 'warning');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast('Por favor ingresa un correo electrónico válido', 'warning');
      return;
    }

    if (cleanPass.length < 4) {
      toast('La contraseña debe tener al menos 4 caracteres', 'warning');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      toast('Las contraseñas no coinciden', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check uniqueness locally
      const existsLocalEmail = users.some(u => (u.email || '').trim().toLowerCase() === cleanEmail);
      if (existsLocalEmail) {
        toast('Este correo ya se encuentra registrado. Inicia sesión o recupera tu contraseña.', 'error');
        setIsSubmitting(false);
        return;
      }

      const existsLocalCedula = users.some(u => (u.cedula || '').trim().toUpperCase() === cleanCedula);
      if (existsLocalCedula) {
        toast('Este número de documento ya está registrado en el campus.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Check uniqueness in Cloud Firestore
      const remoteUserEmail = await findUserInFirestore(cleanEmail);
      if (remoteUserEmail) {
        toast('El correo ya existe en el sistema. Puedes iniciar sesión.', 'error');
        setIsSubmitting(false);
        return;
      }

      const remoteUserCedula = await findUserInFirestore(cleanCedula);
      if (remoteUserCedula) {
        toast('El documento de identidad ya se encuentra registrado.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 3. Generate final unique student code
      const finalCode = previewCode.trim().toUpperCase() || `EST-${generateStudentCode(users)}`;

      // 4. Create new user object
      const newStudent: User = {
        id: uid(),
        nombre: cleanNombre,
        email: cleanEmail,
        pass: cleanPass,
        rol: 'estudiante',
        creado: now(),
        cedula: cleanCedula,
        celular: celular.trim().toUpperCase() || undefined,
        semestre: selectedSemester || undefined,
        codigo: finalCode,
      };

      // 5. Save to Firestore
      await saveDocToFirestore('users', newStudent);

      // 6. Update local state
      setRegisteredUser(newStudent);
      setStep('success');
      toast('¡Cuenta de estudiante creada exitosamente!', 'success');
    } catch (err) {
      console.error('Error al registrar estudiante:', err);
      toast('Hubo un inconveniente al guardar tu registro. Intenta de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-left">
        
        {/* Top subtle line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Registro de Estudiante
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Nuevo Usuario
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Crea tu cuenta institucional para realizar exámenes y consultar notas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: FORM */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* Field: Nombre Completo */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre Completo <span className="text-rose-400">*</span>
              </label>
              <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value.toUpperCase())}
                  placeholder="EJ: CARLOS ANDRÉS PÉREZ"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            {/* 2-Column Row: Cédula & Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Documento / Cédula / T.I. <span className="text-rose-400">*</span>
                </label>
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="Número de documento"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Celular / WhatsApp <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={celular}
                    onChange={e => setCelular(e.target.value)}
                    placeholder="310 000 0000"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Field: Correo Electrónico */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Correo Electrónico <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSuggestEmail}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generar correo sugerido</span>
                </button>
              </div>
              <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                  placeholder="estudiante@synapsis.edu o correo personal"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Podrás usar este correo o tu documento para iniciar sesión en cualquier momento.
              </p>
            </div>

            {/* Field: Período / Semestre Académico */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Período Académico / Semestre
              </label>
              <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 text-white text-sm outline-none font-medium cursor-pointer rounded-xl"
                >
                  <option value="">Seleccionar período académico...</option>
                  {semesters.map(sem => (
                    <option key={sem.id} value={sem.id}>
                      {sem.nombre} {sem.estado === 'activo' ? '(Vigente)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto Student Code Badge */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Código Estudiantil asignado:</span>
                  <span className="font-mono text-xs font-bold text-indigo-300">{previewCode}</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Generado por sistema</span>
            </div>

            {/* 2-Column Row: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Contraseña <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Confirmar Contraseña <span className="text-rose-400">*</span>
                </label>
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Password match indicator */}
            {password && confirmPassword && (
              <div className="text-[11px] flex items-center gap-1.5">
                {password === confirmPassword ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Las contraseñas coinciden
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Las contraseñas no coinciden
                  </span>
                )}
              </div>
            )}

            {/* Submit Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-1/3 py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!!password && !!confirmPassword && password !== confirmPassword)}
                className="w-full sm:w-2/3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creando cuenta en Firebase...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Completar Registro</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: SUCCESS CONFIRMATION */}
        {step === 'success' && registeredUser && (
          <div className="p-6 sm:p-7 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                ¡Registro Completado con Éxito!
              </span>
              <h4 className="text-lg font-bold text-white">¡Bienvenido, {registeredUser.nombre}!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tu cuenta de estudiante ha sido creada y sincronizada en tiempo real con Cloud Firestore.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Rol del Usuario:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  Estudiante
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Código de Estudiante:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-indigo-300 font-bold">{registeredUser.codigo}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(registeredUser.codigo || '', 'Código')}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Copiar código"
                  >
                    {copiedField === 'Código' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Correo Electrónico:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-white font-medium">{registeredUser.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(registeredUser.email, 'Correo')}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Copiar correo"
                  >
                    {copiedField === 'Correo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {registeredUser.cedula && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Documento / Cédula:</span>
                  <span className="font-mono text-slate-300 font-medium">{registeredUser.cedula}</span>
                </div>
              )}

              {registeredUser.semestre && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Período Académico:</span>
                  <span className="text-slate-300 font-medium">
                    {semesters.find(s => s.id === registeredUser.semestre)?.nombre || registeredUser.semestre}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              💡 Puedes ingresar a tu cuenta usando tu <strong>correo</strong>, tu <strong>código</strong> o tu <strong>documento</strong>.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => onRegisterSuccess(registeredUser, true)}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <span>Ingresar al Campus Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={() => onRegisterSuccess(registeredUser, false)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Volver a la pantalla de Inicio de Sesión
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
