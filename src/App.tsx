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
  Globe,
  KeyRound,
  UserPlus,
  LogIn,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Phone,
  FileText
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
  mergeStates,
  uid,
  now,
  generateStudentCode,
  AppState
} from './lib/db';
import { bioCosmicSynth } from './lib/audioEngine';
import { 
  fetchFullStateFromFirestore, 
  seedFirestore, 
  syncToFirestore, 
  initializeSyncCache,
  fullBidirectionalSync,
  registerDeletedId,
  saveDocToFirestore,
  deleteDocFromFirestore
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
import PasswordRecoveryModal from './components/PasswordRecoveryModal';
import UserProfileModal from './components/UserProfileModal';
import StudentRegisterModal from './components/StudentRegisterModal';

function purgeLegacyMockAdmin(state: AppState): AppState {
  const needsPurge = state.users.some(u => 
    u.email?.toLowerCase() === 'admin@synapsis.edu' || 
    u.id === 'admin-fallback-id' ||
    u.nombre === 'Administrador Synapsis'
  );
  if (!needsPurge) return state;

  registerDeletedId('admin-fallback-id', 'users');
  deleteDocFromFirestore('users', 'admin-fallback-id').catch(() => {});

  const cleanedUsers = state.users.filter(u => 
    u.email?.toLowerCase() !== 'admin@synapsis.edu' && 
    u.id !== 'admin-fallback-id' &&
    u.nombre !== 'Administrador Synapsis'
  );

  const hasAdmin = cleanedUsers.some(u => u.rol === 'admin');
  if (!hasAdmin) {
    const realAdmin: User = {
      id: 'admin-user-id',
      nombre: 'Administrador',
      email: 'soporteyabi@gmail.com',
      pass: 'admin123',
      rol: 'admin',
      creado: new Date().toISOString()
    };
    cleanedUsers.unshift(realAdmin);
    saveDocToFirestore('users', realAdmin).catch(() => {});
  }

  const updated = { ...state, users: cleanedUsers };
  saveState(updated);
  return updated;
}

export default function App() {
  // Database States
  const [db, setDb] = useState(() => purgeLegacyMockAdmin(getInitialState()));
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // Download entire Synapsis Portal database on mount
  useEffect(() => {
    async function loadFirestoreData() {
      try {
        console.log('Loading Synapsis portal database from Firestore...');
        const remoteDb = await fetchFullStateFromFirestore();
        if (remoteDb) {
          console.log('Successfully loaded state from Cloud Firestore.');
          const localDb = purgeLegacyMockAdmin(getInitialState());
          const mergedDb = purgeLegacyMockAdmin(mergeStates(localDb, remoteDb));
          setDb(mergedDb);
          saveState(mergedDb);
          initializeSyncCache(mergedDb);
        } else {
          // No remote database found, let's seed with current default list
          console.log('Firestore dataset is empty. Writing initial educational seed...');
          const localSeed = purgeLegacyMockAdmin(getInitialState());
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
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && (
          parsed.email?.toLowerCase() === 'admin@synapsis.edu' || 
          parsed.id === 'admin-fallback-id' ||
          parsed.nombre === 'Administrador Synapsis'
        )) {
          const migrated: User = {
            id: 'admin-user-id',
            nombre: 'Administrador',
            email: 'soporteyabi@gmail.com',
            pass: 'admin123',
            rol: 'admin',
            creado: new Date().toISOString()
          };
          localStorage.setItem('instituto_currentUser', JSON.stringify(migrated));
          return migrated;
        }
        return parsed;
      } catch (e) { return null; }
    }
    return null;
  });

  // Automatic migration for active session if user was logged in as mock superadmin
  useEffect(() => {
    if (currentUser && (
      currentUser.email?.toLowerCase() === 'admin@synapsis.edu' ||
      currentUser.id === 'admin-fallback-id' ||
      currentUser.nombre === 'Administrador Synapsis'
    )) {
      const realAdmin: User = {
        id: 'admin-user-id',
        nombre: 'Administrador',
        email: 'soporteyabi@gmail.com',
        pass: 'admin123',
        rol: 'admin',
        creado: new Date().toISOString()
      };
      setCurrentUser(realAdmin);
      localStorage.setItem('instituto_currentUser', JSON.stringify(realAdmin));
    }
  }, [currentUser]);

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

  // Login & Registration form states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Inline student registration states
  const [regNombre, setRegNombre] = useState('');
  const [regCedula, setRegCedula] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCelular, setRegCelular] = useState('');
  const [regSemestre, setRegSemestre] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterSuccess = (newUser: User, autoLogin: boolean) => {
    updateUsers([...db.users, newUser]);

    if (autoLogin) {
      setCurrentUser(newUser);
      localStorage.setItem('instituto_currentUser', JSON.stringify(newUser));
      setActiveTab('dashboard');
      showToast(`¡Bienvenido a Synapsis, ${newUser.nombre}! Tu cuenta ha sido creada.`, 'success');
      setIsRegisterModalOpen(false);
      setAuthMode('login');
    } else {
      setLoginEmail(newUser.email);
      setLoginPass(newUser.pass);
      setIsRegisterModalOpen(false);
      setAuthMode('login');
      showToast('Registro completado. Ya puedes ingresar con tus nuevas credenciales.', 'success');
    }
  };

  const handleSuggestRegEmail = () => {
    if (!regNombre.trim()) {
      showToast('Ingresa primero tu nombre completo para sugerir el correo', 'warning');
      return;
    }
    const clean = regNombre.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, ".");
    const parts = clean.split('.').filter(Boolean);
    const slug = parts.slice(0, 2).join('.');
    const randomNum = Math.floor(100 + Math.random() * 900);
    setRegEmail(`${slug || 'estudiante'}.${randomNum}@synapsis.edu`);
  };

  const handleInlineRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNombre = regNombre.trim().toUpperCase();
    const cleanCedula = regCedula.trim().toUpperCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPass = regPass.trim();

    if (!cleanNombre || cleanNombre.length < 3) {
      showToast('Ingresa tu nombre y apellido completos', 'warning');
      return;
    }
    if (!cleanCedula) {
      showToast('Ingresa tu número de documento o cédula', 'warning');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Ingresa un correo electrónico válido', 'warning');
      return;
    }
    if (cleanPass.length < 4) {
      showToast('La contraseña debe tener al menos 4 caracteres', 'warning');
      return;
    }
    if (cleanPass !== regConfirmPass.trim()) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setIsRegistering(true);
    try {
      const existsEmail = db.users.some(u => (u.email || '').toLowerCase() === cleanEmail);
      if (existsEmail) {
        showToast('Este correo ya está registrado en el campus', 'error');
        setIsRegistering(false);
        return;
      }
      const existsCedula = db.users.some(u => (u.cedula || '').toUpperCase() === cleanCedula);
      if (existsCedula) {
        showToast('Este documento ya se encuentra registrado', 'error');
        setIsRegistering(false);
        return;
      }

      const generatedCode = `EST-${generateStudentCode(db.users)}`;
      const activeSem = db.semesters.find(s => s.estado === 'activo') || db.semesters[0];
      const newStudent: User = {
        id: uid(),
        nombre: cleanNombre,
        email: cleanEmail,
        pass: cleanPass,
        rol: 'estudiante',
        creado: now(),
        cedula: cleanCedula,
        celular: regCelular.trim().toUpperCase() || undefined,
        semestre: regSemestre || (activeSem ? activeSem.id : undefined),
        codigo: generatedCode,
      };

      await saveDocToFirestore('users', newStudent);
      updateUsers([...db.users, newStudent]);
      setCurrentUser(newStudent);
      localStorage.setItem('instituto_currentUser', JSON.stringify(newStudent));
      setActiveTab('dashboard');
      showToast(`¡Bienvenido a Synapsis, ${cleanNombre}! Matrícula ${generatedCode} asignada.`, 'success');
      setAuthMode('login');
    } catch (err) {
      console.error('Error al registrar estudiante:', err);
      showToast('No se pudo completar el registro. Intenta de nuevo.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

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
      const userCedula = (u.cedula || '').trim().toLowerCase();
      const passMatch = u.pass === cleanPass || 
                        (u.pass || '').toLowerCase() === cleanPass.toLowerCase() || 
                        userCode === cleanPass.toLowerCase() ||
                        userCedula === cleanPass.toLowerCase();
      return (userEmail === cleanEmail || userCode === cleanEmail || userCedula === cleanEmail) && passMatch;
    });

    if (!matchedUser) {
      // Fallback self-healing system for demonstration/seed users
      const defaultUsers: User[] = [
        { id: 'admin-user-id', nombre: 'Administrador', email: 'soporteyabi@gmail.com', pass: 'admin123', rol: 'admin', creado: new Date().toISOString() },
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
          { id: 'admin-user-id', nombre: 'Administrador', email: 'soporteyabi@gmail.com', pass: 'admin123', rol: 'admin', creado: new Date().toISOString() },
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

  const handlePasswordRestored = (updatedUser: User, newPass: string) => {
    const exists = db.users.some(u => u.id === updatedUser.id);
    if (exists) {
      updateUsers(db.users.map(u => u.id === updatedUser.id ? updatedUser : u));
    } else {
      updateUsers([...db.users, updatedUser]);
    }
    // Prefill form for instant login convenience
    setLoginEmail(updatedUser.codigo || updatedUser.email);
    setLoginPass(newPass);
    setIsRecoveryModalOpen(false);
    showToast(`¡Contraseña de ${updatedUser.nombre} actualizada correctamente! Ya puedes acceder.`, 'success');
  };

  const handleUpdateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('instituto_currentUser', JSON.stringify(updatedUser));
    const exists = db.users.some(u => u.id === updatedUser.id);
    if (exists) {
      updateUsers(db.users.map(u => u.id === updatedUser.id ? updatedUser : u));
    } else {
      updateUsers([...db.users, updatedUser]);
    }
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
            onUpdateSubmissions={updateSubmissions}
            toast={showToast}
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
        <div id="loginPage" className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#080c16] relative overflow-hidden flex-col select-none">
          {/* Subtle modern ambient background lighting */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-500/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 blur-3xl pointer-events-none" />
          
          {/* Engineering grid backdrop */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }}
          />

          {/* Institutional Status Pill */}
          <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-slate-300 text-xs shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[11px] text-slate-300">Campus Virtual Conectado</span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] text-slate-400">Cloud Firestore Sincronizado</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-[10px] text-indigo-400 font-semibold">synapsis-edu.web.app</span>
          </div>

          {/* Main Wide Executive Card */}
          <div className="w-full max-w-5xl bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-800/90 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12 animate-fade-in before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-emerald-400">
            
            {/* LEFT COLUMN: Campus Identity, Features & Quick Demo Roles */}
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 lg:p-9 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between relative">
              <div>
                {/* Brand Header */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/20 shrink-0">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black text-white tracking-tight font-display">
                        Synapsis
                      </h1>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                        OFICIAL
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mt-0.5">
                      Campus Virtual Universitario
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-6 font-normal">
                  Plataforma integral para evaluaciones digitales, registro de calificaciones, asistencia y seguimiento académico.
                </p>

                {/* Key Institutional Features */}
                <div className="space-y-3 mb-8 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Acceso Cifrado Institucional</span>
                      <span className="text-[11px] text-slate-400">Conexión con autenticación segura por rol.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Exámenes con Temporizador</span>
                      <span className="text-[11px] text-slate-400">Control de tiempo, navegación e intentos.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Calificaciones en Tiempo Real</span>
                      <span className="text-[11px] text-slate-400">Boletines y cálculo automático de notas.</span>
                    </div>
                  </div>
                </div>

                {/* Quick Demo Access Badges */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Acceso Rápido por Perfil</span>
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono font-medium">1 clic</span>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const adminAccount = db.users.find(u => u.rol === 'admin') || {
                        nombre: 'Administrador',
                        email: 'soporteyabi@gmail.com',
                        pass: 'admin123'
                      };
                      return (
                        <button 
                          type="button"
                          onClick={() => handleQuickLogin(adminAccount.email, adminAccount.pass || 'admin123')}
                          className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-indigo-950/40 hover:border-indigo-500/60 transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block leading-snug">{adminAccount.nombre || 'Administrador'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{adminAccount.email}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            Control Total
                          </span>
                        </button>
                      );
                    })()}

                    <button 
                      type="button"
                      onClick={() => handleQuickLogin('juan.docente@synapsis.edu', 'docente123')}
                      className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-emerald-950/40 hover:border-emerald-500/60 transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block leading-snug">Docente Titular</span>
                          <span className="text-[10px] text-slate-400 font-mono">juan.docente@synapsis.edu</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Evaluador
                      </span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleQuickLogin('maria.estudiante@synapsis.edu', 'estudiante123')}
                      className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-blue-950/40 hover:border-blue-500/60 transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block leading-snug">Estudiante Activo</span>
                          <span className="text-[10px] text-slate-400 font-mono">maria.estudiante@synapsis.edu</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        Exámenes
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Bar */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-mono text-indigo-300">synapsis-edu.web.app</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ver QR</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Mode Selector & Form Hub */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-slate-900/60">
              <div>
                {/* Header Instruction */}
                <div className="mb-6">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block">
                    {authMode === 'login' ? 'Portal de Acceso Institucional' : 'Módulo de Matrícula Estudiantil'}
                  </span>
                  <h2 className="text-2xl font-bold text-white tracking-tight font-display">
                    {authMode === 'login' ? 'Identificación de Usuario' : 'Registro de Nuevo Estudiante'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {authMode === 'login' 
                      ? 'Selecciona tu tipo de acceso o ingresa con tus datos académicos:'
                      : 'Completa tus datos para crear tu cuenta de alumno y acceder de inmediato a tus exámenes:'}
                  </p>
                </div>

                {/* Ultra Clear Segmented Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800/90 mb-6 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Sesión</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/30'
                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-900'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Nuevo Estudiante</span>
                  </button>
                </div>

                {/* TAB 1: INICIAR SESIÓN */}
                {authMode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300 block font-sans">
                          Usuario, Correo o Cédula
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">Cualquiera de los 3 es válido</span>
                      </div>
                      <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input 
                          type="text" 
                          name="email"
                          id="email"
                          required
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder="ej: usuario@synapsis.edu, EST-001 o Cédula"
                          className="login-input w-full pl-10 pr-3.5 py-3 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300 font-sans">
                          Contraseña
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsRecoveryModalOpen(true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={loginPass}
                          onChange={e => setLoginPass(e.target.value)}
                          placeholder="Digita tu contraseña institucional"
                          className="login-input w-full pl-10 pr-10 py-3 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded cursor-pointer"
                          title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <span>Acceder al Portal Académico</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                )}

                {/* TAB 2: REGISTRO DE NUEVO ESTUDIANTE */}
                {authMode === 'register' && (
                  <form onSubmit={handleInlineRegister} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Nombre Completo *
                        </label>
                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={regNombre}
                            onChange={e => setRegNombre(e.target.value)}
                            placeholder="Ej: Andrés Morales"
                            className="w-full pl-9 pr-3 py-2.5 bg-transparent text-white text-xs outline-none uppercase placeholder:text-slate-500 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Nº Documento / Cédula *
                        </label>
                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={regCedula}
                            onChange={e => setRegCedula(e.target.value)}
                            placeholder="Ej: 1098765432"
                            className="w-full pl-9 pr-3 py-2.5 bg-transparent text-white text-xs outline-none placeholder:text-slate-500 font-medium font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300 block">
                          Correo Electrónico *
                        </label>
                        <button
                          type="button"
                          onClick={handleSuggestRegEmail}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer transition"
                        >
                          ✨ Generar institucional
                        </button>
                      </div>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="tu.nombre@synapsis.edu o correo personal"
                        className="login-input w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/70 text-white text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Celular / WhatsApp (Opcional)
                        </label>
                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="tel"
                            value={regCelular}
                            onChange={e => setRegCelular(e.target.value)}
                            placeholder="Ej: +57 300 123 4567"
                            className="w-full pl-9 pr-3 py-2.5 bg-transparent text-white text-xs outline-none placeholder:text-slate-500 font-medium font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Período / Semestre
                        </label>
                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          <select
                            value={regSemestre}
                            onChange={e => setRegSemestre(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-white text-xs outline-none rounded-xl cursor-pointer"
                          >
                            <option value="">Seleccionar Semestre</option>
                            {db.semesters.map(sem => (
                              <option key={sem.id} value={sem.id}>
                                {sem.nombre} {sem.estado === 'activo' ? '✓ Vigente' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Contraseña *
                        </label>
                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type={showRegPass ? "text" : "password"}
                            required
                            value={regPass}
                            onChange={e => setRegPass(e.target.value)}
                            placeholder="Mínimo 4 caracteres"
                            className="login-input w-full pl-9 pr-8 py-2.5 bg-transparent text-white text-xs outline-none placeholder:text-slate-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPass(!showRegPass)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 transition p-0.5 rounded cursor-pointer"
                          >
                            {showRegPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Confirmar Contraseña *
                        </label>
                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type={showRegPass ? "text" : "password"}
                            required
                            value={regConfirmPass}
                            onChange={e => setRegConfirmPass(e.target.value)}
                            placeholder="Repite tu contraseña"
                            className="login-input w-full pl-9 pr-3 py-2.5 bg-transparent text-white text-xs outline-none placeholder:text-slate-500 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRegistering ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Guardando matrícula en la nube...</span>
                        </>
                      ) : (
                        <>
                          <span>Completar Registro e Ingresar al Campus</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Clear footer transition between modes */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {authMode === 'login' ? (
                  <>
                    <span className="text-slate-400">
                      ¿Eres alumno nuevo y aún no tienes matrícula?
                    </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Registrarme como estudiante →</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400">
                      ¿Ya tienes una cuenta registrada en el campus?
                    </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Volver a Iniciar Sesión →</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Institutional copyright note */}
          <p className="mt-6 text-[11px] text-slate-500 font-medium text-center">
            Synapsis Educational OS · Conexión Segura SSL · Firebase Firestore Sincronizado
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
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
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
              onSubmit={async (sub) => {
                // 1. Direct Cloud Firestore persistence for submission record
                try {
                  await saveDocToFirestore('submissions', sub);
                } catch (err) {
                  console.error('Error saving submission to Firestore:', err);
                }

                // 2. Prepend new submittal to state
                const nextSubs = [sub, ...db.submissions];
                updateSubmissions(nextSubs);

                // 3. Automatically link and persist grade record in gradeRecords
                try {
                  const examObj = db.exams.find(e => e.id === sub.examenId);
                  const subjectObj = db.subjects.find(s => 
                    s.id === examObj?.materia || 
                    s.nombre.trim().toLowerCase() === (examObj?.materia || '').trim().toLowerCase()
                  );
                  const subjectId = subjectObj?.id || examObj?.materia || '';
                  const parcialId = examObj?.parcialId || db.parciales[0]?.id || '';

                  // Institutional 0.0 - 5.0 scale
                  const gradeVal = Math.round(((sub.puntaje || 0) / 100) * 5.0 * 10) / 10;
                  const isEV1 = /evaluaci[oó]n\s*i\b/i.test(examObj?.titulo || '') || /(parcial|evaluacion|ev)\s*1\b/i.test(examObj?.titulo || '');
                  const isEV2 = /evaluaci[oó]n\s*ii\b/i.test(examObj?.titulo || '') || /(parcial|evaluacion|ev)\s*2\b/i.test(examObj?.titulo || '');

                  const existingGradeIdx = db.gradeRecords.findIndex(g => 
                    g.estudianteId === sub.estudianteId &&
                    (g.asignaturaId === subjectId || g.asignaturaId === examObj?.materia) &&
                    (!parcialId || g.parcialId === parcialId)
                  );

                  let nextGradeRecords = [...db.gradeRecords];
                  let targetGradeRecord: GradeRecord;

                  if (existingGradeIdx >= 0) {
                    const existing = nextGradeRecords[existingGradeIdx];
                    const n1 = isEV1 ? gradeVal : (existing.notaEV1 !== undefined ? existing.notaEV1 : existing.nota);
                    const n2 = isEV2 ? gradeVal : (existing.notaEV2 !== undefined ? existing.notaEV2 : existing.nota);
                    const nT = existing.notaTrabajo !== undefined ? existing.notaTrabajo : existing.nota;
                    const finalNota = Math.round(((n1 * 0.35) + (n2 * 0.35) + (nT * 0.30)) * 10) / 10;

                    targetGradeRecord = {
                      ...existing,
                      notaEV1: n1,
                      notaEV2: n2,
                      notaTrabajo: nT,
                      nota: finalNota,
                      aprobado: finalNota >= 3.0,
                      actualizado: new Date().toISOString()
                    };
                    nextGradeRecords[existingGradeIdx] = targetGradeRecord;
                  } else {
                    targetGradeRecord = {
                      id: uid(),
                      estudianteId: sub.estudianteId,
                      asignaturaId: subjectId,
                      parcialId: parcialId,
                      nota: gradeVal,
                      notaEV1: isEV1 ? gradeVal : (isEV2 ? 0 : gradeVal),
                      notaEV2: isEV2 ? gradeVal : 0,
                      notaTrabajo: 3.0,
                      aprobado: gradeVal >= 3.0,
                      creado: new Date().toISOString(),
                      actualizado: new Date().toISOString()
                    };
                    nextGradeRecords = [targetGradeRecord, ...nextGradeRecords];
                  }

                  updateGradeRecords(nextGradeRecords);
                  await saveDocToFirestore('gradeRecords', targetGradeRecord);
                } catch (gradeErr) {
                  console.error('Error synchronizing exam submission to grade records:', gradeErr);
                }

                showToast('Examen enviado y guardado exitosamente en el registro académico ✓', 'success');
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

      {/* SOLID SELF-SERVICE PASSWORD RECOVERY MODAL */}
      <PasswordRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        users={db.users}
        onPasswordRestored={handlePasswordRestored}
        toast={showToast}
        initialIdentifier={loginEmail}
      />

      {/* IN-SESSION USER PROFILE AND PASSWORD UPDATE MODAL */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          toast={showToast}
        />
      )}

      {/* STUDENT SELF-REGISTRATION MODAL */}
      <StudentRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        users={db.users}
        semesters={db.semesters}
        onRegisterSuccess={handleRegisterSuccess}
        toast={showToast}
      />

    </div>
  );
}
