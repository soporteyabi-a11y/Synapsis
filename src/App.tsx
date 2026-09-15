/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  HelpCircle, 
  User as UserIcon, 
  Lock, 
  LogOut, 
  Menu, 
  Sparkles,
  School,
  ChevronRight,
  QrCode,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Globe
} from 'lucide-react';

import { 
  User, 
  Exam, 
  Submission, 
  Institution, 
  Subject, 
  Semester, 
  Parcial, 
  GradeRecord, 
  Assignment,
  AssignmentSubmission
} from './types';

import { 
  getInitialState, 
  saveState, 
  avatarColor, 
  avatarLetter,
  mergeStates
} from './lib/db';
import { bioCosmicSynth } from './lib/audioEngine';
import { 
  fetchFullStateFromFirestore, 
  seedFirestore, 
  syncToFirestore, 
  initializeSyncCache,
  fullBidirectionalSync,
  registerDeletedId
} from './lib/firebase';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MisExamenes from './components/MisExamenes';
import ExamBuilder from './components/ExamBuilder';
import Resultados from './components/Resultados';
import MisExamenesTake from './components/MisExamenesTake';
import ExamTakeScreen from './components/ExamTakeScreen';
import MiHistorial from './components/MiHistorial';
import Usuarios from './components/Usuarios';
import Instituciones from './components/Instituciones';
import Asignaturas from './components/Asignaturas';
import Semestres from './components/Semestres';
import Parciales from './components/Parciales';
import RegistroNotas from './components/RegistroNotas';
import Trabajos from './components/Trabajos';
import HistorialAcademico from './components/HistorialAcademico';
import Estudiantes from './components/Estudiantes';
import Asistencia from './components/Asistencia';
import Boletines from './components/Boletines';
import Agenda from './components/Agenda';
import Tablon from './components/Tablon';
import Finanzas from './components/Finanzas';
import Educativo from './components/Educativo';
import Biblia from './components/Biblia';
import ShareAppModal from './components/ShareAppModal';

