/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Check, 
  CheckSquare, CircleDot, HelpCircle, Eye, EyeOff, LayoutGrid 
} from 'lucide-react';
import { Exam, Question, Parcial, Subject, Semester } from '../types';
import { uid } from '../lib/db';
import { saveDocToFirestore } from '../lib/firebase';
import AutoExpandingTextarea from './AutoExpandingTextarea';

interface ExamBuilderProps {
  examId: string;
  exams: Exam[];
  parciales: Parcial[];
  onBack: () => void;
  onUpdateExams: (updated: Exam[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export const PRESET_BANNERS = [
  {
    id: 'teologia',
    name: 'Teología y Libros (Clásico)',
    url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'workspace',
    name: 'Escritorio de Estudio',
    url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'chalkboard',
    name: 'Pizarra y Aula',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'gradient',
    name: 'Gradiente Cósmico',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'library',
    name: 'Luz de Biblioteca',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
  }
];

function ensureValidQuestions(rawQuestions: any[]): Question[] {
  if (!Array.isArray(rawQuestions)) return [];
  const seenIds = new Set<string>();
  return rawQuestions.map((q, idx) => {
    let id = typeof q?.id === 'string' && q.id.trim() ? q.id : `q_${uid()}_${idx}`;
    if (seenIds.has(id)) {
      id = `${id}_${uid()}_${idx}`;
    }
    seenIds.add(id);

    const tipo: Question['tipo'] = q?.tipo || 'multiple';
    let opciones: string[] = Array.isArray(q?.opciones) ? [...q.opciones] : [];
    if (opciones.length === 0) {
      if (tipo === 'tf') opciones = ['Verdadero', 'Falso'];
      else if (tipo === 'matching') opciones = ['Papiro', 'Talmud', 'Masoretas'];
      else if (tipo === 'table') opciones = ['UNGIDO', 'ORGULLO', 'EL EDÉN', 'REBELIÓN'];
      else opciones = ['Opción A', 'Opción B'];
    }

    let enunciados: string[] | undefined = undefined;
    let matchCorrectos: number[] | undefined = undefined;
    if (tipo === 'matching') {
      enunciados = Array.isArray(q?.enunciados) && q.enunciados.length > 0
        ? [...q.enunciados]
        : ['Pregunta 1'];
      const maxOpt = opciones.length > 0 ? opciones.length - 1 : 999;
      const rawMatches = Array.isArray(q?.matchCorrectos) ? q.matchCorrectos : [];
      matchCorrectos = enunciados.map((_, i) => {
        const val = rawMatches[i];
        if (val === undefined || val === null || val === '') return 0;
        const parsed = Number(val);
        if (isNaN(parsed) || parsed < 0) return 0;
        return maxOpt > 0 ? Math.min(parsed, maxOpt) : parsed;
      });
    }

    const opcionIds: string[] = Array.isArray(q?.opcionIds) && q.opcionIds.length === opciones.length
      ? [...q.opcionIds]
      : opciones.map((_, i) => `opt_${id}_${i}_${uid()}`);

    let enunciadoIds: string[] | undefined = undefined;
    if (tipo === 'matching' && enunciados) {
      enunciadoIds = Array.isArray(q?.enunciadoIds) && q.enunciadoIds.length === enunciados.length
        ? [...q.enunciadoIds]
        : enunciados.map((_, i) => `enun_${id}_${i}_${uid()}`);
    }

    return {
      ...q,
      id,
      tipo,
      texto: typeof q?.texto === 'string' ? q.texto : '',
      puntos: typeof q?.puntos === 'number' && !isNaN(q.puntos) ? q.puntos : 10,
      opciones,
      opcionIds,
      correctas: Array.isArray(q?.correctas) ? [...q.correctas] : [],
      enunciados,
      enunciadoIds,
      matchCorrectos,
    };
  });
}

export default function ExamBuilder({ 
  examId, exams, parciales, onBack, onUpdateExams, toast 
}: ExamBuilderProps) {

  const exam = exams.find(e => e.id === examId);
  if (!exam) {
    return (
      <div className="p-8 text-center bg-white border rounded shadow">
        <p className="text-red-500">Examen no encontrado</p>
        <button onClick={onBack} className="btn btn-secondary mt-3">Volver</button>
      </div>
    );
  }

  // Local Form States (initialized from active exam)
  const [title, setTitle] = useState(exam.titulo);
  const [subtitulo, setSubtitulo] = useState(exam.subtitulo || '');
  const [materia, setMateria] = useState(exam.materia);
  const [parcialId, setParcialId] = useState(exam.parcialId || '');
  const [description, setDescription] = useState(exam.descripcion || '');
  const [tiempo, setTiempo] = useState(exam.tiempo);
  const [intentos, setIntentos] = useState(exam.intentos);
  const [aprobacion, setAprobacion] = useState(exam.aprobacion);
  const [aleatorio, setAleatorio] = useState(exam.aleatorio);
  const [mostrarNota, setMostrarNota] = useState(exam.mostrarNota);
  const [questions, setQuestions] = useState<Question[]>(() => ensureValidQuestions(exam.preguntas || []));
  const [bannerUrl, setBannerUrl] = useState(exam.bannerUrl || PRESET_BANNERS[0].url);

  // View States
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [previewShowCorrect, setPreviewShowCorrect] = useState(false);

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const isFirstRender = useRef(true);
  const isDirtyRef = useRef(false);
  const lastExamIdRef = useRef(examId);
  const examsRef = useRef(exams);

  // Synchronous ref to current exam form state to avoid stale closures in effects and handlers
  const latestDataRef = useRef({
    examId,
    title,
    subtitulo,
    materia,
    parcialId,
    description,
    tiempo,
    intentos,
    aprobacion,
    aleatorio,
    mostrarNota,
    questions,
    bannerUrl,
    estado: exam.estado || 'borrador',
    docenteId: exam.docenteId,
    creado: exam.creado,
    actualizado: exam.actualizado,
  });

  // Always update latestDataRef synchronously on every render
  latestDataRef.current = {
    examId,
    title,
    subtitulo,
    materia,
    parcialId,
    description,
    tiempo,
    intentos,
    aprobacion,
    aleatorio,
    mostrarNota,
    questions,
    bannerUrl,
    estado: exam.estado || 'borrador',
    docenteId: exam.docenteId,
    creado: exam.creado,
    actualizado: exam.actualizado,
  };

  // Keep examsRef synced with latest exams prop
  useEffect(() => {
    examsRef.current = exams;
  }, [exams]);

  // Sync state ONLY if user switches to a completely different exam (examId changes)
  useEffect(() => {
    if (lastExamIdRef.current !== examId) {
      lastExamIdRef.current = examId;
      isFirstRender.current = true;
      isDirtyRef.current = false;

      const currentExam = examsRef.current.find(e => e.id === examId);
      if (currentExam) {
        setTitle(currentExam.titulo);
        setSubtitulo(currentExam.subtitulo || '');
        setMateria(currentExam.materia);
        setParcialId(currentExam.parcialId || '');
        setDescription(currentExam.descripcion || '');
        setTiempo(currentExam.tiempo);
        setIntentos(currentExam.intentos);
        setAprobacion(currentExam.aprobacion);
        setAleatorio(currentExam.aleatorio);
        setMostrarNota(currentExam.mostrarNota);
        setQuestions(ensureValidQuestions(currentExam.preguntas || []));
        setBannerUrl(currentExam.bannerUrl || PRESET_BANNERS[0].url);
      }
    }
  }, [examId]);

  const saveCurrentExamImmediate = async (overrideEstado?: 'borrador' | 'activo'): Promise<Exam> => {
    const cur = latestDataRef.current;
    const currentBase = examsRef.current.find(e => e.id === cur.examId) || exam;
    const nowIso = new Date().toISOString();

    const updatedExam: Exam = {
      ...currentBase,
      id: cur.examId,
      titulo: cur.title.trim() || 'Examen sin título',
      subtitulo: cur.subtitulo.trim(),
      materia: cur.materia.trim() || 'Matemáticas',
      parcialId: cur.parcialId || null,
      descripcion: cur.description.trim(),
      docenteId: cur.docenteId || currentBase.docenteId || 'u_admin',
      tiempo: cur.tiempo,
      intentos: cur.intentos,
      aprobacion: cur.aprobacion,
      aleatorio: cur.aleatorio,
      mostrarNota: cur.mostrarNota,
      estado: overrideEstado || cur.estado || currentBase.estado || 'borrador',
      preguntas: cur.questions,
      bannerUrl: cur.bannerUrl,
      creado: cur.creado || currentBase.creado || nowIso,
      actualizado: nowIso,
    };

    const nextExams = examsRef.current.map(e => e.id === cur.examId ? updatedExam : e);
    if (!nextExams.some(e => e.id === cur.examId)) {
      nextExams.push(updatedExam);
    }
    examsRef.current = nextExams;
    isDirtyRef.current = false;
    onUpdateExams(nextExams);

    // 1. Immediate local storage persistence
    try {
      const rawLocal = localStorage.getItem('ep_exams');
      const localExams: Exam[] = rawLocal ? JSON.parse(rawLocal) : [];
      const updatedLocal = localExams.map(e => e.id === cur.examId ? updatedExam : e);
      if (!updatedLocal.some(e => e.id === cur.examId)) {
        updatedLocal.push(updatedExam);
      }
      localStorage.setItem('ep_exams', JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn('Error backing up exam to localStorage:', e);
    }

    // 2. Direct Cloud Firestore persistence
    try {
      await saveDocToFirestore('exams', updatedExam);
    } catch (err) {
      console.error('Error direct saving to Firestore:', err);
    }

    return updatedExam;
  };

  // Debounced auto-save effect: triggers reliably whenever any field changes without stealing input focus
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    isDirtyRef.current = true;
    setSaveStatus('saving');

    const updateTimer = setTimeout(async () => {
      try {
        await saveCurrentExamImmediate();
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 700);

    return () => clearTimeout(updateTimer);
  }, [
    title,
    subtitulo,
    materia,
    parcialId,
    description,
    tiempo,
    intentos,
    aprobacion,
    aleatorio,
    mostrarNota,
    questions,
    bannerUrl,
    examId
  ]);

  // Flush latest state immediately on beforeunload or unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        saveCurrentExamImmediate();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isDirtyRef.current) {
        saveCurrentExamImmediate();
      }
    };
  }, []);

