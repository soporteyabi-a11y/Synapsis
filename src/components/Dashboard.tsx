/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, CheckSquare, Users, Award, 
  HelpCircle, XCircle, TrendingUp, Sparkles, FileSpreadsheet,
  Compass, Leaf, Star
} from 'lucide-react';
import { User, Exam, Submission } from '../types';
import { avatarColor, avatarLetter, fmtDate } from '../lib/db';

interface DashboardProps {
  currentUser: User;
  users: User[];
  exams: Exam[];
  submissions: Submission[];
  onNavigate: (pageId: string) => void;
  onTakeExam?: (examId: string) => void;
  theme?: string;
}

const natureQuotes = [
  { quote: "Somos polvo de estrellas con la sagrada misión de contemplar y comprender el universo.", author: "Carl Sagan" },
  { quote: "Hay un libro sublime que está siempre abierto para todos los ojos: la gran naturaleza.", author: "Jean-Jacques Rousseau" },
  { quote: "El fluir del agua no tiene prisa; con paciencia infinita sabe bien que llegará al inmenso océano.", author: "Lao Tse" },
  { quote: "En cada suave caminata con la naturaleza silvestre uno recibe mucho más de lo que activamente busca.", author: "John Muir" },
  { quote: "La inteligencia de la galaxia palpita en el reverdecer de cada pequeña hoja de nuestro bosque.", author: "Conexión Vital" },
  { quote: "El universo no está fuera de ti. Mira muy adentro; todo aquello que buscas con anhelo, ya lo eres.", author: "Rumi" },
  { quote: "Estudia la naturaleza profunda, ámala con ternura, quédate cerca de ella. Jamás te decepcionará.", author: "Frank Lloyd Wright" },
  { quote: "Cada respuesta correcta en tu camino es una nueva semilla que florece con luz en tu bosque del intelecto.", author: "Synapsis" },
  { quote: "La noble calma de los árboles nos enseña que para tocar el cielo, debemos estar sanamente enraizados.", author: "Zen" },
  { quote: "Admira la constelación lejana y aprende su lección: iluminar la inmensa noche con humilde silencio activo.", author: "Sabiduría del Cosmos" }
];

