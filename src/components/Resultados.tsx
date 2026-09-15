/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart3, Users, Award, Percent, Calendar, 
  ChevronRight, CalendarDays, Clock, Check, X, AlertCircle, RefreshCw, Trash2, Settings, Search
} from 'lucide-react';
import { User, Exam, Submission } from '../types';
import { avatarColor, avatarLetter, fmtDate, fmtTime, now } from '../lib/db';

interface ResultadosProps {
  currentUser: User;
  users: User[];
  exams: Exam[];
  submissions: Submission[];
  onUpdateSubmissions: (updated: Submission[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Resultados({ 
  currentUser, users, exams, submissions, onUpdateSubmissions, toast 
}: ResultadosProps) {

  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Local grading scores & comment forms
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [manualComments, setManualComments] = useState<Record<string, string>>({});

  const myExams = exams
    .filter(e => e.docenteId === currentUser.id || currentUser.rol === 'admin')
    .filter(e => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchesExam = e.titulo.toLowerCase().includes(q) || e.materia.toLowerCase().includes(q);
      if (matchesExam) return true;
      
      // Check if student name matches
      const examSubs = submissions.filter(s => s.examenId === e.id);
      return examSubs.some(s => {
        const student = users.find(u => u.id === s.estudianteId);
        const name = student ? student.nombre : (s.estudianteNombre || '');
        return name.toLowerCase().includes(q);
      });
    });

  const examsPerPage = 4;
  const totalPages = Math.ceil(myExams.length / examsPerPage) || 1;
  const currentActivePage = Math.min(currentPage, totalPages);
  const paginatedExams = myExams.slice((currentActivePage - 1) * examsPerPage, currentActivePage * examsPerPage);
  
  const handleOpenGradingModal = (subId: string) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;
    setActiveSubId(subId);
    setManualScores(sub.manualScores || {});
    setManualComments(sub.manualComments || {});
  };

  const handleManualScoreChange = (qid: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    setManualScores(prev => ({ ...prev, [qid]: clamped }));
  };

  const handleManualCommentChange = (qid: string, val: string) => {
    setManualComments(prev => ({ ...prev, [qid]: val }));
  };

  const handleSaveGrading = () => {
    if (!activeSubId) return;
    const sub = submissions.find(s => s.id === activeSubId);
    const exam = exams.find(e => e.id === sub?.examenId);
    if (!sub || !exam) return;

    let manualSum = 0;
    let autoSum = 0;
    let totalMax = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    exam.preguntas.forEach(q => {
      totalMax += q.puntos;
      const ans = sub.respuestas[q.id];

      if (q.tipo === 'abierta' || q.tipo === 'escala') {
        const score = manualScores[q.id] !== undefined ? Number(manualScores[q.id]) : 0;
        manualSum += score;
        if (score >= q.puntos * 0.6) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else if (q.tipo === 'multiple' || q.tipo === 'tf' || q.tipo === 'dropdown') {
        if (q.correctas.includes(Number(ans))) {
          autoSum += q.puntos;
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else if (q.tipo === 'matching') {
        const userMatchedObj = ans || {};
        const matchesList = q.matchCorrectos || [];
        const enunciadosList = q.enunciados || [];
        let matchesCorrectSum = 0;
        
        enunciadosList.forEach((_, eIdx) => {
          const userVal = userMatchedObj[eIdx];
          const correctVal = matchesList[eIdx];
          if (userVal !== undefined && userVal !== '' && Number(userVal) === Number(correctVal)) {
            matchesCorrectSum++;
          }
        });
        
        const fraction = enunciadosList.length > 0 ? (matchesCorrectSum / enunciadosList.length) : 0;
        autoSum += q.puntos * fraction;
        
        if (matchesCorrectSum === enunciadosList.length) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else if (q.tipo === 'table') {
        const userAnswersObj = ans || {};
        let totalBlanksCount = 0;
        let correctBlanksCount = 0;

        // Group elements by column index to validate dynamically by category column
        const colBlanksConfig: Record<number, number[]> = {};
        const colBlanksStudentAnswers: Record<number, number[]> = {};

        (q.tableRows || []).forEach((row, rIdx) => {
          row.cells.forEach((cell, cIdx) => {
            if (cell.tipo === 'blank') {
              totalBlanksCount++;
              const correctVal = cell.correctOptionIdx ?? 0;
              if (!colBlanksConfig[cIdx]) colBlanksConfig[cIdx] = [];
              colBlanksConfig[cIdx].push(correctVal);

              const userVal = userAnswersObj[`${rIdx}-${cIdx}`];
              if (userVal !== undefined && userVal !== '') {
                if (!colBlanksStudentAnswers[cIdx]) colBlanksStudentAnswers[cIdx] = [];
                colBlanksStudentAnswers[cIdx].push(Number(userVal));
              }
            }
          });
        });

        // Evaluate column-by-column (Flexible category matching)
        Object.keys(colBlanksConfig).forEach((keyStr) => {
          const cIdx = Number(keyStr);
          const allowed = [...colBlanksConfig[cIdx]];
          const studentAnswers = colBlanksStudentAnswers[cIdx] || [];

          studentAnswers.forEach((val) => {
            const indexInAllowed = allowed.indexOf(val);
            if (indexInAllowed !== -1) {
              correctBlanksCount++;
              allowed.splice(indexInAllowed, 1);
            }
          });
        });

        const fraction = totalBlanksCount > 0 ? (correctBlanksCount / totalBlanksCount) : 0;
        autoSum += q.puntos * fraction;

        if (totalBlanksCount > 0 && correctBlanksCount === totalBlanksCount) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else if (q.tipo === 'checkbox') {
        const answersList = ans || [];
        const correctList = q.correctas || [];
        const isMatched = JSON.stringify([...answersList].sort()) === JSON.stringify([...correctList].sort());
        if (isMatched) {
          autoSum += q.puntos;
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const finalScore = totalMax > 0 ? Math.round(((autoSum + manualSum) / totalMax) * 100) : 0;
    const isApproved = finalScore >= (exam.aprobacion || 60);

    const updatedSubs = submissions.map(s => {
      if (s.id === activeSubId) {
        return {
          ...s,
          puntaje: finalScore,
          aprobado: isApproved,
          correctas: correctCount,
          incorrectas: incorrectCount,
          manualScores,
          manualComments,
          estado: 'calificado' as const,
          gradedBy: currentUser.id,
          gradedAt: now(),
        };
      }
      return s;
    });

    onUpdateSubmissions(updatedSubs);
    setActiveSubId(null);
    toast('Calificaciones actualizadas con éxito', 'success');
  };

  const activeSub = submissions.find(s => s.id === activeSubId);
  const activeExam = exams.find(e => e.id === activeSub?.examenId);
  const grName = activeSub ? (users.find(u => u.id === activeSub.estudianteId)?.nombre || activeSub.estudianteNombre) : '';

  return (
    <div className="page-resultados animate-fade-in pb-12">
      <div className="page-header mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Resultados de evaluaciones
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500">
            Revisa estadísticas, entregas de estudiantes y califica manualmente respuestas abiertas
          </div>
        </div>
        {currentUser.rol === 'admin' && (
          <button
            onClick={() => {
              setShowDangerZone(!showDangerZone);
              if (!showDangerZone) {
                toast('Botones de eliminación de historial habilitados temporalmente.', 'warning');
              }
            }}
            className={`px-3 py-1.5 border text-xs font-extrabold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0 select-none ${
              showDangerZone 
                ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 hover:border-rose-450' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{showDangerZone ? '🔒 Desactivar Limpieza' : '🛠️ Modo Limpieza'}</span>
          </button>
        )}
      </div>

      {/* Caja de Búsqueda de Evaluaciones/Estudiantes */}
      <div className="mb-6 flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border justify-between">
        <div className="relative w-full md:max-w-md flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título de examen, materia o nombre del estudiante..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-800 transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-150"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer font-extrabold select-none text-xs transition"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-start md:self-auto text-xs font-semibold text-slate-500 bg-slate-50/70 py-1.5 px-3 rounded-lg border border-slate-100 select-none">
          <span>Evaluaciones encontradas: </span>
          <span className="font-extrabold text-indigo-700">{myExams.length}</span>
        </div>
      </div>

      {currentUser.rol === 'admin' && showDangerZone && submissions.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/20 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <span className="text-xs font-black text-rose-700 uppercase tracking-widest block select-none">
              ⚠️ ZONA DE SEGURIDAD / ELIMINACIÓN HISTORIAL (ADMINISTRADOR)
            </span>
            <p className="text-[11px] font-semibold text-rose-600 leading-relaxed max-w-2xl">
              Estás en Modo Limpieza. Ahora puedes ver los botones ocultos para eliminar entregas individuales por estudiante debajo, limpiar un parcial completo, o borrar todo el historial masivamente.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('🚨 ¡ATENCIÓN! ¿Estás totalmente seguro de que deseas eliminar absolutamente TODO el historial de entregas de todos los exámenes del sistema? Esta acción no se puede deshacer.')) {
                onUpdateSubmissions([]);
                toast('Se ha eliminado por completo todo el historial de entregas.', 'success');
                setShowDangerZone(false);
              }
            }}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Todo el Historial</span>
          </button>
        </div>
      )}

      {myExams.length === 0 ? (
        <div className="card bg-white p-8 border rounded-2xl text-center flex flex-col items-center justify-center">
          <Search className="w-10 h-10 text-slate-350 mb-3" />
          <h4 className="font-bold text-slate-700">
            {searchQuery ? 'No se encontraron resultados' : 'Sin estadísticas disponibles'}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? 'Prueba ajustando el texto de tu búsqueda o busca un estudiante diferente.' : 'Cuando tengas exámenes creados con entregas aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {paginatedExams.map(exam => {
            const examSubs = submissions.filter(s => s.examenId === exam.id);
            const totalScore = examSubs.reduce((acc, current) => acc + current.puntaje, 0);
            const avgScore = examSubs.length ? Math.round(totalScore / examSubs.length) : 0;
            const passCount = examSubs.filter(s => s.aprobado).length;

            return (
              <div key={exam.id} className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border">
                <div className="flex justify-between items-start gap-4 mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800" style={{ color: 'var(--gray-900)' }}>{exam.titulo}</h3>
                    <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider select-none">
                      {exam.materia} · {exam.preguntas.length} preguntas · {examSubs.length} entregas
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser.rol === 'admin' && showDangerZone && examSubs.length > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que deseas eliminar todas las entregas (${examSubs.length}) para el examen "${exam.titulo}"? Esta acción no se puede deshacer.`)) {
                            const updated = submissions.filter(s => s.examenId !== exam.id);
                            onUpdateSubmissions(updated);
                            toast(`Se han eliminado las entregas para el examen "${exam.titulo}"`, 'success');
                          }
                        }}
                        className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 hover:border-rose-300 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition animate-fade-in"
                        title="Eliminar historial completo de este examen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Limpiar entregas</span>
                      </button>
                    )}
                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold border rounded-full ${
                      exam.estado === 'activo' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {exam.estado}
                    </span>
                  </div>
                </div>

                {/* Score Stats boxes */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center theme-bg-surface">
                    <span className="block text-2xl font-bold text-slate-800" style={{ color: 'var(--gray-900)' }}>{examSubs.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Entregas</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center theme-bg-surface">
                    <span className="block text-2xl font-bold text-indigo-700">{avgScore}%</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Promedio</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center theme-bg-surface">
                    <span className="block text-2xl font-bold text-emerald-600">{passCount}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Aprobados</span>
                  </div>
                </div>

                {/* Submissions list */}
                {examSubs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Ningún estudiante ha tomado este examen todavía</p>
                ) : (
                  <div className="table-wrap overflow-hidden border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                          <th className="py-2.5 px-4">Estudiante</th>
                          <th className="py-2.5 px-4">Nota</th>
                          <th className="py-2.5 px-4">Estado</th>
                          <th className="py-2.5 px-4">Tiempo</th>
                          <th className="py-2.5 px-4">Fecha</th>
                          <th className="py-2.5 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-105 font-medium">
                        {examSubs.map(s => {
                          const student = users.find(u => u.id === s.estudianteId);
                          const stName = student?.nombre || s.estudianteNombre;
                          const isPending = s.estado === 'pendiente';

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: avatarColor(stName) }}
                                  >
                                    {avatarLetter(stName)}
                                  </div>
                                  <span className="text-slate-800 font-semibold">{stName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-bold border rounded-full ${
                                  s.aprobado 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border-rose-105'
                                }`}>
                                  {s.puntaje}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {isPending ? (
                                  <span className="text-amber-600 inline-flex items-center gap-1 text-xs">
                                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                    <span>Pendiente grading</span>
                                  </span>
                                ) : s.aprobado ? (
                                  <span className="text-emerald-600 text-xs font-bold">Aprobado</span>
                                ) : (
                                  <span className="text-rose-600 text-xs font-bold">Reprobado</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-400">{s.tiempoUsado || '—'}</td>
                              <td className="py-3 px-4 text-xs text-slate-400">
                                {fmtDate(s.fecha)} {fmtTime(s.fecha)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleOpenGradingModal(s.id)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-705 text-xs font-bold rounded-lg transition duration-150 cursor-pointer"
                                  >
                                    Ver respuestas
                                  </button>
                                  {currentUser.rol === 'admin' && showDangerZone && (
                                    <button 
                                      onClick={() => {
                                        if (window.confirm(`¿Seguro que deseas eliminar el intento de ${stName}? Esta acción no se puede deshacer.`)) {
                                          const updated = submissions.filter(sub => sub.id !== s.id);
                                          onUpdateSubmissions(updated);
                                          toast(`Intento de ${stName} eliminado con éxito`, 'success');
                                        }
                                      }}
                                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-105 rounded-lg transition cursor-pointer"
                                      title="Eliminar este intento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {myExams.length > 4 && (
            <div className="flex items-center justify-between p-4.5 rounded-2xl border border-slate-200 bg-white shadow-sm theme-bg-surface theme-border">
              <span className="text-xs font-semibold text-slate-400">
                Mostrando { (currentActivePage - 1) * 4 + 1 } a { Math.min(currentActivePage * 4, myExams.length) } de { myExams.length } evaluaciones
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-2">
                  Página {currentActivePage} de {totalPages}
                </span>
                <button
                  disabled={currentActivePage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition"
                >
                  Anterior
                </button>
                <button
                  disabled={currentActivePage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE SUBMISSION GRADING MODAL */}
      {activeSubId && activeSub && activeExam && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-y-auto max-h-[90vh] theme-bg-surface flex flex-col">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">Detalles del Examen</h3>
              <button 
                onClick={() => setActiveSubId(null)} 
                className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="modal-body p-5 space-y-5 overflow-y-auto flex-1 text-left">
              
              {/* Score circle layout */}
              <div className="text-center py-4 flex flex-col items-center">
                <div className={`w-[96px] h-[96px] rounded-full flex flex-col items-center justify-center border-4 ${
                  activeSub.aprobado 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-rose-500 bg-rose-50 text-rose-700'
                }`}>
                  <span className="text-2xl font-extrabold">{activeSub.puntaje}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide mt-0.5">
                    {activeSub.aprobado ? 'Aprobado' : 'Reprobado'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-800 mt-2.5">{grName}</h4>
                <p className="text-xs text-slate-400">{activeExam.titulo}</p>

                {/* Details banner */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-4">
                  <div className="bg-slate-50 border p-2 rounded-lg text-center">
                    <span className="block text-sm font-semibold text-slate-700">{activeSub.correctas}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Correctas</span>
                  </div>
                  <div className="bg-slate-50 border p-2 rounded-lg text-center">
                    <span className="block text-sm font-semibold text-slate-700">{activeSub.incorrectas}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Incorrectas</span>
                  </div>
                  <div className="bg-slate-50 border p-2 rounded-lg text-center">
                    <span className="block text-sm font-semibold text-slate-700">{activeSub.tiempoUsado}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Tiempo</span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Questions Renderers for verification */}
              <div className="space-y-4">
                <h5 className="font-bold text-sm text-slate-800 mb-3">Respuestas enviadas:</h5>
                {activeExam.preguntas.map((q, index) => {
                  const studentAns = activeSub.respuestas[q.id];
                  let isCorrect: boolean | null = null;
                  let readableAnsText = '';
                  let matchingDetails: { enunciado: string; correctTerm: string; studentTerm: string; isItemCorrect: boolean }[] = [];
                  let tableDetails: { filaIdx: number; colIdx: number; colName: string; correctTerm: string; studentTerm: string; isItemCorrect: boolean }[] = [];

                  if (q.tipo === 'abierta') {
                    readableAnsText = studentAns || 'Sin respuesta';
                  } else if (q.tipo === 'multiple' || q.tipo === 'tf' || q.tipo === 'dropdown') {
                    const idx = Number(studentAns);
                    isCorrect = q.correctas.includes(idx);
                    readableAnsText = (q.tipo === 'tf' ? ['Verdadero', 'Falso'][idx] : q.opciones[idx]) || 'Sin respuesta';
                  } else if (q.tipo === 'checkbox') {
                    const selected = studentAns || [];
                    isCorrect = JSON.stringify([...selected].sort()) === JSON.stringify([...q.correctas].sort());
                    readableAnsText = selected.map((s: number) => q.opciones[s]).join(', ') || 'Sin respuesta';
                  } else if (q.tipo === 'escala') {
                    readableAnsText = studentAns ? `Puntaje: ${studentAns}` : 'Sin responder';
                  } else if (q.tipo === 'matching') {
                    const userMatchedObj = studentAns || {};
                    const matchesList = q.matchCorrectos || [];
                    const enunciadosList = q.enunciados || [];
                    let correctCountMatches = 0;

                    matchingDetails = enunciadosList.map((enun, eIdx) => {
                      const correctIdx = matchesList[eIdx];
                      const studentIdx = userMatchedObj[eIdx];
                      const correctTerm = q.opciones[correctIdx] || '—';
                      const studentTerm = studentIdx !== undefined && studentIdx !== '' ? q.opciones[studentIdx] : 'Sin responder';
                      const isItemCorrect = studentIdx !== undefined && studentIdx !== '' && Number(studentIdx) === Number(correctIdx);
                      if (isItemCorrect) correctCountMatches++;
                      return { enunciado: enun, correctTerm, studentTerm, isItemCorrect };
                    });

                    isCorrect = correctCountMatches === enunciadosList.length;
                    readableAnsText = `${correctCountMatches} de ${enunciadosList.length} correctas`;
                  } else if (q.tipo === 'table') {
                    const userAnswersObj = studentAns || {};
                    let totalBlanksCount = 0;
                    let correctBlanksCount = 0;

                    // Group all valid options allowed for each column
                    const allowedByCol: Record<number, number[]> = {};
                    (q.tableRows || []).forEach((row) => {
                      row.cells.forEach((cell, cIdx) => {
                        if (cell.tipo === 'blank') {
                          if (!allowedByCol[cIdx]) allowedByCol[cIdx] = [];
                          allowedByCol[cIdx].push(cell.correctOptionIdx ?? 0);
                        }
                      });
                    });

                    // Track used ones per column to avoid duplicate scoring
                    const consumedByCol: Record<number, number[]> = {};

                    (q.tableRows || []).forEach((row, rIdx) => {
                      row.cells.forEach((cell, cIdx) => {
                        if (cell.tipo === 'blank') {
                          totalBlanksCount++;
                          const colName = (q.columnas || [])[cIdx] || `Columna ${cIdx + 1}`;
                          const correctIdx = cell.correctOptionIdx ?? 0;
                          const studentIdx = userAnswersObj[`${rIdx}-${cIdx}`];
                          const correctTerm = q.opciones[correctIdx] || '—';
                          const studentTerm = studentIdx !== undefined && studentIdx !== '' ? q.opciones[studentIdx] : 'Sin responder';
                          
                          let isItemCorrect = false;
                          if (studentIdx !== undefined && studentIdx !== '') {
                            const sVal = Number(studentIdx);
                            const allowed = allowedByCol[cIdx] || [];
                            const consumed = consumedByCol[cIdx] || [];
                            const allowCount = allowed.filter(v => v === sVal).length;
                            const consumeCount = consumed.filter(v => v === sVal).length;
                            if (allowCount > consumeCount) {
                              if (!consumedByCol[cIdx]) consumedByCol[cIdx] = [];
                              consumedByCol[cIdx].push(sVal);
                              isItemCorrect = true;
                              correctBlanksCount++;
                            }
                          }

                          tableDetails.push({
                            filaIdx: rIdx,
                            colIdx: cIdx,
                            colName,
                            correctTerm,
                            studentTerm,
                            isItemCorrect
                          });
                        }
                      });
                    });

                    isCorrect = totalBlanksCount > 0 && correctBlanksCount === totalBlanksCount;
                    readableAnsText = `${correctBlanksCount} de ${totalBlanksCount} correctas`;
                  }

                  const isTextGraded = q.tipo === 'abierta' || q.tipo === 'escala';
                  const earnedPoints = isTextGraded 
                    ? (manualScores[q.id] !== undefined ? manualScores[q.id] : 0) 
                    : (q.tipo === 'matching' 
                        ? (() => {
                          const userMatchedObj = studentAns || {};
                          const matchesList = q.matchCorrectos || [];
                          const enunciadosList = q.enunciados || [];
                          let matchesCorrectSum = 0;
                          enunciadosList.forEach((_, eIdx) => {
                            const userVal = userMatchedObj[eIdx];
                            const correctVal = matchesList[eIdx];
                            if (userVal !== undefined && userVal !== '' && Number(userVal) === Number(correctVal)) {
                              matchesCorrectSum++;
                            }
                          });
                          const fraction = enunciadosList.length > 0 ? (matchesCorrectSum / enunciadosList.length) : 0;
                          return Math.round(q.puntos * fraction);
                        })()
                        : (q.tipo === 'table'
                            ? (() => {
                              const userAnswersObj = studentAns || {};
                              let totalBlanksCount = 0;
                              let correctBlanksCount = 0;

                              const colBlanksConfig: Record<number, number[]> = {};
                              const colBlanksStudentAnswers: Record<number, number[]> = {};

                              (q.tableRows || []).forEach((row, rIdx) => {
                                row.cells.forEach((cell, cIdx) => {
                                  if (cell.tipo === 'blank') {
                                    totalBlanksCount++;
                                    const correctVal = cell.correctOptionIdx ?? 0;
                                    if (!colBlanksConfig[cIdx]) colBlanksConfig[cIdx] = [];
                                    colBlanksConfig[cIdx].push(correctVal);

                                    const userVal = userAnswersObj[`${rIdx}-${cIdx}`];
                                    if (userVal !== undefined && userVal !== '') {
                                      if (!colBlanksStudentAnswers[cIdx]) colBlanksStudentAnswers[cIdx] = [];
                                      colBlanksStudentAnswers[cIdx].push(Number(userVal));
                                    }
                                  }
                                });
                              });

                              Object.keys(colBlanksConfig).forEach((keyStr) => {
                                const cIdx = Number(keyStr);
                                const allowed = [...colBlanksConfig[cIdx]];
                                const studentAnswers = colBlanksStudentAnswers[cIdx] || [];

                                studentAnswers.forEach((val) => {
                                  const indexInAllowed = allowed.indexOf(val);
                                  if (indexInAllowed !== -1) {
                                    correctBlanksCount++;
                                    allowed.splice(indexInAllowed, 1);
                                  }
                                });
                              });

                              const fraction = totalBlanksCount > 0 ? (correctBlanksCount / totalBlanksCount) : 0;
                              return Math.round(q.puntos * fraction);
                            })()
                            : (isCorrect ? q.puntos : 0)
                          )
                      );

                  const bannerBg = isTextGraded 
                    ? 'bg-slate-50 border-slate-205'
                    : isCorrect 
                      ? 'bg-emerald-50/55 border-emerald-100 text-slate-800' 
                      : 'bg-rose-50/55 border-rose-100 text-slate-800';

                  const canGrade = currentUser.rol === 'admin' || activeExam.docenteId === currentUser.id;

                  return (
                    <div key={q.id} className={`p-4 rounded-xl border ${bannerBg} text-slate-700 text-xs`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">
                          Pregunta {index + 1} · {q.puntos} pts
                        </span>
                        <span className="font-bold text-indigo-700">Puntos: {earnedPoints} / {q.puntos}</span>
                      </div>
                      
                      <p className="font-bold text-slate-900 leading-snug mb-2.5 whitespace-pre-wrap">{q.texto}</p>
                      
                      <div className="flex items-start gap-1 p-2 bg-white rounded border border-slate-100 mt-2 font-medium">
                        {isTextGraded ? (
                          <span className="text-slate-400 font-bold mr-1">📝</span>
                        ) : isCorrect ? (
                          <span className="text-emerald-600 font-bold mr-1">✅</span>
                        ) : (
                          <span className="text-rose-600 font-bold mr-1">❌</span>
                        )}
                        <span className="flex-1 italic whitespace-pre-wrap">{readableAnsText}</span>
                      </div>

                      {/* If matching question, present a detailed side-by-side matches breakdown */}
                      {q.tipo === 'matching' && matchingDetails.length > 0 && (
                        <div className="mt-3 space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                          <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-505 uppercase tracking-wide mb-2.5 block text-left">
                            Análisis de Relación de Conceptos:
                          </div>
                          <div className="space-y-1.5">
                            {matchingDetails.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className={`flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-3 p-2.5 rounded-lg border bg-white shadow-sm font-medium text-left transition ${
                                  item.isItemCorrect 
                                    ? 'border-emerald-100 dark:border-emerald-900/30' 
                                    : 'border-rose-100 dark:border-rose-950/30'
                                }`}
                              >
                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                  <span className="text-slate-400 font-extrabold shrink-0">{itemIdx + 1}.</span>
                                  <span className="text-slate-700 dark:text-slate-200 font-semibold whitespace-pre-wrap">{item.enunciado}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    item.isItemCorrect 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                      : 'bg-rose-55 text-rose-700 dark:bg-rose-950/40 dark:text-rose-405'
                                  }`}>
                                    Elegiste: {item.studentTerm}
                                  </span>
                                  {!item.isItemCorrect && (
                                    <span className="text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                                      Correcta: {item.correctTerm}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* If table question, present a detailed side-by-side matches breakdown */}
                      {q.tipo === 'table' && tableDetails.length > 0 && (
                        <div className="mt-3 space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/20 dark:border-slate-800">
                          <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-505 uppercase tracking-wide mb-2.5 block text-left">
                            Análisis de Respuestas en la Tabla:
                          </div>
                          <div className="space-y-1.5">
                            {tableDetails.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className={`flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-3 p-2.5 rounded-lg border bg-white shadow-sm font-medium text-left transition ${
                                  item.isItemCorrect 
                                    ? 'border-emerald-100 dark:border-emerald-900/30' 
                                    : 'border-rose-100 dark:border-rose-950/30'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="text-slate-400 font-extrabold shrink-s mr-1.5 text-[10px]">Espacio {itemIdx + 1}:</span>
                                  <span className="text-slate-705 dark:text-slate-300">
                                    Fila {item.filaIdx + 1} · Columna <span className="text-indigo-600 font-bold dark:text-cyan-400">{item.colName}</span>
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    item.isItemCorrect 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                      : 'bg-rose-55 text-rose-700 dark:bg-rose-950/40 dark:text-rose-405'
                                  }`}>
                                    Pusiste: {item.studentTerm}
                                  </span>
                                  {!item.isItemCorrect && (
                                    <span className="text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                                      Correcta: {item.correctTerm}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expected correct options if wrong */}
                      {!isTextGraded && q.tipo !== 'matching' && q.tipo !== 'table' && isCorrect === false && (
                        <div className="mt-2 text-[10px] text-emerald-600 font-bold">
                          ✓ Correcta: {q.correctas.map(idx => q.opciones[idx]).join(' + ')}
                        </div>
                      )}

                      {/* Manual grading form for open text answers */}
                      {isTextGraded && canGrade && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-220 flex flex-col sm:flex-row gap-3 items-center">
                          <label className="text-[11px] font-bold text-slate-600 select-none block shrink-0">Calificar puntos:</label>
                          <input 
                            type="number" 
                            min={0}
                            max={q.puntos}
                            value={manualScores[q.id] !== undefined ? manualScores[q.id] : ''}
                            onChange={e => handleManualScoreChange(q.id, Number(e.target.value), q.puntos)}
                            className="bg-slate-50 w-20 p-1.5 border rounded text-center text-xs font-bold"
                            placeholder="Score"
                          />
                          <input 
                            type="text" 
                            value={manualComments[q.id] || ''}
                            onChange={e => handleManualCommentChange(q.id, e.target.value)}
                            placeholder="Escribe comentarios u observaciones opcionales..."
                            className="bg-slate-50 p-1.5 border rounded text-xs flex-1 text-slate-700 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="modal-footer border-t border-slate-100 p-4 shrink-0 flex justify-end gap-2.5 bg-slate-50 rounded-b-2xl">
              <button 
                onClick={() => setActiveSubId(null)}
                className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-100 cursor-pointer text-slate-700 bg-white"
              >
                Cerrar
              </button>
              {(currentUser.rol === 'admin' || activeExam.docenteId === currentUser.id) && (
                <button 
                  onClick={handleSaveGrading}
                  className="btn btn-primary px-4.5 py-2 text-white font-semibold rounded-xl flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar evaluación</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
