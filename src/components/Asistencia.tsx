/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertCircle, XCircle, Clock, Calendar, BookOpen, 
  Users, Save, Filter, History, Award, CheckSquare, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { User, Subject, Semester } from '../types';
import { uid, now, fmtDate } from '../lib/db';
import { SearchableSelect } from './SearchableSelect';

interface AttendanceRecord {
  studentId: string;
  status: 'presente' | 'tarde' | 'excusa' | 'ausente';
  remarks?: string;
}

interface AttendanceSession {
  id: string;
  subjectId: string;
  semesterId: string;
  date: string;
  records: AttendanceRecord[];
  createdBy: string;
  createdByName: string;
  creado: string;
}

interface AsistenciaProps {
  currentUser: User;
  users: User[];
  subjects: Subject[];
  semesters: Semester[];
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Asistencia({ currentUser, users, subjects, semesters, toast }: AsistenciaProps) {
  const isDocOrAdmin = currentUser.rol === 'admin' || currentUser.rol === 'docente';
  const allMyUserIds = users 
    ? users.filter(u => u.nombre === currentUser.nombre || u.email.toLowerCase() === currentUser.email.toLowerCase()).map(u => u.id)
    : [currentUser.id];
  const students = users.filter(u => u.rol === 'estudiante');

  // State
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [activeRecords, setActiveRecords] = useState<Record<string, { status: 'presente' | 'tarde' | 'excusa' | 'ausente', remarks: string }>>({});
  const [viewMode, setViewMode] = useState<'take' | 'history'>('take');
  
  // History filtration
  const [historySubjectFilter, setHistorySubjectFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');

  // Pagination states
  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 12;

  // Reset student page on session configuration changes
  useEffect(() => {
    setStudentPage(1);
  }, [selectedSubject, selectedSemester, selectedDate]);

  // Initialize data (including seeds if empty)
  useEffect(() => {
    const saved = localStorage.getItem('ep_attendance');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading attendance', e);
      }
    } else {
      // Seed data
      const activeSem = semesters.find(s => s.estado === 'activo') || semesters[0];
      const activeSub = subjects[0];
      if (activeSem && activeSub && students.length >= 2) {
        const seedSessions: AttendanceSession[] = [
          {
            id: uid(),
            subjectId: activeSub.id,
            semesterId: activeSem.id,
            date: new Date(Date.now() - 86400000 * 2).toISOString().substring(0, 10), // 2 days ago
            records: [
              { studentId: students[0].id, status: 'presente' as const, remarks: 'Llegó puntual' },
              { studentId: students[1].id, status: 'tarde' as const, remarks: 'Retraso de 10 min por transporte' },
              ...(students[2] ? [{ studentId: students[2].id, status: 'presente' as const, remarks: '' }] : []),
            ],
            createdBy: currentUser.id,
            createdByName: currentUser.nombre,
            creado: now(),
          },
          {
            id: uid(),
            subjectId: activeSub.id,
            semesterId: activeSem.id,
            date: new Date(Date.now() - 86400000).toISOString().substring(0, 10), // yesterday
            records: [
              { studentId: students[0].id, status: 'presente' as const, remarks: '' },
              { studentId: students[1].id, status: 'ausente' as const, remarks: 'No reportó motivo' },
              ...(students[2] ? [{ studentId: students[2].id, status: 'excusa' as const, remarks: 'Cita de ortodoncia' }] : []),
            ],
            createdBy: currentUser.id,
            createdByName: currentUser.nombre,
            creado: now(),
          }
        ];
        setSessions(seedSessions);
        localStorage.setItem('ep_attendance', JSON.stringify(seedSessions));
      }
    }
  }, [subjects, semesters, users]);

  // Set initial filters
  useEffect(() => {
    const activeSem = semesters.find(s => s.estado === 'activo') || semesters[0];
    if (activeSem) setSelectedSemester(activeSem.id);

    // If teacher, only map over subjects they teach
    const teacherSubjects = currentUser.rol === 'docente' 
      ? subjects.filter(s => s.docenteId && allMyUserIds.includes(s.docenteId)) 
      : subjects;

    if (teacherSubjects.length > 0) {
      setSelectedSubject(teacherSubjects[0].id);
    }
  }, [subjects, semesters, currentUser]);