export default function App() {
  // Database States
  const [db, setDb] = useState(() => getInitialState());
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // Download entire Synapsis Portal database on mount
  useEffect(() => {
    async function loadFirestoreData() {
      try {
        console.log('Loading Synapsis portal database from Firestore...');
        const remoteDb = await fetchFullStateFromFirestore();
        if (remoteDb) {
          console.log('Successfully loaded state from Cloud Firestore.');
          const localDb = getInitialState();
          const mergedDb = mergeStates(localDb, remoteDb);
          setDb(mergedDb);
          saveState(mergedDb);
          initializeSyncCache(mergedDb);
        } else {
          // No remote database found, let's seed with current default list
          console.log('Firestore dataset is empty. Writing initial educational seed...');
          const localSeed = getInitialState();
          await seedFirestore(localSeed);
          setDb(localSeed);
          saveState(localSeed);
          initializeSyncCache(localSeed);
        }
      } catch (err) {
        console.error('Error synchronizing with Cloud Firestore, running standalone.', err);
      } finally {
        setIsFirebaseLoading(false);
      }
    }
    loadFirestoreData();
  }, []);

  // App Session States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('instituto_currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  // UI States
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('synapsis_activeTab') || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('synapsis_sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('synapsis_sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  const [theme, setTheme] = useState<'theme-academia' | 'theme-cyber'>(() => {
    const saved = localStorage.getItem('synapsis-theme');
    if (saved === 'theme-cyber' || saved === 'theme-cosmos' || saved === 'theme-cosmos-contraste') {
      return 'theme-cyber';
    }
    return 'theme-academia';
  });

  // Automatically manage ambient soundtrack when theme changes
  useEffect(() => {
    if (theme !== 'theme-cyber') {
      bioCosmicSynth.togglePlay(false);
    }
  }, [theme]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [activeTakeExamId, setActiveTakeExamId] = useState<string | null>(() => {
    return localStorage.getItem('synapsis_activeTakeExamId');
  });
  const [activeEditExamId, setActiveEditExamId] = useState<string | null>(() => {
    return localStorage.getItem('synapsis_activeEditExamId');
  });

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Persist current active tab and active exam actions
  useEffect(() => {
    localStorage.setItem('synapsis_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTakeExamId) {
      localStorage.setItem('synapsis_activeTakeExamId', activeTakeExamId);
    } else {
      localStorage.removeItem('synapsis_activeTakeExamId');
    }
  }, [activeTakeExamId]);

  useEffect(() => {
    if (activeEditExamId) {
      localStorage.setItem('synapsis_activeEditExamId', activeEditExamId);
    } else {
      localStorage.removeItem('synapsis_activeEditExamId');
    }
  }, [activeEditExamId]);

  // Persist DB state changes to local storage & Cloud Firestore
  useEffect(() => {
    saveState(db);
    if (!isFirebaseLoading) {
      syncToFirestore(db);
    }
  }, [db, isFirebaseLoading]);

  // Persist current theme
  useEffect(() => {
    localStorage.setItem('synapsis-theme', theme);
  }, [theme]);

  // Adjust theme class on html/body element
  useEffect(() => {
    document.body.className = `${theme} font-sans min-h-screen transition-all duration-200`;
    document.documentElement.className = theme;
  }, [theme]);

  // Quick helper toast
  const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4200);
  };

  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);

  const handleManualSync = async () => {
    setIsSyncingFirebase(true);
    try {
      showToast('Sincronizando datos con Cloud Firestore...', 'info');
      const remoteDb = await fetchFullStateFromFirestore();
      if (remoteDb) {
        setDb(remoteDb);
        saveState(remoteDb);
        initializeSyncCache(remoteDb);
        showToast('¡Datos actualizados exitosamente desde Cloud Firestore! ✓', 'success');
        return;
      }
      const result = await fullBidirectionalSync(db);
      if (result && result.success) {
        setDb(result.mergedState);
        showToast(`¡Sincronización exitosa! ${result.pushedCount} registros sincronizados con Firebase.`, 'success');
        return result;
      } else {
        showToast('Aviso de sincronización: los datos continúan seguros localmente.', 'warning');
        return result;
      }
    } catch (err) {
      console.error('Manual sync failed', err);
      showToast('Error en la sincronización con Firebase.', 'error');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPass.trim();

    let matchedUser = db.users.find(u => {
      const userEmail = (u.email || '').trim().toLowerCase();
      const userCode = (u.codigo || u.id.substring(0, 4)).trim().toLowerCase();
      const passMatch = u.pass === cleanPass || 
                        (u.pass || '').toLowerCase() === cleanPass.toLowerCase() || 
                        userCode === cleanPass.toLowerCase();
      return (userEmail === cleanEmail || userCode === cleanEmail) && passMatch;
    });

    if (!matchedUser) {
      // Fallback self-healing system for demonstration/seed users
      const defaultUsers: User[] = [
        { id: 'admin-fallback-id', nombre: 'Administrador Synapsis', email: 'admin@synapsis.edu', pass: 'admin123', rol: 'admin', creado: new Date().toISOString() },
        { id: 'docente-fallback-id', nombre: 'Prof. de Jesús María García', email: 'juan.docente@synapsis.edu', pass: 'docente123', rol: 'docente', creado: new Date().toISOString() },
        { id: 'estudiante1-fallback-id', nombre: 'Carlos Andrés Pérez', email: 'maria.estudiante@synapsis.edu', pass: 'estudiante123', rol: 'estudiante', creado: new Date().toISOString() },
        { id: 'estudiante2-fallback-id', nombre: 'Ana Isabel Rodríguez', email: 'ana.estudiante@synapsis.edu', pass: 'estudiante123', rol: 'estudiante', creado: new Date().toISOString() },
      ];
      const fallbackUser = defaultUsers.find(u => {
        const userEmail = (u.email || '').trim().toLowerCase();
        const userCode = u.id.substring(0, 4).trim().toLowerCase();
        const passMatch = u.pass === cleanPass || 
                          (u.pass || '').toLowerCase() === cleanPass.toLowerCase() || 
                          userCode === cleanPass.toLowerCase();
        return (userEmail === cleanEmail || userCode === cleanEmail) && passMatch;
      });
      if (fallbackUser) {
        matchedUser = fallbackUser;
        updateUsers([...db.users, fallbackUser]);
      }
    }

    if (!matchedUser) {
      showToast('Credenciales incorrectas. Verifica tu correo/código y contraseña.', 'error');
      return;
    }

    setCurrentUser(matchedUser);
    localStorage.setItem('instituto_currentUser', JSON.stringify(matchedUser));
    
    // Set landing tab based on role
    if (matchedUser.rol === 'admin' || matchedUser.rol === 'docente') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('dashboard');
    }

    showToast(`¡Bienvenido al sistema, ${matchedUser.nombre}!`, 'success');
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPass(pass);
    setTimeout(() => {
      let matchedUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === pass);
      if (!matchedUser) {
        const defaultUsers: User[] = [
          { id: 'admin-fallback-id', nombre: 'Administrador Synapsis', email: 'admin@synapsis.edu', pass: 'admin123', rol: 'admin', creado: new Date().toISOString() },
          { id: 'docente-fallback-id', nombre: 'Prof. de Jesús María García', email: 'juan.docente@synapsis.edu', pass: 'docente123', rol: 'docente', creado: new Date().toISOString() },
          { id: 'estudiante1-fallback-id', nombre: 'Carlos Andrés Pérez', email: 'maria.estudiante@synapsis.edu', pass: 'estudiante123', rol: 'estudiante', creado: new Date().toISOString() },
          { id: 'estudiante2-fallback-id', nombre: 'Ana Isabel Rodríguez', email: 'ana.estudiante@synapsis.edu', pass: 'estudiante123', rol: 'estudiante', creado: new Date().toISOString() },
        ];
        const fallbackUser = defaultUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === pass);
        if (fallbackUser) {
          matchedUser = fallbackUser;
          updateUsers([...db.users, fallbackUser]);
        }
      }

      if (matchedUser) {
        setCurrentUser(matchedUser);
        localStorage.setItem('instituto_currentUser', JSON.stringify(matchedUser));
        setActiveTab('dashboard');
        showToast(`¡Sesión rápida iniciada: ${matchedUser.nombre}!`, 'success');
      } else {
        showToast('Credenciales incorrectas.', 'error');
      }
    }, 100);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('instituto_currentUser');
    setActiveTakeExamId(null);
    setActiveEditExamId(null);
    showToast('Sesión cerrada correctamente', 'success');
  };

  // State Updates proxies to keep master DB and Firestore in sync, permanently registering any deletions
  const syncDeletions = <T extends { id: string }>(collName: string, previousList: T[] = [], newList: T[] = []) => {
    const newIds = new Set(newList.map(item => item.id));
    previousList.forEach(item => {
      if (item && item.id && !newIds.has(item.id)) {
        registerDeletedId(item.id, collName);
      }
    });
  };

  const updateUsers = (next: User[]) => setDb(prev => {
    syncDeletions('users', prev.users, next);
    const updated = { ...prev, users: next };
    saveState(updated);
    return updated;
  });
  const updateInstitutions = (next: Institution[]) => setDb(prev => {
    syncDeletions('institutions', prev.institutions, next);
    const updated = { ...prev, institutions: next };
    saveState(updated);
    return updated;
  });
  const updateSubjects = (next: Subject[]) => setDb(prev => {
    syncDeletions('subjects', prev.subjects, next);
    const updated = { ...prev, subjects: next };
    saveState(updated);
    return updated;
  });
  const updateSemesters = (next: Semester[]) => setDb(prev => {
    syncDeletions('semesters', prev.semesters, next);
    const updated = { ...prev, semesters: next };
    saveState(updated);
    return updated;
  });
  const updateParciales = (next: Parcial[]) => setDb(prev => {
    syncDeletions('parciales', prev.parciales, next);
    const updated = { ...prev, parciales: next };
    saveState(updated);
    return updated;
  });
  const updateExams = (next: Exam[]) => setDb(prev => {
    syncDeletions('exams', prev.exams, next);
    const updated = { ...prev, exams: next };
    saveState(updated);
    return updated;
  });
  const updateSubmissions = (next: Submission[]) => setDb(prev => {
    syncDeletions('submissions', prev.submissions, next);
    const updated = { ...prev, submissions: next };
    saveState(updated);
    return updated;
  });
  const updateGradeRecords = (next: GradeRecord[]) => setDb(prev => {
    syncDeletions('gradeRecords', prev.gradeRecords, next);
    const updated = { ...prev, gradeRecords: next };
    saveState(updated);
    return updated;
  });
  const updateAssignments = (next: Assignment[]) => setDb(prev => {
    syncDeletions('assignments', prev.assignments, next);
    const updated = { ...prev, assignments: next };
    saveState(updated);
    return updated;
  });
  const updateAssignmentSubmissions = (next: AssignmentSubmission[]) => setDb(prev => {
    syncDeletions('assignmentSubmissions', prev.assignmentSubmissions, next);
    const updated = { ...prev, assignmentSubmissions: next };
    saveState(updated);
    return updated;
  });

  // Dynamic panel mapper
  const renderActivePanel = () => {
    if (!currentUser) return null;

    if (activeEditExamId) {
      if (isFirebaseLoading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Sincronizando con Firebase...
            </p>
          </div>
        );
      }
      return (
        <ExamBuilder
          examId={activeEditExamId}
          exams={db.exams}
          parciales={db.parciales}
          onBack={() => setActiveEditExamId(null)}
          onUpdateExams={updateExams}
          toast={showToast}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            currentUser={currentUser}
            users={db.users}
            exams={db.exams}
            submissions={db.submissions}
            theme={theme}
            onNavigate={(page) => {
              setActiveTab(page);
              setActiveEditExamId(null);
            }}
            onTakeExam={(examId) => setActiveTakeExamId(examId)}
          />
        );
      case 'misExamenes':
        return (
          <MisExamenes
            currentUser={currentUser}
            exams={db.exams}
            parciales={db.parciales}
            subjects={db.subjects}
            semesters={db.semesters}
            submissions={db.submissions}
            onOpenBuilder={(id) => setActiveEditExamId(id)}
            onUpdateExams={updateExams}
            toast={showToast}
            users={db.users}
          />
        );
      case 'resultados':
        return (
          <Resultados
            currentUser={currentUser}
            users={db.users}
            exams={db.exams}
            submissions={db.submissions}
            onUpdateSubmissions={updateSubmissions}
            toast={showToast}
          />
        );
      case 'misExamenesTake':
        return (
          <MisExamenesTake
            currentUser={currentUser}
            exams={db.exams}
            submissions={db.submissions}
            onTakeExam={(id) => setActiveTakeExamId(id)}
          />
        );
      case 'miHistorial':
        return (
          <MiHistorial
            currentUser={currentUser}
            exams={db.exams}
            submissions={db.submissions}
          />
        );
      case 'usuarios':
        return (
          <Usuarios
            currentUser={currentUser}
            users={db.users}
            subjects={db.subjects}
            semesters={db.semesters}
            onUpdateUsers={updateUsers}
            toast={showToast}
          />
        );
      case 'instituciones':
        return (
          <Instituciones
            instituciones={db.institutions}
            onUpdateInstituciones={updateInstitutions}
            toast={showToast}
          />
        );
      case 'asignaturas':
        return (
          <Asignaturas
            subjects={db.subjects}
            users={db.users}
            onUpdateSubjects={updateSubjects}
            toast={showToast}
          />
        );
      case 'semestres':
        return (
          <Semestres
            semesters={db.semesters}
            onUpdateSemesters={updateSemesters}
            toast={showToast}
          />
        );
      case 'parciales':
        return (
          <Parciales
            parciales={db.parciales}
            semesters={db.semesters}
            subjects={db.subjects}
            onUpdateParciales={updateParciales}
            toast={showToast}
            currentUser={currentUser}
            users={db.users}
          />
        );
      case 'registroNotas':
        return (
          <RegistroNotas
            gradeRecords={db.gradeRecords}
            users={db.users}
            subjects={db.subjects}
            parciales={db.parciales}
            onUpdateGradeRecords={updateGradeRecords}
            toast={showToast}
            currentUser={currentUser}
          />
        );
      case 'trabajos':
        return (
          <Trabajos
            currentUser={currentUser}
            assignments={db.assignments}
            parciales={db.parciales}
            subjects={db.subjects}
            assignmentSubmissions={db.assignmentSubmissions || []}
            onUpdateAssignments={updateAssignments}
            onUpdateAssignmentSubmissions={updateAssignmentSubmissions}
            toast={showToast}
            users={db.users}
          />
        );
      case 'historialAcademico':
        return (
          <HistorialAcademico
            users={db.users}
            exams={db.exams}
            submissions={db.submissions}
            gradeRecords={db.gradeRecords}
            subjects={db.subjects}
            parciales={db.parciales}
          />
        );
      case 'estudiantes':
        return (
          <Estudiantes
            users={db.users}
            subjects={db.subjects}
            semesters={db.semesters}
            onUpdateUsers={updateUsers}
            onNavigateToHistory={(stId) => {
              // Quick linkage
              setActiveTab('historialAcademico');
              // Let the browser context know
              showToast('Mostrando ficha del estudiante seleccionado', 'success');
            }}
            toast={showToast}
          />
        );
      case 'asistencia':
        return (
          <Asistencia
            currentUser={currentUser}
            users={db.users}
            subjects={db.subjects}
            semesters={db.semesters}
            toast={showToast}
          />
        );
      case 'boletines':
        return (
          <Boletines
            gradeRecords={db.gradeRecords}
            users={db.users}
            subjects={db.subjects}
            semesters={db.semesters}
            parciales={db.parciales}
            toast={showToast}
            currentUser={currentUser}
          />
        );
      case 'agenda':
        return (
          <Agenda
            currentUser={currentUser}
            users={db.users}
            subjects={db.subjects}
            semesters={db.semesters}
            toast={showToast}
          />
        );
      case 'tablon':
        return (
          <Tablon
            currentUser={currentUser}
            users={db.users}
            toast={showToast}
          />
        );
      case 'finanzas':
        return (
          <Finanzas
            currentUser={currentUser}
            users={db.users}
            toast={showToast}
          />
        );
      case 'educativo':
        return (
          <Educativo
            currentUser={currentUser}
            subjects={db.subjects}
            toast={showToast}
          />
        );
      case 'biblia':
        return (
          <Biblia />
        );
      default:
        return <div className="p-6">Página aún no implementada: {activeTab}</div>;
    }
  };

  // RENDER APP
  if (isFirebaseLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden text-center p-6 select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.15),transparent_60%)] pointer-events-none" />
        {/* Repeating star background simulation */}
        <div className="stars-overlay !opacity-55" />
        
        <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
        
        <h1 className="text-2xl font-extrabold text-white tracking-wide font-sans">Portal Synapsis</h1>
        <p className="text-cyan-400 font-mono text-[10px] tracking-widest uppercase mt-2">Sincronizando con Cloud Firestore...</p>
        <p className="text-slate-500 text-xs mt-4 leading-relaxed max-w-xs font-medium">Estableciendo canal intelectual bio-cósmico seguro con el servidor de la nube.</p>
      </div>
    );
  }

  return (
    <div className="app-root relative font-sans antialiased text-slate-800">
      
      {/* Stars Background Overlay for Cosmos Theme */}
      <div className="stars-overlay" />
      
      {/* GLOBAL TOAST ALERTS */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] animate-bounce">
          <div className={`px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-sm font-semibold select-none ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : toast.type === 'error' 
                ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold' 
                : toast.type === 'info'
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200 shadow-indigo-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '⚠'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* RENDER LOGIN IF NO SESSION */}
      {!currentUser ? (
        <div id="loginPage" className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#090d16] relative overflow-hidden flex-col select-none">
          {/* Subtle modern ambient background lighting */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-indigo-500/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 blur-3xl pointer-events-none" />
          
          {/* Subtle engineering grid backdrop */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }}
          />

          {/* Institutional Status Pill */}
          <div className="mb-5 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md text-slate-300 text-xs shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[11px] text-slate-300">Campus Virtual Conectado</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-[10px] text-indigo-400 font-semibold">synapsis-edu.web.app</span>
          </div>

          {/* Main Card */}
          <div className="w-full max-w-[420px] bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-7 sm:p-8 flex flex-col text-left animate-fade-in relative z-10 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-500/40 before:to-transparent">
            
            {/* Header Brand */}
            <div className="flex items-center gap-3.5 mb-5 pb-5 border-b border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 ring-1 ring-white/10 shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                  Synapsis
                </h1>
                <p className="text-[11px] font-semibold text-indigo-400 tracking-wide uppercase font-sans">
                  Campus Virtual Universitario
                </p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5 leading-snug">
                  Gestión académica, evaluaciones y calificaciones
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 font-sans">
                  Correo Institucional o Código
                </label>
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    name="email"
                    id="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="usuario@synapsis.edu o código"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-sans">
                    Contraseña
                  </label>
                </div>
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded cursor-pointer"
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Acceder al Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Quick Demo Access Badges */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Acceso Rápido por Rol
                </span>
                <span className="text-[10px] text-slate-500">1-clic demo</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => handleQuickLogin('admin@synapsis.edu', 'admin123')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-indigo-950/40 hover:border-indigo-600/60 text-slate-300 hover:text-indigo-300 transition-all cursor-pointer group shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Admin</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">Control total</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleQuickLogin('juan.docente@synapsis.edu', 'docente123')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-emerald-950/40 hover:border-emerald-600/60 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer group shadow-xs"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Docente</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">Evaluador</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleQuickLogin('maria.estudiante@synapsis.edu', 'estudiante123')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-blue-950/40 hover:border-blue-600/60 text-slate-300 hover:text-blue-300 transition-all cursor-pointer group shadow-xs"
                >
                  <BookOpen className="w-4 h-4 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Estudiante</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">Exámenes</span>
                </button>
              </div>

              {/* Share & QR Access Button */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate font-mono text-[11px] text-indigo-300">synapsis-edu.web.app</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-slate-200 shrink-0 font-medium">
                    <QrCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ver QR</span>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Institutional copyright note */}
          <p className="mt-6 text-[11px] text-slate-500 font-medium text-center">
            Synapsis Educational OS · Conexión Segura SSL · Firebase Firestore
          </p>
        </div>
      ) : (
        /* ENTIRE APPLICATION DASHBOARD VIEWPORT LAYOUT */
        <div className="min-h-screen flex flex-col">
          
          {/* HEADER ROW */}
          <Header 
            currentUser={currentUser} 
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onSyncFirebase={handleManualSync}
            isSyncing={isSyncingFirebase}
          />

          <div className="flex-1 flex relative pt-[60px]">
            
            {/* BACKDROP FOR MOBILE SCREEN OVERLAY */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/35 z-30 md:hidden backdrop-blur-[1.5px] transition-opacity duration-300 pointer-events-auto"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* SIDEBAR NAVIGATION COLUMN */}
            <Sidebar 
              currentUser={currentUser}
              activePage={activeTab}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onOpenShareModal={() => setIsShareModalOpen(true)}
              onPageChange={(tab) => {
                setActiveTab(tab);
                setActiveEditExamId(null); // clear builder state on page navigate
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
            />

            {/* MAIN CONTENT WORKSPACE */}
            <main className={`flex-1 p-4 md:p-6.5 bg-slate-50 max-w-full overflow-x-hidden relative transition-all duration-300 ease-in-out ${
              sidebarOpen ? 'md:pl-[266px]' : ''
            }`}>
              {renderActivePanel()}
            </main>
          </div>

          {/* FLOATING ACTION BUTTON TO SHOW COLLAPSED SIDEBAR */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed bottom-6 left-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl p-4 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 border-2 border-white focus:outline-none"
              title="Mostrar menú de navegación"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* ACTIVE TEST OVERLAY TAKING PORTAL PANEL */}
          {activeTakeExamId && (
            <ExamTakeScreen
              examId={activeTakeExamId}
              exams={db.exams}
              institutions={db.institutions}
              parciales={db.parciales}
              subjects={db.subjects}
              semesters={db.semesters}
              currentUser={currentUser}
              onExit={() => setActiveTakeExamId(null)}
              onSubmit={(sub) => {
                // Prepend new submittal
                const nextSubs = [sub, ...db.submissions];
                updateSubmissions(nextSubs);
                showToast('Examen enviado y guardado correctamente en la base de datos', 'success');
              }}
              toast={showToast}
            />
          )}

        </div>
      )}

      {/* SHARE APP & QR CODE MODAL */}
      <ShareAppModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        onSyncFirebase={handleManualSync}
        isSyncing={isSyncingFirebase}
      />

    </div>
  );
}
