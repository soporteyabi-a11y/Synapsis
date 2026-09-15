/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, Subject, Semester, Parcial, GradeRecord, Assignment, AssignmentSubmission, Institution, Exam, Submission 
} from '../types';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function now(): string {
  return new Date().toISOString();
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function avatarColor(name: string): string {
  const colors = ['#1a56db', '#0f7b3e', '#b45309', '#7c3aed', '#0e7490', '#be185d'];
  let h = 0;
  const target = name || 'A';
  for (let i = 0; i < target.length; i++) {
    h = (h * 31 + target.charCodeAt(i)) % colors.length;
  }
  return colors[Math.abs(h)];
}

export function avatarLetter(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

/**
 * Genera automáticamente un código único para un estudiante (4 caracteres alfanuméricos en mayúscula).
 */
export function generateStudentCode(existingUsers: User[] = []): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let attempts = 0;
  do {
    code = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    attempts++;
  } while (existingUsers.some(u => (u.codigo || '').toUpperCase() === code) && attempts < 1000);
  return code;
}

/**
 * Genera automáticamente un código para una asignatura basado en su nombre y secuencia académica.
 * No repite 101 para todas las materias; incrementa secuencialmente en el catálogo (101, 102, 103, 104...)
 * y clasifica por niveles (serie 100, 200, 300...) según corresponda.
 */
export function generateSubjectCode(nombre: string, existingSubjects: Subject[] = []): string {
  // Limpiar nombre y remover acentos
  const clean = (nombre || '')
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "");

  const words = clean.split(/\s+/).filter(Boolean);

  // Palabras conectoras o números romanos que no deben considerarse para el prefijo de letras
  const stopWords = new Set([
    'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'EN', 'POR', 'PARA', 'CON', 'A', 'AL',
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ]);

  const meaningfulWords = words.filter(w => !stopWords.has(w));
  const wordsToUse = meaningfulWords.length > 0 ? meaningfulWords : words;

  let prefix = 'ASG';

  if (wordsToUse.length >= 3) {
    prefix = wordsToUse.slice(0, 3).map(w => w[0]).join('');
  } else if (wordsToUse.length === 2) {
    prefix = (wordsToUse[0].substring(0, 2) + wordsToUse[1].substring(0, 1)).padEnd(3, 'X');
  } else if (wordsToUse.length === 1 && wordsToUse[0].length >= 3) {
    prefix = wordsToUse[0].substring(0, 3);
  } else if (wordsToUse.length === 1 && wordsToUse[0].length > 0) {
    prefix = wordsToUse[0].padEnd(3, 'X');
  }

  // Detección de nivel o año académico para asignar el bloque numérico correspondiente (100, 200, 300...)
  let baseTier = 100;
  if (/\b(VI|6|SEXTO|AVANZADO\s*2)\b/.test(clean)) {
    baseTier = 600;
  } else if (/\b(V|5|QUINTO)\b/.test(clean)) {
    baseTier = 500;
  } else if (/\b(IV|4|CUARTO)\b/.test(clean)) {
    baseTier = 400;
  } else if (/\b(III|3|TERCERO|AVANZADO)\b/.test(clean)) {
    baseTier = 300;
  } else if (/\b(II|2|SEGUNDO|INTERMEDIO)\b/.test(clean)) {
    baseTier = 200;
  }

  // Extraer números existentes de asignaturas en el catálogo para el nivel correspondiente
  const existingNumbers = existingSubjects
    .map(s => {
      const match = (s.codigo || '').match(/(\d{3})/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n >= baseTier && n < baseTier + 100);

  // Calcular el siguiente número correlativo disponible
  let num = baseTier + 1; // 101, 201, 301... por defecto si es la primera
  if (existingNumbers.length > 0) {
    const highest = Math.max(...existingNumbers);
    num = Math.max(baseTier + 1, highest + 1);
  }

  // Garantizar que no colisione con ninguna asignatura existente
  while (existingSubjects.some(s => (s.codigo || '').toUpperCase().trim() === `${prefix}-${num}`)) {
    num++;
  }

  return `${prefix}-${num}`;
}

/**
 * Genera automáticamente un código para un semestre basado en su nombre o el año actual (ej. SEM-26A, SEM-26B, SEM-27A).
 */
export function generateSemesterCode(nombre: string, existingSemesters: Semester[] = []): string {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // "26"

  // Intentar detectar si el nombre contiene año (ej: 2026, 2027) y período (I, II, 1, 2, A, B)
  const clean = (nombre || '').trim().toUpperCase();
  const yearMatch = clean.match(/(?:20)?(\d{2})/);
  const detectedYear = yearMatch ? yearMatch[1] : yearSuffix;

  let period = 'A';
  if (clean.includes('-II') || clean.includes(' II') || clean.includes('-2') || clean.includes(' 2') || clean.includes('-B') || clean.includes(' B')) {
    period = 'B';
  } else if (clean.includes('-III') || clean.includes(' III') || clean.includes('-3') || clean.includes(' C')) {
    period = 'C';
  } else if (clean.includes('-I') || clean.includes(' I') || clean.includes('-1') || clean.includes(' A')) {
    period = 'A';
  } else {
    // Si no se especifica período en el nombre, contar cuántos semestres hay ya para ese año
    const countForYear = existingSemesters.filter(s => (s.codigo || '').includes(detectedYear)).length;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    period = alphabet[countForYear % alphabet.length] || 'A';
  }

  let code = `SEM-${detectedYear}${period}`;
  let counter = 1;
  while (existingSemesters.some(s => (s.codigo || '').toUpperCase().trim() === code)) {
    code = `SEM-${detectedYear}${period}${counter}`;
    counter++;
  }

  return code;
}

export interface AppState {
  users: User[];
  institutions: Institution[];
  subjects: Subject[];
  semesters: Semester[];
  parciales: Parcial[];
  exams: Exam[];
  submissions: Submission[];
  gradeRecords: GradeRecord[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
}

function buildDefaultSeedData(): AppState {
  const uAdminId = 'admin-user-id';
  const uDocenteId = 'docente-fallback-id';
  const uEstudiante1Id = 'estudiante1-fallback-id';
  const uEstudiante2Id = 'estudiante2-fallback-id';

  const defaultUsers: User[] = [
    { id: uAdminId, nombre: 'Administrador', email: 'soporteyabi@gmail.com', pass: 'admin123', rol: 'admin', creado: now() },
    { id: uDocenteId, nombre: 'Prof. de Jesús María García', email: 'juan.docente@synapsis.edu', pass: 'docente123', rol: 'docente', creado: now() },
    { id: uEstudiante1Id, nombre: 'Carlos Andrés Pérez', email: 'maria.estudiante@synapsis.edu', pass: 'estudiante123', rol: 'estudiante', creado: now() },
    { id: uEstudiante2Id, nombre: 'Ana Isabel Rodríguez', email: 'ana.estudiante@synapsis.edu', pass: 'estudiante123', rol: 'estudiante', creado: now() },
  ];

  const subMathId = 'sub-math-id';
  const subSocialId = 'sub-social-id';
  const subLangId = 'sub-lang-id';

  const defaultSubjects: Subject[] = [
    { id: subMathId, nombre: 'MATEMÁTICAS', codigo: 'MAT-101', docenteId: uDocenteId, creado: now() },
    { id: subSocialId, nombre: 'CIENCIAS SOCIALES', codigo: 'SOC-102', docenteId: uDocenteId, creado: now() },
    { id: subLangId, nombre: 'LENGUA Y LITERATURA', codigo: 'LEN-103', docenteId: uDocenteId, creado: now() },
  ];

  const sem1Id = 'sem-1-id';
  const sem2Id = 'sem-2-id';

  const defaultSemesters: Semester[] = [
    { id: sem1Id, nombre: 'SEMESTRE 2026-I', codigo: 'SEM-26A', estado: 'activo', creado: now() },
    { id: sem2Id, nombre: 'SEMESTRE 2026-II', codigo: 'SEM-26B', estado: 'inactivo', creado: now() },
  ];

  const arc1Id = 'arc-1-id';
  const arc2Id = 'arc-2-id';

  const defaultParciales: Parcial[] = [
    { id: arc1Id, nombre: 'PRIMER CORTE - 30%', semestre: sem1Id, asignatura: subMathId, estado: 'abierto', porcentaje: 30, fechaInicio: '2026-02-01', fechaFin: '2026-04-10', creado: now() },
    { id: arc2Id, nombre: 'SEGUNDO CORTE - 30%', semestre: sem1Id, asignatura: subSocialId, estado: 'abierto', porcentaje: 30, fechaInicio: '2026-04-11', fechaFin: '2026-06-30', creado: now() },
  ];

  const defaultGradeRecords: GradeRecord[] = [
    {
      id: 'grade-1-id',
      estudianteId: uEstudiante1Id,
      asignaturaId: subMathId,
      parcialId: arc1Id,
      nota: 4.2,
      notaEV1: 4.3,
      notaEV2: 4.7,
      notaTrabajo: 3.6,
      aprobado: true,
      comentario: 'EXCELENTE SUSTENTACIÓN DEL ANÁLISIS DIFERENCIAL.',
      creado: now(),
      actualizado: now(),
    },
    {
      id: 'grade-2-id',
      estudianteId: uEstudiante2Id,
      asignaturaId: subSocialId,
      parcialId: arc2Id,
      nota: 2.8,
      notaEV1: 2.5,
      notaEV2: 3.0,
      notaTrabajo: 2.9,
      aprobado: false,
      comentario: 'REQUIERE REPASAR LOS HITOS DEL FRENTE DE REFORMA SOCIAL COLOMBIANA.',
      creado: now(),
      actualizado: now(),
    },
  ];

  const defaultAssignments: Assignment[] = [
    {
      id: 'assignment-1-id',
      titulo: 'ENSAYO CRÍTICO DE SOCIALES',
      descripcion: 'REDACTA UN ANÁLISIS DE 500 PALABRAS SOBRE EL IMPACTO INSTITUCIONAL DEL FRENTE NACIONAL.',
      parcialId: arc2Id,
      puntos: 100,
      fechaEntrega: '2026-06-25',
      creado: now(),
      actualizado: now(),
    },
  ];

  const defaultInstitutions: Institution[] = [
    {
      id: 'inst-1-id',
      nombre: 'INSTITUTO SYNAPSIS',
      tipo: 'Colegio',
      codigo: 'NIT-322199',
      ciudad: 'BOGOTÁ D.C.',
      direccion: 'AVENIDA EL DORADO #68-12',
      telefono: '+57 (1) 456-7890',
      email: 'contacto@synapsis.edu',
      creado: now(),
    },
  ];

  const defaultExams: Exam[] = [
    {
      id: 'exam-1-id',
      titulo: 'ÁLGEBRA BÁSICA Y ECUACIONES',
      materia: 'Matemáticas',
      parcialId: arc1Id,
      descripcion: 'EVALUACIÓN CRONOMETRADA DE SISTEMAS DE ECUACIONES DE PRIMER Y SEGUNDO GRADO.',
      docenteId: uDocenteId,
      estado: 'activo',
      tiempo: 60,
      intentos: 1,
      aprobacion: 60,
      aleatorio: false,
      mostrarNota: true,
      creado: now(),
      preguntas: [
        {
          id: 'q1-id',
          texto: '¿CUÁL ES EL VALOR DE X QUE SATISFACE LA ECUACIÓN: 2X - 3 = 7?',
          tipo: 'multiple',
          puntos: 25,
          opciones: ['x = 2', 'x = 5', 'x = 4', 'x = 10'],
          correctas: [1],
        },
        {
          id: 'q2-id',
          texto: 'RESUELVE EL SIGUIENTE BINOMIO AL CUADRADO: (A + B)².',
          tipo: 'multiple',
          puntos: 25,
          opciones: [
            'a² + 2ab + b²',
            'a² + b²',
            'a² - 2ab + b²',
            '2a + 2b',
          ],
          correctas: [0],
        },
        {
          id: 'q3-id',
          texto: '¿LA FÓRMULA CUADRÁTICA PERMITE OBTENER LAS RAÍCES DE FUNCIONES POLINÓMICAS DE GRADO 2?',
          tipo: 'tf',
          puntos: 25,
          opciones: ['Verdadero', 'Falso'],
          correctas: [0],
        },
      ],
    },
  ];

  return {
    users: defaultUsers,
    institutions: defaultInstitutions,
    subjects: defaultSubjects,
    semesters: defaultSemesters,
    parciales: defaultParciales,
    exams: defaultExams,
    submissions: [],
    gradeRecords: defaultGradeRecords,
    assignments: defaultAssignments,
    assignmentSubmissions: [],
  };
}

export function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem('ep_deleted_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

export function markAsDeleted(id: string) {
  if (!id) return;
  try {
    const deleted = getDeletedIds();
    deleted.add(id);
    localStorage.setItem('ep_deleted_ids', JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.error('Failed to mark entity as deleted', e);
  }
}

export function getInitialState(): AppState {
  const defaults = buildDefaultSeedData();
  const deletedIds = getDeletedIds();
  const isInitialized = localStorage.getItem('ep_initialized') === 'true';

  const loadCollection = (key: string, defaultItems: any[] = []) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const loaded: any[] = JSON.parse(raw);
        if (Array.isArray(loaded)) {
          return loaded.filter(item => item && item.id && !deletedIds.has(item.id));
        }
      }
      if (!isInitialized) {
        return defaultItems.filter(item => item && item.id && !deletedIds.has(item.id));
      }
      return [];
    } catch (e) {
      return !isInitialized ? defaultItems.filter(item => item && item.id && !deletedIds.has(item.id)) : [];
    }
  };

  const users = loadCollection('ep_users', defaults.users);
  const institutions = loadCollection('ep_instituciones', defaults.institutions);
  const subjects = loadCollection('ep_subjects', defaults.subjects);
  const semesters = loadCollection('ep_semesters', defaults.semesters);
  const parciales = loadCollection('ep_parciales', defaults.parciales);
  const exams = loadCollection('ep_exams', defaults.exams);
  const submissions = loadCollection('ep_submissions', defaults.submissions);
  const gradeRecords = loadCollection('ep_notas', defaults.gradeRecords);
  const assignments = loadCollection('ep_trabajos', defaults.assignments);
  const assignmentSubmissions = loadCollection('ep_entregas_trabajos', defaults.assignmentSubmissions);

  const state: AppState = {
    users,
    institutions,
    subjects,
    semesters,
    parciales,
    exams,
    submissions,
    gradeRecords,
    assignments,
    assignmentSubmissions,
  };

  saveState(state);
  return state;
}

export function saveState(state: AppState) {
  const deletedIds = getDeletedIds();

  const filterAlive = (list: any[] = []) => {
    if (!Array.isArray(list)) return [];
    return list.filter(item => item && item.id && !deletedIds.has(item.id));
  };

  localStorage.setItem('ep_users', JSON.stringify(filterAlive(state.users)));
  localStorage.setItem('ep_instituciones', JSON.stringify(filterAlive(state.institutions)));
  localStorage.setItem('ep_subjects', JSON.stringify(filterAlive(state.subjects)));
  localStorage.setItem('ep_semesters', JSON.stringify(filterAlive(state.semesters)));
  localStorage.setItem('ep_parciales', JSON.stringify(filterAlive(state.parciales)));
  localStorage.setItem('ep_exams', JSON.stringify(filterAlive(state.exams)));
  localStorage.setItem('ep_submissions', JSON.stringify(filterAlive(state.submissions)));
  localStorage.setItem('ep_notas', JSON.stringify(filterAlive(state.gradeRecords)));
  localStorage.setItem('ep_trabajos', JSON.stringify(filterAlive(state.assignments)));
  localStorage.setItem('ep_entregas_trabajos', JSON.stringify(filterAlive(state.assignmentSubmissions || [])));
  localStorage.setItem('ep_initialized', 'true');
}

export function mergeStates(local: AppState, remote: AppState): AppState {
  const defaults = buildDefaultSeedData();
  const deletedIds = getDeletedIds();
  const merged: AppState = { ...remote };

  const keys: (keyof AppState)[] = [
    'users',
    'institutions',
    'subjects',
    'semesters',
    'parciales',
    'exams',
    'submissions',
    'gradeRecords',
    'assignments',
    'assignmentSubmissions'
  ];

  keys.forEach((key) => {
    let localList = ((local[key] || []) as any[]).filter(item => item && item.id && !deletedIds.has(item.id));
    let remoteList = ((remote[key] || []) as any[]).filter(item => item && item.id && !deletedIds.has(item.id));

    // Fall back to seed defaults only if both are empty and not initialized
    const isInit = localStorage.getItem('ep_initialized') === 'true';
    if (!isInit && localList.length === 0 && remoteList.length === 0 && defaults[key] && defaults[key].length > 0) {
      localList = (defaults[key] as any[]).filter(item => item && item.id && !deletedIds.has(item.id));
    }

    const itemMap = new Map<string, any>();

    // 1. Remote items from Cloud Firestore
    remoteList.forEach((remoteItem: any) => {
      if (remoteItem && remoteItem.id && !deletedIds.has(remoteItem.id)) {
        itemMap.set(remoteItem.id, remoteItem);
      }
    });

    // 2. Local items: add new ones, or overwrite remote if local has newer timestamp
    localList.forEach((localItem: any) => {
      if (!localItem || !localItem.id || deletedIds.has(localItem.id)) return;

      const remoteItem = itemMap.get(localItem.id);
      if (!remoteItem) {
        itemMap.set(localItem.id, localItem);
      } else {
        const localTime = localItem.actualizado || localItem.creado || '';
        const remoteTime = remoteItem.actualizado || remoteItem.creado || '';
        if (localTime > remoteTime) {
          itemMap.set(localItem.id, localItem);
        }
      }
    });

    merged[key] = Array.from(itemMap.values()) as any;
  });

  return merged;
}

