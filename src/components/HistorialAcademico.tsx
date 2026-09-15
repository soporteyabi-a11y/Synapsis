/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Award, BookOpen, Clock, FileSpreadsheet, 
  Search, ChevronRight, CheckCircle, Percent, ShieldCheck 
} from 'lucide-react';
import { User, Exam, Submission, GradeRecord, Subject, Parcial } from '../types';
import { avatarColor, avatarLetter, fmtDate } from '../lib/db';

interface HistorialAcademicoProps {
  users: User[];
  exams: Exam[];
  submissions: Submission[];
  gradeRecords: GradeRecord[];
  subjects: Subject[];
  parciales: Parcial[];
}

export default function HistorialAcademico({ 
  users, exams, submissions, gradeRecords, subjects, parciales 
}: HistorialAcademicoProps) {
  const estudiantes = users.filter(u => u.rol === 'estudiante');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => estudiantes[0]?.id || null);
  const [query, setQuery] = useState('');

  const filteredEstudiantes = estudiantes.filter(e => 
    e.nombre.toLowerCase().includes(query.toLowerCase()) || 
    e.email.toLowerCase().includes(query.toLowerCase())
  );

  const activeStudent = estudiantes.find(e => e.id === selectedStudentId);

  // Computations for active student
  const studentSubs = submissions.filter(s => s.estudianteId === selectedStudentId);
  const studentGrades = gradeRecords.filter(g => g.estudianteId === selectedStudentId);

  // Compute average on a 5.0 scale
  // Submissions are on a 100% scale (percentage / 20 converts to 5.0 scale)
  // GradeRecords are on a 5.0 scale natively
  let overallAvg = 0;
  const gradesList: number[] = [];

  studentSubs.forEach(s => {
    // Only compile finalized grades
    if (s.estado !== 'pendiente') {
      gradesList.push(s.puntaje / 20); // 80% becomes 4.0
    }
  });

  studentGrades.forEach(g => {
    gradesList.push(g.nota);
  });

  if (gradesList.length > 0) {
    const sum = gradesList.reduce((acc, c) => acc + c, 0);
    overallAvg = Math.round((sum / gradesList.length) * 10) / 10; // decimal rounded
  }

  return (
    <div className="page-historialAcademico animate-fade-in pb-12">
      <div className="page-header mb-6">
        <h2 className="page-title text-2xl font-bold tracking-tight text-slate-905" style={{ color: 'var(--gray-900)' }}>
          Historial escolar y actas académicas
        </h2>
        <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
          Inspecciona las sábanas de notas, promedios acumulados e historial de entregas de cada estudiante
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        
        {/* LEFT COLUMN: ESTUDIANTES DIRECTORY LIST */}
        <div className="flex flex-col gap-3.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar estudiante..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-indigo-605"
            />
          </div>

          <div className="card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col max-h-[480px] overflow-y-auto theme-bg-surface theme-border">
            <div className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider theme-bg-surface">
              Directorio de alumnos ({filteredEstudiantes.length})
            </div>
            {filteredEstudiantes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">No se encontraron coincidencias</div>
            ) : (
              <div className="divide-y divide-slate-50 font-medium">
                {filteredEstudiantes.map(e => {
                  const isSel = e.id === selectedStudentId;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedStudentId(e.id)}
                      className={`w-full text-left p-3 flex items-center justify-between transition-colors select-none cursor-pointer ${
                        isSel ? 'bg-indigo-50/75 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 max-w-[190px] truncate">
                        <div 
                          className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-sm"
                          style={{ backgroundColor: avatarColor(e.nombre) }}
                        >
                          {avatarLetter(e.nombre)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-805 block truncate" style={isSel ? { color: 'var(--primary)' } : {}}>{e.nombre}</span>
                          <span className="text-[9px] text-slate-400 block truncate">{e.email}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-350 transition ${isSel ? 'translate-x-1 text-indigo-505' : ''}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED SCHOLAR SHEET */}
        <div className="flex flex-col gap-5">
          {activeStudent ? (
            <div className="flex flex-col gap-5">
              
              {/* Student Header Summary banner */}
              <div className="card bg-white p-5 rounded-2xl border border-slate-201 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 theme-bg-surface theme-border">
                <div className="flex items-center gap-3.5 text-left self-start">
                  <div 
                    className="w-13 h-13 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow"
                    style={{ backgroundColor: avatarColor(activeStudent.nombre) }}
                  >
                    {avatarLetter(activeStudent.nombre)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-850" style={{ color: 'var(--gray-900)' }}>{activeStudent.nombre}</h3>
                    <p className="text-xs text-slate-400 font-semibold">{activeStudent.email} · Código curricular: {activeStudent.id.substring(0,6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex gap-4 self-stretch md:self-auto font-sans">
                  <div className="border border-slate-105 p-2.5 rounded-xl text-center bg-slate-50 min-w-[70px] flex-1 md:flex-none">
                    <span className="block text-xl font-black text-indigo-700">{overallAvg > 0 ? overallAvg.toFixed(1) : '—'}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Promedio</span>
                  </div>
                  <div className="border border-slate-105 p-2.5 rounded-xl text-center bg-slate-50 min-w-[70px] flex-1 md:flex-none">
                    <span className="block text-xl font-bold text-slate-705">{studentSubs.length}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Exámenes</span>
                  </div>
                  <div className="border border-slate-105 p-2.5 rounded-xl text-center bg-slate-50 min-w-[70px] flex-1 md:flex-none">
                    <span className="block text-xl font-bold text-slate-705">{studentGrades.length}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Notas Reg</span>
                  </div>
                </div>
              </div>

              {/* DETAILS MODULE TABLE STACKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Exam Submissions */}
                <div className="card bg-white p-4.5 rounded-2xl border border-slate-201 shadow-sm theme-bg-surface theme-border text-left">
                  <h4 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-1.5" style={{ color: 'var(--gray-900)' }}>
                    <Percent className="w-4 h-4 text-indigo-600" />
                    <span>Evaluaciones presentadas</span>
                  </h4>

                  {studentSubs.length === 0 ? (
                    <p className="text-xs text-slate-405 italic py-6 text-center">Este estudiante no ha presentado exámenes</p>
                  ) : (
                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                      {studentSubs.map(sub => {
                        const ex = exams.find(e => e.id === sub.examenId);
                        const isPend = sub.estado === 'pendiente';
                        return (
                          <div key={sub.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{ex?.titulo || 'Evaluación'}</div>
                              <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{ex?.materia} · {sub.tiempoUsado} usado</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">{fmtDate(sub.fecha)}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`block font-black text-sm text-slate-805 ${sub.aprobado ? 'text-emerald-700' : 'text-rose-600'}`}>{sub.puntaje}%</span>
                              <span className="text-[10px] font-bold block mt-1">
                                {isPend ? 'Pendiente' : sub.aprobado ? 'Aprobado' : 'Reprobado'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Hand-Graded registers */}
                <div className="card bg-white p-4.5 rounded-2xl border border-slate-201 shadow-sm theme-bg-surface theme-border text-left">
                  <h4 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-1.5" style={{ color: 'var(--gray-900)' }}>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Calificaciones manuales</span>
                  </h4>

                  {studentGrades.length === 0 ? (
                    <p className="text-xs text-slate-405 italic py-6 text-center">Sin calificaciones registradas manualmente</p>
                  ) : (
                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                      {studentGrades.map(grade => {
                        const sCourse = linkSubject(grade.asignaturaId, grade.parcialId);
                        return (
                          <div key={grade.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                            <div className="max-w-[190px] truncate">
                              <div className="font-bold text-slate-805 truncate">{sCourse.subName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">{sCourse.parcName}</div>
                              {grade.comentario && <div className="text-[10px] text-slate-450 italic mt-1.5 truncate">"{grade.comentario}"</div>}
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`block font-extrabold text-sm ${grade.aprobado ? 'text-emerald-700' : 'text-rose-600'}`}>{grade.nota.toFixed(2)}</span>
                              {grade.notaEV1 !== undefined && (
                                <span className="text-[9px] text-slate-500 font-mono block">
                                  EV: {grade.notaEV1.toFixed(1)} / {grade.notaEV2?.toFixed(1)} / {grade.notaTrabajo?.toFixed(1)}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 block mt-0.5">{fmtDate(grade.creado)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="card bg-white p-12 border rounded-2xl text-center flex flex-col items-center">
              <Users className="w-12 h-12 text-slate-300 mb-2" />
              <h4 className="font-bold text-slate-650">No hay estudiantes seleccionados</h4>
              <p className="text-xs text-slate-400 mt-1">Registra alumnos en la sección de estudiantes para poblar este sub-panel</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );

  function linkSubject(asId: string, paId: string) {
    const s = subjects.find(item => item.id === asId);
    const p = parciales.find(item => item.id === paId);
    return {
      subName: s ? s.nombre : 'Syllabus desconctado',
      parcName: p ? p.nombre : 'Parcial desconectado',
    };
  }
}