export default function Dashboard({ currentUser, users, exams, submissions, onNavigate, onTakeExam, theme }: DashboardProps) {
  const rol = currentUser.rol;
  const allMyUserIds = users 
    ? users.filter(u => u.nombre === currentUser.nombre || u.email.toLowerCase() === currentUser.email.toLowerCase()).map(u => u.id)
    : [currentUser.id];
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * natureQuotes.length));
  const [subsPage, setSubsPage] = useState(1);
  const [examsPage, setExamsPage] = useState(1);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % natureQuotes.length);
  };

  // Define unified sorted lists
  let sortedSubs: Submission[] = [];
  let sortedExams: Exam[] = [];

  if (rol === 'admin') {
    sortedSubs = [...submissions].sort((a,b) => b.fecha.localeCompare(a.fecha));
    sortedExams = [...exams];
  } else if (rol === 'docente') {
    const docExams = exams.filter(e => e.docenteId && allMyUserIds.includes(e.docenteId));
    const examIds = docExams.map(e => e.id);
    const mySubsList = submissions.filter(s => examIds.includes(s.examenId));
    sortedSubs = [...mySubsList].sort((a,b) => b.fecha.localeCompare(a.fecha));
    sortedExams = docExams;
  } else {
    const studentSubs = submissions.filter(s => s.estudianteId === currentUser.id);
    sortedSubs = [...studentSubs].sort((a,b) => b.fecha.localeCompare(a.fecha));
    
    const availableExams = exams.filter(e => e.estado === 'activo');
    sortedExams = availableExams.filter(e => {
      if (e.intentos === 0) return true;
      const myCount = studentSubs.filter(s => s.examenId === e.id).length;
      return myCount < e.intentos;
    });
  }

  const totalSubsPages = Math.ceil(sortedSubs.length / 8) || 1;
  const currentSubsPage = Math.min(subsPage, totalSubsPages);
  const paginatedSubs = sortedSubs.slice((currentSubsPage - 1) * 8, currentSubsPage * 8);

  const totalExamsPages = Math.ceil(sortedExams.length / 4) || 1;
  const currentExamsPage = Math.min(examsPage, totalExamsPages);
  const paginatedExams = sortedExams.slice((currentExamsPage - 1) * 4, currentExamsPage * 4);

  // Let's compute stats and components depending on the role
  let stats: { label: string; value: number | string; icon: React.ReactNode; color: string; bg: string }[] = [];
  let mainCards: React.ReactNode = null;

  if (rol === 'admin') {
    const totalExams = exams.length;
    const activeExams = exams.filter(e => e.estado === 'activo').length;
    const totalTeachers = users.filter(u => u.rol === 'docente').length;
    const totalStudents = users.filter(u => u.rol === 'estudiante').length;

    stats = [
      { label: 'Exámenes totales', value: totalExams, icon: <BookOpen className="w-5 h-5" />, color: '#1a56db', bg: 'var(--primary-light)' },
      { label: 'Exámenes activos', value: activeExams, icon: <CheckSquare className="w-5 h-5" />, color: '#0f7b3e', bg: 'var(--success-bg)' },
      { label: 'Docentes', value: totalTeachers, icon: <Users className="w-5 h-5" />, color: '#b45309', bg: 'var(--warning-bg)' },
      { label: 'Estudiantes', value: totalStudents, icon: <Users className="w-5 h-5" />, color: '#7c3aed', bg: '#ede9fe' },
    ];

    const recentSubs = paginatedSubs;
    const recentExams = paginatedExams;

    mainCards = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entregas Recientes */}
        <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="card-header border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="card-title text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Entregas Recientes
              </h3>
              <button onClick={() => onNavigate('resultados')} className="text-xs font-semibold text-indigo-600 hover:underline">Ver todas</button>
            </div>
            {recentSubs.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Sin entregas recientes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface">
                      <th className="py-2 px-3">Estudiante</th>
                      <th className="py-2 px-3">Examen</th>
                      <th className="py-2 px-3">Nota</th>
                      <th className="py-2 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSubs.map((sub) => {
                      const student = users.find(u => u.id === sub.estudianteId);
                      const exam = exams.find(e => e.id === sub.examenId);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{student?.nombre || sub.estudianteNombre}</td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[150px] truncate">{exam?.titulo || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sub.aprobado ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                              {sub.puntaje}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-400">{fmtDate(sub.fecha)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {sortedSubs.length > 8 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                Pág. {currentSubsPage} de {totalSubsPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentSubsPage === 1}
                  onClick={() => setSubsPage(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <button
                  disabled={currentSubsPage === totalSubsPages}
                  onClick={() => setSubsPage(prev => Math.min(prev + 1, totalSubsPages))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exámenes Recientes */}
        <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="card-header border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="card-title text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Exámenes
              </h3>
              <button onClick={() => onNavigate('misExamenes')} className="text-xs font-semibold text-indigo-600 hover:underline">Gestionar</button>
            </div>
            {recentExams.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No hay exámenes registrados</div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{exam.titulo}</div>
                      <div className="text-xs text-slate-400">{exam.materia} · {exam.preguntas.length} preguntas</div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${exam.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : exam.estado === 'borrador' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {exam.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {sortedExams.length > 4 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                Pág. {currentExamsPage} de {totalExamsPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentExamsPage === 1}
                  onClick={() => setExamsPage(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <button
                  disabled={currentExamsPage === totalExamsPages}
                  onClick={() => setExamsPage(prev => Math.min(prev + 1, totalExamsPages))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else if (rol === 'docente') {
    const docExams = exams.filter(e => e.docenteId && allMyUserIds.includes(e.docenteId));
    const examIds = docExams.map(e => e.id);
    const mySubs = submissions.filter(s => examIds.includes(s.examenId));
    const passCount = mySubs.filter(s => s.aprobado).length;
    const failCount = mySubs.length - passCount;

    stats = [
      { label: 'Mis exámenes', value: docExams.length, icon: <BookOpen className="w-5 h-5" />, color: '#1a56db', bg: 'var(--primary-light)' },
      { label: 'Entregas recibidas', value: mySubs.length, icon: <CheckSquare className="w-5 h-5" />, color: '#0f7b3e', bg: 'var(--success-bg)' },
      { label: 'Aprobados', value: passCount, icon: <Award className="w-5 h-5" />, color: '#b45309', bg: 'var(--warning-bg)' },
      { label: 'Reprobados', value: failCount, icon: <XCircle className="w-5 h-5" />, color: '#c0392b', bg: 'var(--danger-bg)' },
    ];

    const myRecentSubs = paginatedSubs;

    mainCards = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Entregas */}
        <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="card-header border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="card-title text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Últimas Entregas
              </h3>
              <button onClick={() => onNavigate('resultados')} className="text-xs font-semibold text-indigo-600 hover:underline">Ver todas</button>
            </div>
            {myRecentSubs.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Sin entregas en tus exámenes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface">
                      <th className="py-2 px-3">Estudiante</th>
                      <th className="py-2 px-3">Examen</th>
                      <th className="py-2 px-3">Nota</th>
                      <th className="py-2 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myRecentSubs.map((sub) => {
                      const student = users.find(u => u.id === sub.estudianteId);
                      const exam = exams.find(e => e.id === sub.examenId);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{student?.nombre || sub.estudianteNombre}</td>
                          <td className="py-2.5 px-3 text-slate-500">{exam?.titulo || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sub.aprobado ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                              {sub.puntaje}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-400">{fmtDate(sub.fecha)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {sortedSubs.length > 8 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                Pág. {currentSubsPage} de {totalSubsPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentSubsPage === 1}
                  onClick={() => setSubsPage(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <button
                  disabled={currentSubsPage === totalSubsPages}
                  onClick={() => setSubsPage(prev => Math.min(prev + 1, totalSubsPages))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mis Exámenes */}
        <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="card-header border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="card-title text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Mis exámenes creados
              </h3>
              <button onClick={() => onNavigate('misExamenes')} className="text-xs font-semibold text-indigo-600 hover:underline">Ir a Exámenes</button>
            </div>
            {paginatedExams.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Aún no has creado ningún examen</div>
            ) : (
              <div className="flex flex-col gap-3">
                {paginatedExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{exam.titulo}</div>
                      <div className="text-xs text-slate-400">{exam.materia} · {exam.preguntas.length} preguntas</div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${exam.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : exam.estado === 'borrador' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {exam.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {sortedExams.length > 4 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                Pág. {currentExamsPage} de {totalExamsPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentExamsPage === 1}
                  onClick={() => setExamsPage(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <button
                  disabled={currentExamsPage === totalExamsPages}
                  onClick={() => setExamsPage(prev => Math.min(prev + 1, totalExamsPages))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // Estudiante
    const mySubs = submissions.filter(s => s.estudianteId === currentUser.id);
    const passCount = mySubs.filter(s => s.aprobado).length;
    const failCount = mySubs.length - passCount;
    const availableExams = exams.filter(e => e.estado === 'activo');

    // Filter available exams to see which ones are actually takable
    const studentTakableExams = availableExams.filter(e => {
      if (e.intentos === 0) return true;
      const myCount = mySubs.filter(s => s.examenId === e.id).length;
      return myCount < e.intentos;
    });

    stats = [
      { label: 'Disp. para presentar', value: studentTakableExams.length, icon: <BookOpen className="w-5 h-5" />, color: '#1a56db', bg: 'var(--primary-light)' },
      { label: 'Presentados', value: mySubs.length, icon: <CheckSquare className="w-5 h-5" />, color: '#0f7b3e', bg: 'var(--success-bg)' },
      { label: 'Aprobados', value: passCount, icon: <Award className="w-5 h-5" />, color: '#b45309', bg: 'var(--warning-bg)' },
      { label: 'Reprobados', value: failCount, icon: <XCircle className="w-5 h-5" />, color: '#c0392b', bg: 'var(--danger-bg)' },
    ];

    const myRecentSubs = paginatedSubs;

    mainCards = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis últimas calificaciones */}
        <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="card-header border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="card-title text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-600" />
                Mis últimas calificaciones
              </h3>
              <button onClick={() => onNavigate('miHistorial')} className="text-xs font-semibold text-indigo-600 hover:underline">Ver historial completo</button>
            </div>
            {myRecentSubs.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Aún no has presentado ningún examen</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface">
                      <th className="py-2 px-3">Examen</th>
                      <th className="py-2 px-3">Nota</th>
                      <th className="py-2 px-3">Estado</th>
                      <th className="py-2 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myRecentSubs.map((sub) => {
                      const exam = exams.find(e => e.id === sub.examenId);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[170px]">{exam?.titulo || '—'}</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-700">{sub.puntaje}%</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sub.aprobado ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                              {sub.aprobado ? 'Aprobado' : 'Reprobado'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-400">{fmtDate(sub.fecha)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {sortedSubs.length > 8 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                Pág. {currentSubsPage} de {totalSubsPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentSubsPage === 1}
                  onClick={() => setSubsPage(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <button
                  disabled={currentSubsPage === totalSubsPages}
                  onClick={() => setSubsPage(prev => Math.min(prev + 1, totalSubsPages))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exámenes Disponibles */}
        <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="card-header border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="card-title text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                Exámenes Disponibles
              </h3>
              <button onClick={() => onNavigate('misExamenesTake')} className="text-xs font-semibold text-indigo-600 hover:underline">Ver todos</button>
            </div>
            {paginatedExams.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No hay nuevos exámenes para presentar</div>
            ) : (
              <div className="flex flex-col gap-3">
                {paginatedExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-150 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{exam.titulo}</div>
                      <div className="text-xs text-slate-400">{exam.materia} · {exam.tiempo ? `${exam.tiempo} Minutos` : 'Sin límite'}</div>
                    </div>
                    {onTakeExam && (
                      <button 
                        onClick={() => onTakeExam(exam.id)}
                        className="btn btn-primary px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                      >
                        Presentar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {sortedExams.length > 4 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                Pág. {currentExamsPage} de {totalExamsPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentExamsPage === 1}
                  onClick={() => setExamsPage(prev => Math.max(prev - 1, 1))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <button
                  disabled={currentExamsPage === totalExamsPages}
                  onClick={() => setExamsPage(prev => Math.min(prev + 1, totalExamsPages))}
                  className="px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCosmosTheme = theme === 'theme-cyber';

  return (
    <div className="page-dashboard animate-fade-in">
      <div className="page-header mb-6">
        <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
          Hola, {currentUser.nombre.split(' ')[0]} 👋
        </h2>
        <div className="page-sub text-sm font-medium mt-1 text-slate-500">
          {rol === 'admin' ? 'Panel de administración institucional' : rol === 'docente' ? 'Panel docente de evaluaciones' : 'Panel académico del estudiante'}
        </div>
      </div>

      {/* Portal Bio-Cósmico de la Sabiduría (Exclusivo Tema Cosmos) */}
      {isCosmosTheme && (
        <div className="cosmos-portal-card mb-6 p-6 rounded-3xl border relative overflow-hidden bg-slate-900/40 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] select-none animate-fade-in">
          {/* Animated background glows */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-36 h-36 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Leaf className="w-4 h-4 animate-pulse text-emerald-400" />
                </span>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest font-mono flex items-center gap-1">
                  Sintonía de la Naturaleza & El Cosmos
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-sans tracking-tight">
                Círculos de Aprendizaje Infinito
              </h3>
              <p className="text-sm italic text-slate-200 leading-relaxed max-w-2xl">
                "{natureQuotes[quoteIndex].quote}"
              </p>
              <div className="text-[10px] text-cyan-400/80 font-semibold mt-1 font-mono tracking-wider">
                — {natureQuotes[quoteIndex].author}
              </div>
            </div>
            
            <button
              onClick={handleNextQuote}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 hover:from-cyan-500/50 hover:to-emerald-500/50 border border-cyan-500/30 text-white rounded-2xl text-xs font-bold tracking-wide shadow-md hover:shadow-cyan-500/20 transition-all duration-300 flex items-center gap-2 cursor-pointer whitespace-nowrap self-stretch md:self-auto justify-center"
            >
              <Star className="w-3.5 h-3.5 text-yellow-350 animate-bounce" />
              <span>Sintonizar Sabiduría</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col theme-bg-surface theme-border">
            <div 
              className="stat-icon p-2 w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-indigo-600"
              style={{ backgroundColor: stat.bg, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="stat-num text-2xl font-bold leading-none text-slate-800" style={{ color: 'var(--gray-900)' }}>
              {stat.value}
            </div>
            <div className="stat-label text-xs font-semibold text-slate-400 mt-2">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main cards */}
      {mainCards}
    </div>
  );
}