  const handleAddField = () => {
    const qId = uid();
    const newQ: Question = {
      id: qId,
      texto: '',
      tipo: 'multiple',
      puntos: 10,
      opciones: ['Opción A', 'Opción B'],
      opcionIds: [`opt_${qId}_0_${uid()}`, `opt_${qId}_1_${uid()}`],
      correctas: [],
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleUpdateQText = (id: string, text: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, texto: text } : q));
  };

  const handleUpdateQPts = (id: string, pts: number) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, puntos: pts } : q));
  };

  const handleChangeQType = (id: string, type: Question['tipo']) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        if (q.tipo === type) return q;

        let options = Array.isArray(q.opciones) && q.opciones.length > 0 ? [...q.opciones] : [];
        let enunciados = Array.isArray(q.enunciados) && q.enunciados.length > 0 ? [...q.enunciados] : undefined;
        let matchCorrectos = Array.isArray(q.matchCorrectos) ? [...q.matchCorrectos] : undefined;
        let columnas = Array.isArray(q.columnas) && q.columnas.length > 0 ? [...q.columnas] : undefined;
        let tableRows = Array.isArray(q.tableRows) && q.tableRows.length > 0 ? [...q.tableRows] : undefined;

        if (type === 'multiple' || type === 'checkbox' || type === 'dropdown') {
          if (options.length === 0 || (options.length === 2 && options[0] === 'Verdadero')) {
            options = ['Opción A', 'Opción B'];
          }
        } else if (type === 'tf') {
          options = ['Verdadero', 'Falso'];
        } else if (type === 'matching') {
          if (options.length === 0 || (options.length === 2 && options[0] === 'Verdadero')) {
            options = ['Papiro', 'Talmud', 'Masoretas'];
          }
          if (!enunciados || enunciados.length === 0) {
            enunciados = ['Pregunta 1'];
            matchCorrectos = [0];
          } else {
            const maxOpt = Math.max(0, options.length - 1);
            matchCorrectos = enunciados.map((_, idx) => {
              const prevMatch = matchCorrectos && matchCorrectos[idx] !== undefined ? matchCorrectos[idx] : 0;
              return Math.min(Math.max(0, prevMatch), maxOpt);
            });
          }
        } else if (type === 'table') {
          if (options.length === 0) {
            options = ['UNGIDO', 'ORGULLO', 'EL EDÉN', 'REBELIÓN'];
          }
          if (!columnas || columnas.length === 0) {
            columnas = ['Privilegios y Corrupción', 'Singular Pecado y destino', 'El momento de la caída'];
          }
          if (!tableRows || tableRows.length === 0) {
            tableRows = [
              {
                cells: [
                  { tipo: 'blank', valor: '', correctOptionIdx: 0 },
                  { tipo: 'blank', valor: '', correctOptionIdx: 1 },
                  { tipo: 'blank', valor: '', correctOptionIdx: 2 }
                ]
              }
            ];
          }
        } else {
          options = [];
        }

        const opcionIds = options.map((_, i) => `opt_${id}_${i}_${uid()}`);
        const enunciadoIds = (type === 'matching' && enunciados)
          ? enunciados.map((_, i) => `enun_${id}_${i}_${uid()}`)
          : undefined;

        return {
          ...q,
          tipo: type,
          correctas: [],
          opciones: options,
          opcionIds,
          enunciados: type === 'matching' ? enunciados : undefined,
          enunciadoIds,
          matchCorrectos: type === 'matching' ? matchCorrectos : undefined,
          columnas: type === 'table' ? columnas : undefined,
          tableRows: type === 'table' ? tableRows : undefined,
        };
      }
      return q;
    }));
  };

  const handleAddTableColumn = (qid: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const nextCols = [...(q.columnas || ['Columna 1'])];
        nextCols.push(`Columna ${nextCols.length + 1}`);
        const nextRows = (q.tableRows || []).map(row => ({
          cells: [...row.cells, { tipo: 'blank' as const, valor: '', correctOptionIdx: 0 }]
        }));
        return {
          ...q,
          columnas: nextCols,
          tableRows: nextRows
        };
      }
      return q;
    }));
  };

  const handleUpdateTableColumn = (qid: string, colIdx: number, val: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qid && q.columnas) {
        const nextCols = [...q.columnas];
        nextCols[colIdx] = val;
        return { ...q, columnas: nextCols };
      }
      return q;
    }));
  };

  const handleRemoveTableColumn = (qid: string, colIdx: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qid && q.columnas && q.tableRows) {
        if (q.columnas.length <= 1) {
          toast('La tabla debe tener al menos una columna', 'warning');
          return q;
        }
        const nextCols = q.columnas.filter((_, idx) => idx !== colIdx);
        const nextRows = q.tableRows.map(row => ({
          cells: row.cells.filter((_, idx) => idx !== colIdx)
        }));
        return { ...q, columnas: nextCols, tableRows: nextRows };
      }
      return q;
    }));
  };

  const handleAddTableRow = (qid: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const colsCount = q.columnas ? q.columnas.length : 1;
        const newCells = Array.from({ length: colsCount }, () => ({
          tipo: 'blank' as const,
          valor: '',
          correctOptionIdx: 0
        }));
        const nextRows = [...(q.tableRows || [])];
        nextRows.push({ cells: newCells });
        return { ...q, tableRows: nextRows };
      }
      return q;
    }));
  };

  const handleUpdateTableCell = (qid: string, rIdx: number, cIdx: number, fields: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qid && q.tableRows) {
        const nextRows = q.tableRows.map((row, rowIdx) => {
          if (rowIdx === rIdx) {
            const nextCells = row.cells.map((cell, colIdx) => {
              if (colIdx === cIdx) {
                return { ...cell, ...fields };
              }
              return cell;
            });
            return { cells: nextCells };
          }
          return row;
        });
        return { ...q, tableRows: nextRows };
      }
      return q;
    }));
  };

  const handleRemoveTableRow = (qid: string, rIdx: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qid && q.tableRows) {
        if (q.tableRows.length <= 1) {
          toast('La tabla debe tener al menos una fila', 'warning');
          return q;
        }
        const nextRows = q.tableRows.filter((_, idx) => idx !== rIdx);
        return { ...q, tableRows: nextRows };
      }
      return q;
    }));
  };

  const notifyUserEdit = () => {
    isDirtyRef.current = true;
  };

  const handleAddEnunciado = (qid: string) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const nextEnun = Array.isArray(q.enunciados) ? [...q.enunciados] : [];
        const currentEnunIds = Array.isArray(q.enunciadoIds)
          ? [...q.enunciadoIds]
          : nextEnun.map((_, i) => `enun_${q.id}_${i}_${uid()}`);
        const nextMatches = Array.isArray(q.matchCorrectos) ? [...q.matchCorrectos] : [];
        return {
          ...q,
          enunciados: [...nextEnun, `Enunciado ${nextEnun.length + 1}`],
          enunciadoIds: [...currentEnunIds, `enun_${q.id}_${nextEnun.length}_${uid()}`],
          matchCorrectos: [...nextMatches, 0],
        };
      }
      return q;
    }));
  };

  const handleUpdateEnunciadoText = (qid: string, eIdx: number, val: string) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const nextEnun = [...(q.enunciados || [])];
        nextEnun[eIdx] = val;
        return { ...q, enunciados: nextEnun };
      }
      return q;
    }));
  };

  const handleUpdateEnunciadoCorrectValue = (qid: string, eIdx: number, termIdx: number) => {
    notifyUserEdit();
    const validIdx = typeof termIdx === 'number' && !isNaN(termIdx) && termIdx >= 0 ? termIdx : 0;
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const count = (q.enunciados || []).length;
        const currentMatches = Array.isArray(q.matchCorrectos) ? [...q.matchCorrectos] : Array(count).fill(0);
        while (currentMatches.length < count) {
          currentMatches.push(0);
        }
        currentMatches[eIdx] = validIdx;
        return { ...q, matchCorrectos: currentMatches };
      }
      return q;
    }));
  };

  const handleRemoveEnunciado = (qid: string, eIdx: number) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const currentEnuns = Array.isArray(q.enunciados) ? q.enunciados : [];
        if (currentEnuns.length <= 1) {
          toast('Mínimo debes registrar 1 enunciado para relacionar', 'warning');
          return q;
        }
        const nextEnun = currentEnuns.filter((_, i) => i !== eIdx);
        const nextEnunIds = Array.isArray(q.enunciadoIds) ? q.enunciadoIds.filter((_, i) => i !== eIdx) : undefined;
        const currentMatches = Array.isArray(q.matchCorrectos) 
          ? q.matchCorrectos 
          : currentEnuns.map(() => 0);
        const nextMatches = currentMatches.filter((_, i) => i !== eIdx);
        return { ...q, enunciados: nextEnun, enunciadoIds: nextEnunIds, matchCorrectos: nextMatches };
      }
      return q;
    }));
  };

  const handleUpdateOptionText = (qid: string, oIdx: number, val: string) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const nextOpts = [...(q.opciones || [])];
        nextOpts[oIdx] = val;
        return { ...q, opciones: nextOpts };
      }
      return q;
    }));
  };

  const handleToggleCorrect = (qid: string, oIdx: number) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        let nextCorrect: number[] = [];
        if (q.tipo === 'multiple' || q.tipo === 'dropdown' || q.tipo === 'tf') {
          nextCorrect = [oIdx];
        } else {
          // Checkbox allowing multiple correct selectors
          if (q.correctas.includes(oIdx)) {
            nextCorrect = q.correctas.filter(c => c !== oIdx);
          } else {
            nextCorrect = [...q.correctas, oIdx];
          }
        }
        return { ...q, correctas: nextCorrect };
      }
      return q;
    }));
  };

  const getNextOptionLabel = (count: number) => {
    if (count < 26) {
      return `Opción ${String.fromCharCode(65 + count)}`;
    }
    const firstChar = String.fromCharCode(65 + Math.floor(count / 26) - 1);
    const secondChar = String.fromCharCode(65 + (count % 26));
    return `Opción ${firstChar}${secondChar}`;
  };

  const handleAddOption = (qid: string) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        const currentOpts = Array.isArray(q.opciones) ? [...q.opciones] : [];
        const currentOptIds = Array.isArray(q.opcionIds) 
          ? [...q.opcionIds] 
          : currentOpts.map((_, i) => `opt_${q.id}_${i}_${uid()}`);
        const newLabel = q.tipo === 'matching' || q.tipo === 'table'
          ? `Término ${currentOpts.length + 1}`
          : getNextOptionLabel(currentOpts.length);
        const newOptId = `opt_${q.id}_${currentOpts.length}_${uid()}`;
        return {
          ...q,
          opciones: [...currentOpts, newLabel],
          opcionIds: [...currentOptIds, newOptId],
        };
      }
      return q;
    }));
  };

  const handleRemoveOption = (qid: string, oIdx: number) => {
    notifyUserEdit();
    setQuestions(prev => prev.map(q => {
      if (q.id === qid) {
        if (q.opciones.length <= 2 && q.tipo !== 'matching' && q.tipo !== 'table') {
          toast('Mínimo debes registrar 2 opciones de respuesta', 'warning');
          return q;
        }
        if ((q.tipo === 'matching' || q.tipo === 'table') && q.opciones.length <= 1) {
          toast('Mínimo debes registrar 1 palabra en la caja de vocabulario', 'warning');
          return q;
        }
        const nextOpts = q.opciones.filter((_, i) => i !== oIdx);
        const nextOptIds = Array.isArray(q.opcionIds) ? q.opcionIds.filter((_, i) => i !== oIdx) : undefined;
        const maxValidIdx = Math.max(0, nextOpts.length - 1);

        // adjust correct list
        const nextCorrect = (q.correctas || [])
          .filter(c => c !== oIdx)
          .map(c => c > oIdx ? c - 1 : c)
          .map(c => Math.min(Math.max(0, c), maxValidIdx));

        // For matching, safely adjust matchCorrectos indices
        let nextMatches = q.matchCorrectos;
        if (q.tipo === 'matching') {
          const currentMatches = Array.isArray(q.matchCorrectos) 
            ? q.matchCorrectos 
            : (q.enunciados || []).map(() => 0);
          nextMatches = currentMatches.map(matchIdx => {
            if (matchIdx === oIdx) return 0;
            if (matchIdx > oIdx) return Math.min(Math.max(0, matchIdx - 1), maxValidIdx);
            return Math.min(Math.max(0, matchIdx), maxValidIdx);
          });
        }

        // For table, safely adjust correctOptionIdx in tableRows
        let nextRows = q.tableRows;
        if (q.tipo === 'table' && Array.isArray(q.tableRows)) {
          nextRows = q.tableRows.map(row => ({
            ...row,
            cells: (row.cells || []).map(cell => {
              if (cell.tipo === 'blank') {
                const cIdx = cell.correctOptionIdx ?? 0;
                let nextC = cIdx;
                if (cIdx === oIdx) nextC = 0;
                else if (cIdx > oIdx) nextC = nextC - 1;
                return { ...cell, correctOptionIdx: Math.min(Math.max(0, nextC), maxValidIdx) };
              }
              return cell;
            })
          }));
        }

        return { 
          ...q, 
          opciones: nextOpts, 
          opcionIds: nextOptIds,
          correctas: nextCorrect, 
          matchCorrectos: nextMatches,
          tableRows: nextRows 
        };
      }
      return q;
    }));
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleMoveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions(prev => {
      const targetIdx = index + dir;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const nextQList = [...prev];
      const triggerQ = nextQList[index];
      nextQList[index] = nextQList[targetIdx];
      nextQList[targetIdx] = triggerQ;
      return nextQList;
    });
  };

  const handleSave = async (estado: 'borrador' | 'activo') => {
    setSaveStatus('saving');
    await saveCurrentExamImmediate(estado);
    setSaveStatus('saved');
    toast(
      estado === 'activo' 
        ? 'Examen publicado exitosamente ✓' 
        : 'Progreso guardado exitosamente en la nube ✓', 
      'success'
    );
    if (estado === 'activo') {
      onBack();
    }
  };

  const handleBack = async () => {
    if (isDirtyRef.current) {
      setSaveStatus('saving');
      await saveCurrentExamImmediate();
    }
    onBack();
  };

  return (
    <div className="page-builder animate-fade-in pb-12">
      {/* Editor top action bar */}
      <div className="page-header flex items-center justify-between gap-3 mb-6 border-b border-slate-200 pb-3">
        <button 
          onClick={handleBack}
          className="btn btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 hover:bg-slate-50 text-slate-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-[11px] text-amber-600 bg-amber-50/85 border border-amber-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-pulse select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>Guardando cambio...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>✓ Auto-guardado</span>
            </span>
          )}
          <button 
            onClick={() => handleSave('borrador')}
            className="btn btn-secondary px-4 py-1.5 rounded-lg text-indigo-700 bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer text-xs font-bold flex items-center gap-1"
            title="Guardar todos los cambios en Firebase"
          >
            💾 Guardar cambios
          </button>
          <button 
            onClick={() => handleSave('activo')}
            className="btn btn-primary px-4 py-1.5 rounded-lg text-white font-bold hover:opacity-90 transition cursor-pointer text-xs"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Publicar examen
          </button>
        </div>
      </div>

      {/* Main Grid: Left editor input panels, Right live preview panel */}
      <div className={`grid gap-6 transition-all duration-305 ${previewCollapsed ? 'grid-cols-1 lg:grid-cols-[1fr_60px]' : 'grid-cols-1 lg:grid-cols-[1fr_340px]'}`}>
        
        {/* LEFT COLUMN: EDITOR */}
        <div className="flex flex-col gap-4">
          
          {/* Header Card properties */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white theme-bg-surface">
            {/* Visual Cover Banner mimicking Google Forms */}
            <div className="relative w-full h-44 group bg-slate-100 border-b border-slate-200 overflow-hidden">
              <img
                src={bannerUrl}
                alt="Cabecera del Examen"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent flex items-end p-4">
                <div className="text-white text-left">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-indigo-600 px-2 py-0.5 rounded shadow-sm">Boceto de Cabecera</span>
                  <h4 className="text-xs font-bold mt-1 text-slate-100 opacity-90">Personalizar diseño del formulario</h4>
                </div>
              </div>
            </div>

            {/* Banner selector row */}
            <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10.5px] font-extrabold text-slate-700 block tracking-wider uppercase font-mono">🎨 Imagen de Cabecera (Estilo Google Forms)</span>
                  <p className="text-[10.5px] text-slate-500 font-medium">Predeterminada o personalizada. Elige de la galería o ingresa un enlace.</p>
                </div>
                {/* Custom URL input */}
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={e => setBannerUrl(e.target.value)}
                    placeholder="Pega un enlace de imagen personalizado..."
                    className="p-1 px-2.5 border border-slate-200 rounded-lg text-xs bg-white outline-none w-52 focus:border-indigo-500 font-medium text-slate-600"
                    title="URL de cabecera personalizada"
                  />
                </div>
              </div>

              {/* Grid of presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESET_BANNERS.map((preset) => {
                  const isSelected = bannerUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setBannerUrl(preset.url)}
                      className={`relative rounded-xl overflow-hidden h-12 border-2 text-left group transition-all cursor-pointer ${
                        isSelected ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-400'
                      }`}
                      title={preset.name}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-1">
                        <span className="text-[9px] font-extrabold text-white leading-tight text-center truncate w-full drop-shadow-md">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                          <Check className="w-2.5 h-2.5 font-bold" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 text-center border-b border-slate-100 flex flex-col items-center">
              {/* Badge */}
              <div className="mb-2.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 select-none">
                ⚙ CONFIGURACIÓN DE CABECERA (VISTA REALISTA)
              </div>
              
              {/* Main Title text area centered */}
              <AutoExpandingTextarea 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="INSTITUTO BÍBLICO PATRICIO SYMES - MATERIA..."
                rows={1}
                className="w-full text-center text-md md:text-lg font-bold text-slate-800 bg-transparent border border-dashed border-slate-200 rounded-lg py-3 px-3 outline-none placeholder-slate-400 focus:border-indigo-500 uppercase tracking-wide leading-normal"
                style={{ lineHeight: '1.5' }}
              />
              <p className="text-[10px] text-slate-400 mt-1.5 select-none">
                💡 Consejo: Usa un guion para separar, o presiona Enter para forzar líneas separadas como en el documento real.
              </p>

              {/* Subtitle / Bible Verse */}
              <div className="w-full mt-4 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Subtítulo / Mensaje / Cita Bíblica</span>
                <AutoExpandingTextarea 
                  value={subtitulo}
                  onChange={e => setSubtitulo(e.target.value)}
                  placeholder='Ej: "Toda la Escritura está inspirada por Dios y es provechosa para enseñar..." 2 Tim 3:16'
                  rows={1}
                  className="w-full max-w-xl text-center text-xs text-slate-600 bg-amber-50/20 border border-slate-200 focus:border-indigo-500 rounded-lg p-2 outline-none placeholder-slate-400/60 italic"
                />
              </div>

              {/* General Description / Instructions */}
              <div className="w-full mt-4 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1">Instrucciones Generales</span>
                <AutoExpandingTextarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Instrucciones o descripción opcional para el estudiante..."
                  rows={1}
                  className="w-full max-w-xl text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2 outline-none placeholder-slate-300"
                />
              </div>
            </div>
            
            {/* Inline controls */}
            <div className="bg-white p-5 border-t border-slate-100 theme-bg-surface theme-border">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Materia</label>
                  <input 
                    type="text" 
                    value={materia} 
                    onChange={e => setMateria(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    placeholder="Nombre completo de la asignatura/materia"
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tiempo límite</label>
                  <select 
                    value={tiempo} 
                    onChange={e => setTiempo(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value={0}>Sin límite</option>
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                    <option value={90}>90 mins</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Intentos</label>
                  <select 
                    value={intentos} 
                    onChange={e => setIntentos(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value={1}>1 Intento</option>
                    <option value={2}>2 Intentos</option>
                    <option value={0}>Ilimitados</option>
                  </select>
                </div>
                <div className="col-span-12 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nota aprobatoria</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={100}
                    value={aprobacion} 
                    onChange={e => setAprobacion(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              {/* Switches configurations */}
              <div className="flex gap-4.5 mt-4 pt-3 border-t border-slate-50 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={aleatorio} 
                    onChange={e => setAleatorio(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span>Preguntas aleatorias</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={mostrarNota} 
                    onChange={e => setMostrarNota(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span>Mostrar calificaciones finales</span>
                </label>
              </div>
            </div>
          </div>

          {/* QUESTIONS LIST CONTAINER */}
          <div className="flex flex-col gap-4">
            {questions.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center theme-bg-surface theme-border">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700">Sin preguntas asignadas</h4>
                <p className="text-xs text-slate-400 mt-1">Utiliza el botón inferior para agregar la primera pregunta</p>
              </div>
            ) : (
              questions.map((q, qIndex) => {
                const isCheck = q.tipo === 'checkbox';
                const isTF = q.tipo === 'tf';
                const isText = q.tipo === 'abierta';
                const isScale = q.tipo === 'escala';
                const isMatching = q.tipo === 'matching';
                const isTable = q.tipo === 'table';
                const showOpts = q.tipo === 'multiple' || q.tipo === 'checkbox' || q.tipo === 'dropdown' || q.tipo === 'tf';

                return (
                  <div 
                    key={q.id} 
                    className="question-card bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 transition shadow-sm relative theme-bg-surface theme-border"
                  >
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2.5">
                      Pregunta {qIndex + 1}
                    </div>

                    <AutoExpandingTextarea 
                      value={q.texto}
                      onChange={e => handleUpdateQText(q.id, e.target.value)}
                      placeholder="Escribe el enunciado de la pregunta aquí..."
                      className="w-full text-sm sm:text-[15px] leading-relaxed font-semibold text-slate-800 border-b border-slate-200 py-2 focus:border-indigo-500 outline-none placeholder-slate-400 mb-4 bg-transparent whitespace-pre-wrap font-sans block"
                      rows={1}
                    />

                    {/* Options list if visible for type */}
                    {showOpts && (
                      <div className="flex flex-col gap-2 mb-4">
                        {isTF ? (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 theme-bg-surface">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-3">
                              ¿Cuál es la respuesta correcta predeterminada para esta afirmación?
                            </span>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleCorrect(q.id, 0)}
                                className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                  q.correctas.includes(0)
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${q.correctas.includes(0) ? 'border-emerald-600' : 'border-slate-300'}`}>
                                  {q.correctas.includes(0) && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                                </div>
                                <span>Verdadero</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCorrect(q.id, 1)}
                                className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                  q.correctas.includes(1)
                                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${q.correctas.includes(1) ? 'border-rose-600' : 'border-slate-300'}`}>
                                  {q.correctas.includes(1) && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                                </div>
                                <span>Falso</span>
                              </button>
                            </div>
                            {q.correctas.length === 0 && (
                              <p className="text-[11px] text-amber-600 font-semibold mt-2.5 flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                ⚠️ Selecciona una de estas dos opciones para configurar la clave de autocalificación de esta pregunta.
                              </p>
                            )}
                          </div>
                        ) : (
                          q.opciones.map((opt, oIdx) => {
                            const isCorrect = q.correctas.includes(oIdx);
                            const optKey = q.opcionIds?.[oIdx] || `${q.id}-opt-${oIdx}`;
                            return (
                              <div key={optKey} className="flex items-center gap-2">
                                {isCheck ? (
                                  <div className="w-[18px] h-[18px] border-2 border-slate-300 rounded shrink-0 bg-slate-50" />
                                ) : (
                                  <div className="w-[18px] h-[18px] border-2 border-slate-300 rounded-full shrink-0 bg-slate-50" />
                                )}
                                <AutoExpandingTextarea 
                                  value={opt}
                                  onChange={e => handleUpdateOptionText(q.id, oIdx, e.target.value)}
                                  placeholder={`Opción ${oIdx + 1}`}
                                  className="flex-1 bg-transparent border-b border-slate-100 text-xs sm:text-sm py-1 font-medium focus:border-indigo-400 outline-none whitespace-pre-wrap font-sans block"
                                  rows={1}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.stopPropagation();
                                    }
                                  }}
                                />
                                <button 
                                  type="button" 
                                  onClick={() => handleToggleCorrect(q.id, oIdx)}
                                  className={`text-xs w-6 h-6 rounded flex items-center justify-center font-bold border transition shrink-0 ${
                                    isCorrect 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                                      : 'text-slate-300 border-slate-200 bg-white hover:text-slate-500 hover:border-slate-300'
                                  }`}
                                  title="Marcar como alternativa correcta"
                                >
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : '✓'}
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveOption(q.id, oIdx)}
                                  className="text-slate-300 hover:text-red-500 p-1.5 border border-transparent hover:border-slate-100 rounded transition"
                                  title="Eliminar opción"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })
                        )}
                        {!isTF && (
                          <button 
                            type="button" 
                            onClick={() => handleAddOption(q.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold text-left self-start mt-1.5 flex items-center gap-1 cursor-pointer"
                          >
                            + Agregar opción de respuesta
                          </button>
                        )}
                      </div>
                    )}

                    {isText && (
                      <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-semibold text-slate-400">
                        El estudiante completará un cuadro de texto libre con su respuesta.
                      </div>
                    )}

                    {isScale && (
                      <div className="flex gap-2 mb-4 shrink-0 mt-3">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold bg-slate-50">
                            {n}
                          </div>
                        ))}
                      </div>
                    )}

                    {isMatching && (
                      <div className="space-y-4 mb-4">
                        {/* Word bank manager */}
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-left">
                          <label className="text-xs font-bold text-indigo-750 uppercase tracking-wide block mb-1">
                            📦 Caja de Palabras / Banco de Vocabulario (Listado de Palabras)
                          </label>
                          <p className="text-[11px] text-slate-500 mb-3 block">
                            Estas palabras serán mostradas para que el estudiante las relacione frente a cada definición.
                          </p>

                          {/* PRESETS BUTTONS FOR EASY MULTI-TF AND MULTI-ABC */}
                          <div className="flex flex-wrap gap-2 mb-4 bg-white/85 p-2.5 rounded-xl border border-indigo-100 select-none">
                            <span className="text-[10px] font-black text-indigo-800 block w-full mb-1">✨ CONFIGURACIÓN RÁPIDA DE PLANTILLA:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions(prev => prev.map(item => {
                                  if (item.id === q.id) {
                                    const opts = ['Verdadero', 'Falso'];
                                    return {
                                      ...item,
                                      opciones: opts,
                                      opcionIds: opts.map((_, i) => `opt_${item.id}_${i}_${uid()}`),
                                      matchCorrectos: (item.enunciados || []).map((_, idx) => (item.matchCorrectos ? item.matchCorrectos[idx] ?? 0 : 0))
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="text-[10px] uppercase font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded px-2.5 py-1.5 transition cursor-pointer font-sans"
                            >
                              Falso / Verdadero Múltiple
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions(prev => prev.map(item => {
                                  if (item.id === q.id) {
                                    const opts = ['A', 'B', 'C', 'D'];
                                    return {
                                      ...item,
                                      opciones: opts,
                                      opcionIds: opts.map((_, i) => `opt_${item.id}_${i}_${uid()}`),
                                      matchCorrectos: (item.enunciados || []).map((_, idx) => (item.matchCorrectos ? item.matchCorrectos[idx] ?? 0 : 0))
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="text-[10px] uppercase font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded px-2.5 py-1.5 transition cursor-pointer font-sans"
                            >
                              Opciones A, B, C, D Múltiples
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions(prev => prev.map(item => {
                                  if (item.id === q.id) {
                                    const opts = [
                                      'Dios eterno.',
                                      'Dios todopoderoso.',
                                      'El Señor de los ejércitos.',
                                      'El Señor tu santificador.',
                                      'Dios Altísimo.',
                                      'Jehová está allí.',
                                      'Jehová mi Sanador.',
                                      'Jehová es mi paz.',
                                      'Señor, amo.',
                                      'Creador.',
                                      'Jehová',
                                      'Jehová mi estandarte.',
                                      'Jehová Justicia nuestra',
                                      'Jehová proveerá.',
                                      'Jehová es mi pastor.'
                                    ];
                                    const enuns = [
                                      'a. Elohim',
                                      'b. Adonai',
                                      'c. Yahveh',
                                      'd. Rafa',
                                      'e. Nisi',
                                      'f. Salom',
                                      'g. Ra`ah',
                                      'h. Tsidkenu',
                                      'i. Jireh',
                                      'j. Sama',
                                      'k. Babbaot',
                                      'l. Macadeshcem',
                                      'm. Shaddai',
                                      'n. Elyon',
                                      'o. Olam'
                                    ];
                                    return {
                                      ...item,
                                      texto: 'Relacione los nombres de Dios con su respectivo significado escribiendo o indicando la opción correcta en cada espacio:',
                                      opciones: opts,
                                      opcionIds: opts.map((_, i) => `opt_${item.id}_${i}_${uid()}`),
                                      enunciados: enuns,
                                      enunciadoIds: enuns.map((_, i) => `enun_${item.id}_${i}_${uid()}`),
                                      matchCorrectos: [9, 8, 10, 6, 11, 7, 14, 12, 13, 5, 2, 3, 1, 4, 0]
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="text-[10px] uppercase font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-850 border border-indigo-200 rounded px-2.5 py-1.5 transition cursor-pointer font-sans"
                            >
                              📘 Cargar: Nombres de Dios (screenshot 1)
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {q.opciones.map((opt, oIdx) => {
                              const optKey = q.opcionIds?.[oIdx] || `${q.id}-matchopt-${oIdx}`;
                              return (
                                <div key={optKey} className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg pl-2.5 pr-1 py-1 text-sm shadow-sm transition hover:border-indigo-400">
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={e => handleUpdateOptionText(q.id, oIdx, e.target.value)}
                                    className="bg-transparent text-xs font-semibold text-slate-800 min-w-[5.5rem] max-w-[16rem] focus:outline-none border-none outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(q.id, oIdx)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 font-bold shrink-0 text-xs px-1.5 py-0.5 rounded cursor-pointer transition"
                                    title="Eliminar palabra"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition shadow-sm border border-transparent"
                            style={{ backgroundColor: 'var(--primary, #673ab7)' }}
                          >
                            + Agregar Palabra a la Caja
                          </button>
                        </div>

                        {/* Enunciados manager */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                            📑 Enunciados y Definiciones Correctas
                          </label>
                          <p className="text-[11px] text-slate-400 mb-3 block">
                            Añade tus definiciones. Selecciona la palabra de la caja que le corresponde a cada enunciado.
                          </p>

                          <div className="space-y-2">
                            {(q.enunciados || []).map((enun, eIdx) => {
                              const enunKey = q.enunciadoIds?.[eIdx] || `${q.id}-enun-${eIdx}`;
                              const matchCorrectIdx = Array.isArray(q.matchCorrectos) && q.matchCorrectos[eIdx] !== undefined 
                                ? q.matchCorrectos[eIdx] 
                                : 0;
                              return (
                                <div key={enunKey} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                                  <span className="text-xs font-extrabold text-slate-400 shrink-0 w-6">
                                    {eIdx + 1}.
                                  </span>
                                  <AutoExpandingTextarea
                                    value={enun}
                                    onChange={e => handleUpdateEnunciadoText(q.id, eIdx, e.target.value)}
                                    placeholder={`Definición / Enunciado ${eIdx + 1}`}
                                    className="flex-1 text-xs sm:text-sm bg-transparent border-b border-slate-100 font-medium py-1 focus:border-indigo-400 outline-none whitespace-pre-wrap font-sans block"
                                    rows={1}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.stopPropagation();
                                      }
                                    }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 block shrink-0">Respuesta:</span>
                                    <select
                                      value={matchCorrectIdx}
                                      onChange={e => handleUpdateEnunciadoCorrectValue(q.id, eIdx, Number(e.target.value))}
                                      className="text-xs p-1.5 font-bold border rounded-lg bg-slate-50 text-emerald-700 border-emerald-200 cursor-pointer focus:outline-none"
                                    >
                                      {q.opciones.map((opt, oIdx) => (
                                        <option key={oIdx} value={oIdx}>{opt}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEnunciado(q.id, eIdx)}
                                      className="text-slate-400 hover:text-red-600 font-bold p-1.5 hover:bg-red-50 rounded cursor-pointer transition"
                                      title="Eliminar enunciado"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddEnunciado(q.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold text-left self-start mt-3 flex items-center gap-1 cursor-pointer"
                          >
                            + Agregar Enunciado / Definición
                          </button>
                        </div>
                      </div>
                    )}

                    {isTable && (
                      <div className="space-y-4 mb-4">
                        {/* Word bank manager */}
                        <div className="bg-indigo-55 border border-indigo-110 p-4 rounded-xl text-left dark:bg-slate-900/40 dark:border-slate-800">
                          <label className="text-xs font-bold text-indigo-750 uppercase tracking-wide block mb-2 dark:text-cyan-400">
                            📦 Caja de Palabras / Banco de Vocabulario (Listado de Palabras)
                          </label>
                          <p className="text-[11px] text-slate-500 mb-3 block dark:text-slate-400">
                            Estas palabras serán mostradas en la caja para que el estudiante las elija e introduzca en las celdas vacías de la tabla.
                          </p>

                          {/* PRESETS BUTTONS FOR EASY TABLE SETUP */}
                          <div className="flex flex-wrap gap-2 mb-4 bg-white/85 p-2.5 rounded-xl border border-indigo-100 select-none dark:bg-slate-900/60 dark:border-slate-800">
                            <span className="text-[10px] font-black text-indigo-800 dark:text-cyan-400 block w-full mb-1">✨ CONFIGURACIÓN RÁPIDA DE PLANTILLA:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions(prev => prev.map(item => {
                                  if (item.id === q.id) {
                                    const opts = [
                                      'Dios es personal',
                                      'Dios es inmutable',
                                      'Dios es amor',
                                      'Dios es omnipotente',
                                      'Dios es omnipresente',
                                      'Dios es misericordioso.',
                                      'Dios es infinito',
                                      'Dios es omnisciente',
                                      'Dios es santo',
                                      'Dios es espíritu',
                                      'Dios es absoluto e independiente',
                                      'Dios es justo',
                                      'Dios es Fiel',
                                      'Dios es bueno'
                                    ];
                                    return {
                                      ...item,
                                      texto: 'Ubique los Atributos de Dios presentes en la caja de palabras en la columna de la tabla que les corresponde (Naturales o Morales):',
                                      opciones: opts,
                                      opcionIds: opts.map((_, i) => `opt_${item.id}_${i}_${uid()}`),
                                      columnas: ['ATRIBUTOS NATURALES', 'ATRIBUTOS MORALES'],
                                      tableRows: [
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 1 }, // Dios es inmutable
                                            { tipo: 'blank', valor: '', correctOptionIdx: 0 }  // Dios es personal
                                          ]
                                        },
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 4 }, // Dios es omnipresente
                                            { tipo: 'blank', valor: '', correctOptionIdx: 2 }  // Dios es amor
                                          ]
                                        },
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 3 }, // Dios es omnipotente
                                            { tipo: 'blank', valor: '', correctOptionIdx: 5 }  // Dios es misericordioso
                                          ]
                                        },
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 7 }, // Dios es omnisciente
                                            { tipo: 'blank', valor: '', correctOptionIdx: 8 }  // Dios es santo
                                          ]
                                        },
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 6 }, // Dios es infinito
                                            { tipo: 'blank', valor: '', correctOptionIdx: 11 } // Dios es justo
                                          ]
                                        },
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 9 }, // Dios es espíritu
                                            { tipo: 'blank', valor: '', correctOptionIdx: 12 } // Dios es Fiel
                                          ]
                                        },
                                        {
                                          cells: [
                                            { tipo: 'blank', valor: '', correctOptionIdx: 10 }, // Dios es absoluto e independiente
                                            { tipo: 'blank', valor: '', correctOptionIdx: 13 }  // Dios es bueno
                                          ]
                                        }
                                      ]
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="text-[10px] uppercase font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-850 border border-indigo-200 rounded px-2.5 py-1.5 transition cursor-pointer font-sans dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-605"
                            >
                              📘 Cargar: Atributos de Dios (screenshot 2)
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {q.opciones.map((opt, oIdx) => {
                              const optKey = q.opcionIds?.[oIdx] || `${q.id}-tblopt-${oIdx}`;
                              return (
                                <div key={optKey} className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg pl-2 pr-1 py-1 text-sm shadow-sm dark:bg-slate-950 dark:border-slate-700">
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={e => handleUpdateOptionText(q.id, oIdx, e.target.value)}
                                    className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 w-24 focus:outline-none border-none outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(q.id, oIdx)}
                                    className="text-slate-350 hover:text-red-500 font-bold shrink-0 text-xs px-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition shadow-sm border border-transparent"
                            style={{ backgroundColor: 'var(--primary, #673ab7)' }}
                          >
                            + Agregar Palabra a la Caja
                          </button>
                        </div>

                        {/* Column and Row Grid Settings */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-900/30 dark:border-slate-800 text-left">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 dark:text-slate-300">
                            📋 Columnas de la Tabla (Encabezados)
                          </label>
                          <p className="text-[11px] text-slate-400 mb-3 block">
                            Define los títulos de cada columna para organizar la tabla.
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(q.columnas || []).map((col, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg pl-2 pr-1 py-1 text-sm shadow-sm dark:bg-slate-950 dark:border-slate-850">
                                <span className="text-[10px] font-bold text-slate-400">C{cIdx + 1}</span>
                                <input
                                  type="text"
                                  value={col}
                                  onChange={e => handleUpdateTableColumn(q.id, cIdx, e.target.value)}
                                  className="bg-transparent text-xs font-semibold text-slate-850 dark:text-slate-100 w-32 focus:outline-none border-none outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTableColumn(q.id, cIdx)}
                                  className="text-slate-350 hover:text-red-500 font-bold shrink-0 text-xs px-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddTableColumn(q.id)}
                              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition shadow-sm"
                            >
                              + Nueva Columna
                            </button>
                          </div>
                        </div>

                        {/* Filas de la Tabla */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-900/10 dark:border-slate-800 text-left space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block dark:text-slate-300">
                                📊 Filas y Configuración de Celdas
                              </label>
                              <span className="text-[11px] text-slate-400 block dark:text-slate-400">
                                Escribe textos de referencia fijos o define qué espacios deben ser completados por el estudiante.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddTableRow(q.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition shadow-sm cursor-pointer"
                            >
                              + Agregar Fila
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {(q.tableRows || []).map((row, rIdx) => (
                              <div key={rIdx} className="bg-white p-3 rounded-xl border border-slate-200 dark:bg-slate-905 dark:border-slate-800 shadow-sm relative">
                                <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Fila {rIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTableRow(q.id, rIdx)}
                                    className="text-red-500 hover:text-red-700 font-bold text-xs flex items-center gap-1 py-1 px-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition shadow-none border-none"
                                  >
                                    ✕ Eliminar Fila
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {row.cells.map((cell, cIdx) => {
                                    const colName = (q.columnas || [])[cIdx] || `Columna ${cIdx + 1}`;
                                    return (
                                      <div key={cIdx} className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 dark:bg-slate-900/50 dark:border-slate-800 text-[11px] space-y-2">
                                        <div className="font-bold text-slate-500 dark:text-slate-400 truncate mb-1">
                                          Columna: <span className="text-indigo-600 dark:text-cyan-400">{colName}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <select
                                            value={cell.tipo}
                                            onChange={e => handleUpdateTableCell(q.id, rIdx, cIdx, { tipo: e.target.value })}
                                            className="p-1 text-[10px] font-bold border rounded bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                                          >
                                            <option value="texto">Texto Fijo / Etiqueta</option>
                                            <option value="blank">Espacio por Llenar</option>
                                          </select>
                                        </div>

                                        {cell.tipo === 'texto' ? (
                                          <input
                                            type="text"
                                            value={cell.valor}
                                            placeholder="Introduce texto o etiqueta..."
                                            onChange={e => handleUpdateTableCell(q.id, rIdx, cIdx, { valor: e.target.value })}
                                            className="w-full bg-white border border-slate-150 p-1.5 rounded text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-850 dark:text-slate-100 font-medium"
                                          />
                                        ) : (
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 block font-bold">Respuesta correcta de la caja:</label>
                                            <select
                                              value={cell.correctOptionIdx ?? 0}
                                              onChange={e => handleUpdateTableCell(q.id, rIdx, cIdx, { correctOptionIdx: Number(e.target.value) })}
                                              className="w-full text-xs p-1.5 font-bold border rounded bg-white text-emerald-700 dark:bg-slate-950 dark:text-emerald-400 cursor-pointer"
                                            >
                                              {q.opciones.map((opt, oIdx) => (
                                                <option key={oIdx} value={oIdx}>{opt}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Question Actions footer */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                      <select 
                        value={q.tipo}
                        onChange={e => handleChangeQType(q.id, e.target.value as Question['tipo'])}
                        className="text-xs p-1.5 font-bold border rounded-lg bg-slate-50 text-slate-600 cursor-pointer"
                      >
                        <option value="multiple">Opción múltiple</option>
                        <option value="checkbox">Opción de Casillas</option>
                        <option value="dropdown">Menú desplegable</option>
                        <option value="tf">Verdadero/Falso</option>
                        <option value="abierta">Respuesta libre/Texto</option>
                        <option value="escala">Escala (1 al 5)</option>
                        <option value="matching">Pareo / Relacionar con Caja de Palabras</option>
                        <option value="table">Completar Tabla con Caja de Palabras</option>
                      </select>

                      <div className="flex-1" />

                      {/* Points counter */}
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <span>Puntos:</span>
                        <input 
                          type="number" 
                          min={1} 
                          value={q.puntos}
                          onChange={e => handleUpdateQPts(q.id, Number(e.target.value) || 10)}
                          className="w-12 p-1 text-center border border-slate-200 rounded bg-white font-bold"
                        />
                      </div>

                      {/* Reorder keys */}
                      <div className="flex gap-1">
                        <button 
                          type="button" 
                          onClick={() => handleMoveQuestion(qIndex, -1)}
                          disabled={qIndex === 0}
                          className="btn-icon p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleMoveQuestion(qIndex, 1)}
                          disabled={qIndex === questions.length - 1}
                          className="btn-icon p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="btn-icon p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* ADD QUESTIONS DASH */}
            <button 
              type="button" 
              onClick={handleAddField}
              className="add-question-bar bg-white flex items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-slate-50 hover:text-indigo-600 transition text-slate-400 text-sm font-semibold select-none"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir pregunta</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW PANEL */}
        <aside className="sticky top-[80px] h-fit md:max-h-[calc(100vh-140px)] flex flex-col z-35 transition-all duration-300">
          {previewCollapsed ? (
            <button
              type="button"
              onClick={() => setPreviewCollapsed(false)}
              className="flex flex-col items-center justify-center gap-3.5 py-7 px-1.5 bg-[#673ab7] hover:bg-[#5e31ac] text-white border border-[#4a2391] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
              title="Expandir vista previa"
              style={{ minHeight: '280px', width: '54px' }}
            >
              <Eye className="w-5 h-5 text-white group-hover:scale-125 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/95 text-center mt-2.5" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', letterSpacing: '0.12em' }}>
                MOSTRAR VISTA PREVIA
              </span>
            </button>
          ) : (
            <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col h-full overflow-hidden p-3 md:p-4">
              
              {/* Preview Controls header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-1">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Vista previa</span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewCollapsed(true)}
                    className="btn border rounded-lg p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"
                    title="Colapsar vista previa"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                  
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] sm:text-xs font-bold text-slate-500 select-none">
                    <input 
                      type="checkbox" 
                      checked={previewShowCorrect}
                      onChange={e => setPreviewShowCorrect(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    <span>Ver correctas</span>
                  </label>
                </div>
              </div>

              {/* Actual scrollable mock preview */}
              <div className="flex-1 overflow-y-auto mt-4 px-1 flex flex-col gap-4 text-left max-h-[400px] md:max-h-[600px]">
                <div className="border-b border-slate-100 pb-3 text-center">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    {(() => {
                      const t = title.trim() || 'Cuestionario sin título';
                      let lines = [t];
                      if (t.includes('\n')) {
                        lines = t.split('\n');
                      } else {
                        const separators = [' - ', ' – ', ' — '];
                        for (const sep of separators) {
                          if (t.includes(sep)) {
                            lines = t.split(sep);
                            break;
                          }
                        }
                      }
                      
                      return lines.map((line, idx) => (
                        <div 
                          key={idx} 
                          className={`uppercase text-center leading-relaxed tracking-wider text-slate-800 ${
                            idx === 0 
                              ? 'font-bold text-xs text-slate-900' 
                              : 'font-semibold text-[10px] text-slate-500 mt-0.5'
                          }`}
                        >
                          {line.trim()}
                        </div>
                      ));
                    })()}
                  </div>

                  {materia.trim() && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-100 text-[8px] uppercase font-bold text-slate-500">
                      {materia}
                    </span>
                  )}

                  {subtitulo.trim() && (
                    <p className="text-[10px] text-slate-600 font-serif italic leading-relaxed mt-2.5 max-w-xs mx-auto border-t border-b border-slate-100 py-1.5 px-2">
                      “{subtitulo}”
                    </p>
                  )}

                  {description.trim() && (
                    <p className="text-[10px] text-slate-400 mt-2 leading-normal">
                      {description}
                    </p>
                  )}
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-300">Vacío. Diseña preguntas en la izquierda para verlas ilustradas aquí.</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {questions.map((q, i) => (
                      <div key={q.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">P{i+1} · {q.puntos} Pts</div>
                        <p className="font-semibold text-slate-800 mb-2 whitespace-pre-wrap">{q.texto || 'Pregunta sin texto definitorio'}</p>

                        {(q.tipo === 'multiple' || q.tipo === 'checkbox' || q.tipo === 'dropdown' || q.tipo === 'tf') && (
                          <div className="flex flex-col gap-1.5">
                            {q.opciones.map((opt, oIdx) => {
                              const isSol = q.correctas.includes(oIdx);
                              const typeChar = q.tipo === 'checkbox' ? '☐' : '◯';
                              return (
                                <div key={oIdx} className="flex items-center gap-1.5 p-1.5 bg-white rounded border border-slate-150">
                                  <span className="text-[10px] text-slate-300 font-bold">{typeChar}</span>
                                  <span className="flex-1 font-medium text-[11px] whitespace-pre-wrap">{opt}</span>
                                  {previewShowCorrect && isSol && (
                                    <span className="text-emerald-600 font-bold text-xs" title="Respuesta marcada como válida">✓</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.tipo === 'abierta' && (
                          <textarea 
                            disabled 
                            rows={1}
                            placeholder="Entrada de texto del estudiante..." 
                            className="w-full bg-white p-2 border border-slate-150 rounded text-[11px]" 
                          />
                        )}

                        {q.tipo === 'escala' && (
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(n => (
                              <div key={n} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center font-bold text-[9px] bg-white text-slate-400">
                                {n}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.tipo === 'matching' && (
                          <div className="space-y-2 mt-2 text-left">
                            {/* Caja de palabras */}
                            <div className="bg-indigo-55 border border-indigo-110 p-2 rounded text-[10px] text-indigo-700 font-mono leading-normal">
                              <strong>Caja de palabras:</strong> {q.opciones.join(' – ')}
                            </div>
                            {/* Enunciados list with dropdowns */}
                            <div className="space-y-1.5">
                              {(q.enunciados || []).map((enun, eIdx) => {
                                const matchCorrectIdx = q.matchCorrectos ? q.matchCorrectos[eIdx] : 0;
                                return (
                                  <div key={eIdx} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border border-slate-150 text-[11px] leading-relaxed">
                                    <span className="font-semibold text-slate-400 shrink-0">{eIdx + 1}.</span>
                                    <span className="flex-1 whitespace-pre-wrap">{enun}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded border font-sans select-none">
                                        [Elegir]
                                      </span>
                                      {previewShowCorrect && (
                                        <span className="text-emerald-600 font-bold text-[10px]" title="Respuesta correcta">
                                          ({q.opciones[matchCorrectIdx] || 'n/a'})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {q.tipo === 'table' && (
                          <div className="space-y-3 mt-2 text-left">
                            {/* Caja de palabras */}
                            <div className="bg-indigo-55 border border-indigo-110 p-2 rounded text-[10px] text-indigo-700 font-mono leading-normal dark:bg-slate-900/40 dark:border-slate-800 dark:text-cyan-400">
                              <strong>Caja de palabras:</strong> {q.opciones.join(' – ')}
                            </div>
                            
                            {/* Table Layout Mockup */}
                            <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                              <table className="w-full text-[10px] md:text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                    {(q.columnas || []).map((col, colIdx) => (
                                      <th key={colIdx} className="p-1.5 font-bold text-slate-600 dark:text-slate-300 text-left border-r border-slate-150 dark:border-slate-800 last:border-0">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(q.tableRows || []).map((row, rIdx) => (
                                    <tr key={rIdx} className="border-b border-slate-150 dark:border-slate-800 last:border-0">
                                      {row.cells.map((cell, cIdx) => (
                                        <td key={cIdx} className="p-1.5 text-slate-700 dark:text-slate-305 border-r border-slate-150 dark:border-slate-800 last:border-0 font-medium whitespace-normal">
                                          {cell.tipo === 'texto' ? (
                                            <span>{cell.valor || <span className="text-slate-300 italic">Vacío</span>}</span>
                                          ) : (
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-slate-450 font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border dark:border-slate-750 w-fit">
                                                [Elegir]
                                              </span>
                                              {previewShowCorrect && (
                                                <span className="text-emerald-600 dark:text-emerald-405 font-bold text-[9px] mt-0.5">
                                                  ✓ {q.opciones[cell.correctOptionIdx ?? 0]}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
