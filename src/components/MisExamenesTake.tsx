/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Clock, RefreshCw, Award, CheckCircle, HelpCircle, Search, Lock, Shield, X, AlertCircle } from 'lucide-react';
import { User, Exam, Submission } from '../types';

interface MisExamenesTakeProps {
  currentUser: User;
  exams: Exam[];
  submissions: Submission[];
  onTakeExam: (examId: string) => void;
}

export default function MisExamenesTake({ currentUser, exams, submissions, onTakeExam }: MisExamenesTakeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Verification code validation states
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  const handleInitiateExam = (examId: string) => {
    setSelectedExamId(examId);
    setVerificationCode('');
    setVerificationError('');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInputCode = verificationCode.trim().toUpperCase();
    const studentCode = (currentUser.codigo || currentUser.id.substring(0, 4)).toUpperCase();

    if (cleanInputCode === studentCode) {
      if (selectedExamId) {
        onTakeExam(selectedExamId);
      }
      setSelectedExamId(null);
    } else {
      setVerificationError('Código de seguridad incorrecto. Inténtalo de nuevo.');
    }
  };

  const activeExams = exams
    .filter(e => e.estado === 'activo')
    .filter(e => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return e.titulo.toLowerCase().includes(q) || e.materia.toLowerCase().includes(q);
    });

  const mySubs = submissions.filter(s => s.estudianteId === currentUser.id);

  // Reset page to 1 when a search/filter search is entered
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const examsPerPage = 6;
  const totalPages = Math.ceil(activeExams.length / examsPerPage) || 1;
  const currentActivePage = Math.min(currentPage, totalPages);
  const paginatedExams = activeExams.slice((currentActivePage - 1) * examsPerPage, currentActivePage * examsPerPage);

  return (
    <div className="page-misExamenesTake animate-fade-in pb-12">
      <div className="page-header mb-6">
        <h2 className="page-title text-2xl font-bold tracking-tight text-slate-905" style={{ color: 'var(--gray-900)' }}>
          Exámenes disponibles
        </h2>
        <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
          Selecciona una evaluación disponible para responder. Lee las instrucciones de los docentes detenidamente.
        </div>
      </div>

      {/* Caja de Búsqueda de Exámenes Disponibles */}
      <div className="mb-6 flex flex-col md:flex-row items-center gap-4 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border justify-between">
        <div className="relative w-full md:max-w-md flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar examen por título o materia..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-800 transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-150"
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
          <span>Exámenes encontrados: </span>
          <span className="font-extrabold text-indigo-700">{activeExams.length}</span>
        </div>
      </div>

      {activeExams.length === 0 ? (
        <div className="card bg-white p-12 border border-slate-200 rounded-2xl text-center flex flex-col items-center theme-bg-surface theme-border">
          <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
          <h4 className="font-bold text-slate-600">
            {searchQuery ? 'No se encontraron exámenes' : 'No hay exámenes habilitados'}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? 'Prueba escribiendo otros términos de búsqueda de materia o examen.' : 'Los docentes aún no han configurado ni activado exámenes para este corte.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedExams.map(e => {
              const myAttempts = mySubs.filter(s => s.examenId === e.id);
              const canTake = e.intentos === 0 || myAttempts.length < e.intentos;
              const lastAttempt = myAttempts[myAttempts.length - 1];

              return (
                <div 
                  key={e.id} 
                  className="card bg-white p-5 rounded-2xl border border-slate-205 flex flex-col justify-between shadow-sm relative hover:border-slate-350 transition-colors theme-bg-surface theme-border"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <h4 className="font-bold text-base text-slate-800 leading-snug" style={{ color: 'var(--gray-900)' }}>{e.titulo}</h4>
                        <span className="badge mt-2 inline-flex px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 rounded">
                          {e.materia}
                        </span>
                      </div>

                      {lastAttempt && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          lastAttempt.aprobado 
                            ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                            : 'bg-rose-50 border border-rose-100 text-rose-700'
                        }`}>
                          {lastAttempt.puntaje}%
                        </span>
                      )}
                    </div>

                    {/* Metadata labels */}
                    <div className="flex flex-col gap-1.5 mt-3 my-4 text-xs font-semibold text-slate-500 font-sans">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-450" />
                        <span>{e.tiempo > 0 ? `${e.tiempo} minutos de límite` : 'Sin límite de tiempo'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-450" />
                        <span>{(e.preguntas || []).length} preguntas totales</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-slate-450" />
                        <span>Intentos: {myAttempts.length} / {e.intentos === 0 ? 'ilimitados' : e.intentos}</span>
                      </div>
                    </div>

                    {e.descripcion && (
                      <div className="p-3 mb-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic font-medium leading-relaxed">
                        {e.descripcion}
                      </div>
                    )}
                  </div>

                  {/* Submit / Take Button triggers */}
                  {canTake ? (
                    <button 
                      onClick={() => handleInitiateExam(e.id)}
                      className="btn btn-primary w-full p-2.5 rounded-xl text-white font-bold tracking-wide mt-2 block shadow-sm hover:scale-[1.01] transition-transform cursor-pointer"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      Presentar examen →
                    </button>
                  ) : (
                    <button 
                      disabled
                      className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold block text-sm select-none cursor-not-allowed mt-2"
                    >
                      Intentos agotados
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {activeExams.length > 6 && (
            <div className="flex items-center justify-between p-4.5 rounded-2xl border border-slate-200 bg-white shadow-sm theme-bg-surface theme-border">
              <span className="text-xs font-semibold text-slate-400">
                Mostrando { (currentActivePage - 1) * 6 + 1 } a { Math.min(currentActivePage * 6, activeExams.length) } de { activeExams.length } exámenes disponibles
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

      {/* Modal de Verificación de Código antes de presentar Examen */}
      {selectedExamId && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full relative theme-bg-surface theme-border">
            <button
              onClick={() => setSelectedExamId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3 text-indigo-600 border border-indigo-100">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>

              <h3 className="text-base font-extrabold text-slate-900" style={{ color: 'var(--gray-900)' }}>
                Validación de Código Estudiantil
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-xs">
                Para presentar tu examen parcial, digita tu código único de estudiante de 4 caracteres para autorizar el inicio.
              </p>

              <form onSubmit={handleVerifyCode} className="w-full mt-5 space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Código de Seguridad (4 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      setVerificationError('');
                    }}
                    placeholder="Ej: X9B2"
                    className="w-full text-center tracking-widest font-mono font-extrabold text-xl py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:outline-none transition text-slate-800"
                    autoFocus
                    required
                  />
                  {verificationError && (
                    <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{verificationError}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedExamId(null)}
                    className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition cursor-pointer"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    Confirmar Código
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