  // Sync / refresh active records when date, subject, or session list changes
  useEffect(() => {
    if (!selectedSubject || !selectedSemester) return;

    const existingSession = sessions.find(
      s => s.subjectId === selectedSubject && 
           s.semesterId === selectedSemester && 
           s.date === selectedDate
    );

    const newRecords: Record<string, { status: 'presente' | 'tarde' | 'excusa' | 'ausente', remarks: string }> = {};

    students.forEach(st => {
      const record = existingSession?.records.find(r => r.studentId === st.id);
      newRecords[st.id] = {
        status: record ? record.status : 'presente',
        remarks: record ? (record.remarks || '') : '',
      };
    });

    setActiveRecords(newRecords);
  }, [selectedSubject, selectedSemester, selectedDate, sessions]);

  const handleStatusChange = (studentId: string, status: 'presente' | 'tarde' | 'excusa' | 'ausente') => {
    setActiveRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      }
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setActiveRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      }
    }));
  };

  const setAllStatus = (status: 'presente' | 'tarde' | 'excusa' | 'ausente') => {
    const newRecords = { ...activeRecords };
    students.forEach(st => {
      newRecords[st.id] = {
        ...newRecords[st.id],
        status,
      };
    });
    setActiveRecords(newRecords);
    toast(`Todos los estudiantes marcados como: ${status.toUpperCase()}`, 'success');
  };

  const saveAttendance = () => {
    if (!selectedSubject) {
      toast('Por favor, selecciona una asignatura', 'error');
      return;
    }
    if (!selectedSemester) {
      toast('Por favor, selecciona un semestre', 'error');
      return;
    }

    const compiledRecords: AttendanceRecord[] = Object.entries(activeRecords).map(([studentId, dataValue]) => {
      const data = dataValue as { status: 'presente' | 'tarde' | 'excusa' | 'ausente'; remarks: string };
      return {
        studentId,
        status: data.status,
        remarks: data.remarks.trim(),
      };
    });

    const nextSessions = [...sessions];
    const sessionIndex = nextSessions.findIndex(
      s => s.subjectId === selectedSubject && 
           s.semesterId === selectedSemester && 
           s.date === selectedDate
    );

    if (sessionIndex > -1) {
      nextSessions[sessionIndex] = {
        ...nextSessions[sessionIndex],
        records: compiledRecords,
        createdBy: currentUser.id,
        createdByName: currentUser.nombre,
        creado: now(),
      };
    } else {
      nextSessions.push({
        id: uid(),
        subjectId: selectedSubject,
        semesterId: selectedSemester,
        date: selectedDate,
        records: compiledRecords,
        createdBy: currentUser.id,
        createdByName: currentUser.nombre,
        creado: now(),
      });
    }

    setSessions(nextSessions);
    localStorage.setItem('ep_attendance', JSON.stringify(nextSessions));
    toast('Control de asistencia guardado con éxito', 'success');
  };

  // Student metrics calculation
  const getStudentMetrics = (studentId: string) => {
    const studentHistory = sessions.filter(s => s.records.some(r => r.studentId === studentId));
    const total = studentHistory.length;
    if (total === 0) return { present: 0, late: 0, excused: 0, absent: 0, rate: 100 };

    let present = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;

    studentHistory.forEach(s => {
      const rec = s.records.find(r => r.studentId === studentId);
      if (rec?.status === 'presente') present++;
      else if (rec?.status === 'tarde') late++;
      else if (rec?.status === 'excusa') excused++;
      else if (rec?.status === 'ausente') absent++;
    });

    // Attendance Rate calculation: (present + excused + late * 0.7) / total
    const rate = Math.round(((present + excused + (late * 0.7)) / total) * 100);

    return { present, late, excused, absent, rate, total };
  };

  // Filtration for history
  const filteredHistory = sessions.filter(s => {
    const matchSub = historySubjectFilter === 'all' || s.subjectId === historySubjectFilter;
    const matchDate = !historyDateFilter || s.date === historyDateFilter;
    return matchSub && matchDate;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const currentHistorySessions = filteredHistory.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  // Quick stats computed
  const teacherSubjects = currentUser.rol === 'docente' 
    ? subjects.filter(s => s.docenteId && allMyUserIds.includes(s.docenteId)) 
    : subjects;

  const currentSubjectObj = subjects.find(s => s.id === selectedSubject);

  // Student list pagination for "take" mode (Control de Asistencia Diaria)
  const totalStudentPages = Math.ceil(students.length / studentsPerPage) || 1;
  const currentStudentPage = studentPage > totalStudentPages ? totalStudentPages : studentPage;
  const currentStudentsForTake = students.slice(
    (currentStudentPage - 1) * studentsPerPage,
    currentStudentPage * studentsPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm theme-bg-surface theme-border">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <CheckSquare className="w-3.5 h-3.5" /> Asistencia de Alumnos
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ color: 'var(--gray-900)' }}>
            {isDocOrAdmin ? 'Control de Asistencia Diaria' : 'Mi Reporte de Asistencia'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isDocOrAdmin 
              ? 'Registra las novedades de asistencias, retrasos e inasistencias justificadas.'
              : 'Verifica tu registro histórico, novedades registradas y tu porcentaje de presencialidad académica.'}
          </p>
        </div>

        {isDocOrAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { setViewMode('take'); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'take'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <CheckSquare className="w-4 h-4" /> Registrar Hoy
            </button>
            <button
              onClick={() => { setViewMode('history'); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'history'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <History className="w-4 h-4" /> Historial General
            </button>
          </div>
        )}
      </div>

      {/* PORTAL VISTA ESTUDIANTE */}
      {!isDocOrAdmin && (
        <div className="space-y-6">
          {/* Dashboard Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(() => {
              const metrics = getStudentMetrics(currentUser.id);
              return (
                <>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center theme-bg-surface">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nivel de Asistencia</div>
                    <div className="text-2xl font-black text-indigo-600 mt-2 font-mono">{metrics.rate}%</div>
                    <div className="text-[10px] text-slate-400 mt-1">Min. sugerido: 80%</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center theme-bg-surface">
                    <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Presenciales</div>
                    <div className="text-2xl font-black text-slate-800 mt-2 font-mono" style={{ color: 'var(--gray-900)' }}>{metrics.present}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Clases tempranas</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center theme-bg-surface">
                    <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">Retrasos (Tarde)</div>
                    <div className="text-2xl font-black text-slate-800 mt-2 font-mono" style={{ color: 'var(--gray-900)' }}>{metrics.late}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Ingresos tardíos</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center theme-bg-surface">
                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Excusado</div>
                    <div className="text-2xl font-black text-slate-800 mt-2 font-mono" style={{ color: 'var(--gray-900)' }}>{metrics.excused}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Con soporte médico</div>
                  </div>
                  <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 text-center theme-bg-surface">
                    <div className="text-xs font-bold text-rose-500 uppercase tracking-widest">Fallas (Ausente)</div>
                    <div className="text-2xl font-black text-slate-800 mt-2 font-mono" style={{ color: 'var(--gray-900)' }}>{metrics.absent}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Fallas sin soporte</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Student Class List */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm theme-bg-surface theme-border">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-850" style={{ color: 'var(--gray-900)' }}>Mi Historial Detallado de Clases</h3>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">Total Evaluados: {sessions.length} clases</span>
            </div>
            
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-450 text-xs py-12">
                Aún no hay sesiones o llamados de asistencia cargados en el sistema por tus docentes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-100">
                      <th className="py-3 px-5">Fecha</th>
                      <th className="py-3 px-5">Asignatura</th>
                      <th className="py-3 px-5">Registrado por</th>
                      <th className="py-3 px-5">Estado</th>
                      <th className="py-3 px-5">Comentario / Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {sessions.map(s => {
                      const subj = subjects.find(sub => sub.id === s.subjectId);
                      const myRecord = s.records.find(r => r.studentId === currentUser.id);
                      if (!myRecord) return null;

                      let statusBadge = '';
                      if (myRecord.status === 'presente') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                      else if (myRecord.status === 'tarde') statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                      else if (myRecord.status === 'excusa') statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                      else if (myRecord.status === 'ausente') statusBadge = 'bg-rose-50 text-rose-700 border-rose-100';

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-5 font-mono font-bold text-slate-600">
                            {fmtDate(s.date)}
                          </td>
                          <td className="py-3.5 px-5 text-slate-800 font-extrabold" style={{ color: 'var(--gray-900)' }}>
                            {subj?.nombre || 'General'}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500">
                            {s.createdByName}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase ${statusBadge}`}>
                              {myRecord.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 italic text-slate-450 font-normal">
                            {myRecord.remarks || <span className="text-slate-300">Ninguna observación</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PORTAL VISTA DE DOCENTE Y ADMINISTRADOR */}
      {isDocOrAdmin && viewMode === 'take' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls bar */}
          <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-sm theme-bg-surface theme-border">
            <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm" style={{ color: 'var(--gray-900)' }}>
              1. Configurar Sesión
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Semestre Lectivo <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={semesters.map(s => ({ value: s.id, label: `${s.nombre} (${s.estado})` }))}
                  value={selectedSemester}
                  onChange={val => setSelectedSemester(val)}
                  placeholder="Selecciona semestre..."
                  id="semester-select"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Asignatura Académica <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={teacherSubjects.map(s => ({ value: s.id, label: `${s.nombre} ${s.codigo ? `[${s.codigo}]` : ''}` }))}
                  value={selectedSubject}
                  onChange={val => setSelectedSubject(val)}
                  placeholder="Selecciona materia..."
                  id="subject-select"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha de Clase <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-white text-slate-700 font-semibold focus:outline-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acciones Rápidas</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAllStatus('presente')}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition border border-emerald-200 text-center cursor-pointer"
                >
                  Todos Presentes
                </button>
                <button
                  type="button"
                  onClick={() => setAllStatus('ausente')}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition border border-rose-200 text-center cursor-pointer"
                >
                  Todos Ausentes
                </button>
              </div>
            </div>

            <button
              onClick={saveAttendance}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> Guardar Control Diario
            </button>
          </div>

          {/* Form List Students */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm theme-bg-surface theme-border">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 theme-bg-surface">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-extrabold text-slate-700">
                  Estudiantes Matriculados en Sistema ({students.length})
                </span>
              </div>
              {currentSubjectObj && (
                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                  {currentSubjectObj.nombre}
                </span>
              )}
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs py-16">
                No hay estudiantes registrados en el sistema para realizar el llamado.
              </div>
            ) : (
              <div>
                <div className="divide-y divide-slate-100">
                  {currentStudentsForTake.map(st => {
                    const record = activeRecords[st.id] || { status: 'presente', remarks: '' };
                    const met = getStudentMetrics(st.id);

                    return (
                      <div key={st.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition">
                        {/* Name & ID */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner" style={{ backgroundColor: '#6366f1' }}>
                            {st.nombre.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-800" style={{ color: 'var(--gray-900)' }}>{st.nombre}</div>
                            <div className="text-[10px] text-slate-400 font-mono">CC: {st.cedula || '---'} | Asistencia: <span className="font-bold text-indigo-600">{met.rate}%</span></div>
                          </div>
                        </div>

                        {/* Status selectors & remarks */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          {/* Selector items */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'presente')}
                              className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                record.status === 'presente'
                                  ? 'bg-white text-emerald-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" /> P
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'tarde')}
                              className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                record.status === 'tarde'
                                  ? 'bg-white text-amber-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> T
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'excusa')}
                              className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                record.status === 'excusa'
                                  ? 'bg-white text-indigo-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3" /> E
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'ausente')}
                              className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                record.status === 'ausente'
                                  ? 'bg-white text-rose-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <XCircle className="w-3 h-3" /> A
                            </button>
                          </div>

                          {/* Optional statement comment */}
                          <input
                            type="text"
                            value={record.remarks}
                            onChange={e => handleRemarksChange(st.id, e.target.value)}
                            placeholder="Nota u observación..."
                            className="text-xs p-1.5 border border-slate-200 rounded-lg max-w-xs focus:outline-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION FOR STUDENTS */}
                {students.length > studentsPerPage && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                    <div className="text-xs text-slate-500 select-none">
                      Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((currentStudentPage - 1) * studentsPerPage) + 1}</span> a{' '}
                      <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                        {Math.min(currentStudentPage * studentsPerPage, students.length)}
                      </span>{' '}
                      de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{students.length}</span> alumnos matriculados
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                      <button
                        type="button"
                        disabled={currentStudentPage === 1}
                        onClick={() => setStudentPage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {Array.from({ length: totalStudentPages }, (_, i) => i + 1).map(page => (
                        <button
                          type="button"
                          key={page}
                          onClick={() => setStudentPage(page)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            currentStudentPage === page
                              ? 'text-white'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                          style={currentStudentPage === page ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={currentStudentPage === totalStudentPages}
                        onClick={() => setStudentPage(prev => Math.min(totalStudentPages, prev + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PORTAL VISTA DE HISTORIAL GENERAL */}
      {isDocOrAdmin && viewMode === 'history' && (
        <div className="space-y-6">
          {/* Filters shelf */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs theme-bg-surface theme-border">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filtrar Historial:</span>
            </div>

            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-slate-400 font-medium">Asignatura:</span>
              <div className="w-48">
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Todas' },
                    ...teacherSubjects.map(s => ({ value: s.id, label: s.nombre }))
                  ]}
                  value={historySubjectFilter}
                  onChange={val => { setHistorySubjectFilter(val); setCurrentPage(1); }}
                  placeholder="Filtrar asignatura..."
                  id="history-subject-select"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Fecha exacta:</span>
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => { setHistoryDateFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold focus:outline-none text-[11px]"
              />
              {historyDateFilter && (
                <button 
                  onClick={() => { setHistoryDateFilter(''); setCurrentPage(1); }}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                >
                  Limpiar fecha
                </button>
              )}
            </div>
          </div>

          {/* List/Table of history sessions */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm theme-bg-surface theme-border">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-450 text-xs">
                No se encontraron registros de llamado de asistencia con los filtros seleccionados.
              </div>
            ) : (
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-slate-200 theme-bg-surface">
                      <th className="py-3.5 px-5">Fecha de Sesión</th>
                      <th className="py-3.5 px-5">Asignatura</th>
                      <th className="py-3.5 px-5">Asistencia Promedio</th>
                      <th className="py-3.5 px-5">Registró</th>
                      <th className="py-3.5 px-5 text-right">Métricas Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {currentHistorySessions.map(s => {
                      const subj = subjects.find(sub => sub.id === s.subjectId);
                      
                      // Calculate average presence
                      const presents = s.records.filter(r => r.status === 'presente' || r.status === 'tarde').length;
                      const average = s.records.length > 0 ? Math.round((presents / s.records.length) * 100) : 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-5 font-mono font-extrabold text-indigo-755">
                            {fmtDate(s.date)}
                          </td>
                          <td className="py-3.5 px-5 text-slate-800 font-extrabold" style={{ color: 'var(--gray-900)' }}>
                            {subj?.nombre || 'General'}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: average >= 80 ? '#10b981' : '#f59e0b' }}></div>
                              <span>{average}% presentismo</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-500">
                            {s.createdByName || 'Docente'}
                          </td>
                          <td className="py-3.5 px-5 text-right text-[11px] text-slate-450 space-x-1.5 font-normal">
                            <span className="font-extrabold text-emerald-600">{s.records.filter(r => r.status === 'presente').length} presentes</span>
                            <span>•</span>
                            <span className="font-extrabold text-amber-600">{s.records.filter(r => r.status === 'tarde').length} tardíos</span>
                            <span>•</span>
                            <span className="font-extrabold text-rose-500">{s.records.filter(r => r.status === 'ausente').length} ausentes</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* PAGINATION */}
                {filteredHistory.length > itemsPerPage && (
                  <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                    <div className="text-xs text-slate-500 select-none">
                      Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
                      <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                        {Math.min(activePage * itemsPerPage, filteredHistory.length)}
                      </span>{' '}
                      de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredHistory.length}</span> sesiones registradas
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                      <button
                        disabled={activePage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            activePage === page
                              ? 'text-white'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                          style={activePage === page ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        disabled={activePage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
